import { CartItem, Sale, SaleItem, PaymentMethod, PaymentBreakdown, CustomerLedgerEntry } from '../types';
import { StorageService } from './storageService';
import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface CartTotals {
  subtotal: number;
  itemDiscountTotal: number;
  billDiscountPercent: number;
  billDiscountAmount: number;
  totalDiscount: number;
  grandTotal: number;
  totalPurchaseCost: number;
  totalProfit: number;
}

export class BillingService {
  private static async nextGlobalBillNumber(prefix: string, startingNumber: number): Promise<string> {
    const counterRef = doc(db, 'billingCounters', 'global');
    const next = await runTransaction(db, async (transaction) => {
      const current = await transaction.get(counterRef);
      const stored = current.exists() ? Number(current.data().nextNumber || startingNumber) : startingNumber;
      const number = stored;
      transaction.set(counterRef, { nextNumber: number + 1, updatedAt: new Date().toISOString() }, { merge: true });
      return number;
    });
    return `${prefix || 'INV-'}${String(next).padStart(6, '0')}`;
  }
  /**
   * Recalculates a single cart item based on current quantity, rate, and discounts.
   */
  static calculateItem(
    item: CartItem,
    discountType: 'PERCENT' | 'FLAT' = 'PERCENT'
  ): CartItem {
    const qty = Math.max(1, item.quantity);
    const rate = Math.max(0, item.sellingRate);
    const baseTotal = qty * rate;

    let discountAmt = 0;
    let discountPct = item.discountPercent || 0;

    if (item.product.isDiscountable === false) {
      discountPct = 0;
    } else if (discountType === 'PERCENT') {
      discountPct = Math.min(100, Math.max(0, discountPct));
      discountAmt = Math.round(((baseTotal * discountPct) / 100) * 100) / 100;
    } else {
      discountAmt = Math.min(baseTotal, Math.max(0, item.discountAmount || 0));
      discountPct = baseTotal > 0 ? Math.round(((discountAmt / baseTotal) * 100) * 100) / 100 : 0;
    }

    const lineTotal = Math.max(0, baseTotal - discountAmt);
    const lineCost = (item.purchaseRate || 0) * qty;
    const lineProfit = lineTotal - lineCost;

    return {
      ...item,
      quantity: qty,
      sellingRate: rate,
      discountPercent: discountPct,
      discountAmount: discountAmt,
      lineTotal,
      lineProfit,
    };
  }

  /**
   * Calculates overall cart totals with item-level and bill-level discounts.
   * STRICTLY NO GST is calculated anywhere.
   */
  static calculateTotals(
    items: CartItem[],
    billDiscountPercent: number = 0,
    billDiscountFlat: number = 0,
    discountMode: 'PERCENT' | 'FLAT' = 'PERCENT'
  ): CartTotals {
    let subtotal = 0;
    let itemDiscountTotal = 0;
    let discountableSubtotal = 0;
    let totalPurchaseCost = 0;

    for (const item of items) {
      const itemBase = item.quantity * item.sellingRate;
      subtotal += itemBase;
      itemDiscountTotal += item.discountAmount;
      if (item.product.isDiscountable !== false) discountableSubtotal += itemBase - item.discountAmount;
      totalPurchaseCost += item.purchaseRate * item.quantity;
    }

    const afterItemDiscount = Math.max(0, discountableSubtotal);
    let billDiscountAmount = 0;
    let billDiscountPct = billDiscountPercent;

    if (discountMode === 'PERCENT') {
      billDiscountPct = Math.min(100, Math.max(0, billDiscountPercent));
      billDiscountAmount = Math.round(((afterItemDiscount * billDiscountPct) / 100) * 100) / 100;
    } else {
      billDiscountAmount = Math.min(afterItemDiscount, Math.max(0, billDiscountFlat));
      billDiscountPct = afterItemDiscount > 0 ? Math.round(((billDiscountAmount / afterItemDiscount) * 100) * 100) / 100 : 0;
    }

    const totalDiscount = itemDiscountTotal + billDiscountAmount;
    const grandTotal = Math.max(0, Math.round(subtotal - itemDiscountTotal - billDiscountAmount));
    const totalProfit = grandTotal - totalPurchaseCost;

    return {
      subtotal,
      itemDiscountTotal,
      billDiscountPercent: billDiscountPct,
      billDiscountAmount,
      totalDiscount,
      grandTotal,
      totalPurchaseCost,
      totalProfit,
    };
  }

  /**
   * Validates cart items and stock before completing a bill.
   */
  static validateCart(items: CartItem[], allowNegativeStock: boolean = false): { isValid: boolean; error?: string } {
    if (!items || items.length === 0) {
      return { isValid: false, error: 'Cart is empty. Please add fireworks to complete bill.' };
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        return { isValid: false, error: `Invalid quantity for ${item.product.name}. Quantity must be at least 1.` };
      }
      if (item.sellingRate < 0) {
        return { isValid: false, error: `Invalid rate for ${item.product.name}. Price cannot be negative.` };
      }

      if (!allowNegativeStock) {
        const liveProduct = StorageService.getProductById(item.productId);
        const availableStock = liveProduct ? liveProduct.currentStock : item.product.currentStock;
        if (item.quantity > availableStock) {
          return {
            isValid: false,
            error: `Insufficient stock for ${item.product.name}. Available: ${availableStock}, Requested: ${item.quantity}.`,
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Executes the complete sale transaction:
   * 1. Generates sequential invoice number
   * 2. Commits sale record
   * 3. Deducts inventory & creates stock movements
   * 4. Updates customer ledger and due balances if credit/due exists
   * 5. Logs audit action
   */
  static async completeSale(params: {
    items: CartItem[];
    customerId: string;
    customerName: string;
    customerMobile: string;
    customerWhatsapp?: string;
    paymentMethod: PaymentMethod;
    paymentBreakdown?: PaymentBreakdown;
    paidAmount: number;
    billDiscountPercent?: number;
    billDiscountAmount?: number;
    notes?: string;
  }): Promise<{ success: boolean; sale?: Sale; error?: string }> {
    const billingConfig = StorageService.getBillingConfig();
    const validation = this.validateCart(params.items, billingConfig.allowNegativeStock);

    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const totals = this.calculateTotals(
      params.items,
      params.billDiscountPercent || 0,
      params.billDiscountAmount || 0,
      (params.billDiscountPercent || 0) > 0 ? 'PERCENT' : 'FLAT'
    );

    const currentUser = StorageService.getCurrentUser();
    const authUid = auth.currentUser?.uid;
    if (!authUid) return { success: false, error: 'Firebase session expired. Please sign in again before creating a bill.' };
    const branchId = currentUser.branchId || 'MAIN';
    const billNumber = await this.nextGlobalBillNumber(billingConfig.billPrefix, billingConfig.startingNumber || 1);
    const saleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const dueAmount = Math.max(0, totals.grandTotal - params.paidAmount);

    let finalBreakdown: PaymentBreakdown = {
      cash: 0,
      upi: 0,
      card: 0,
      credit: dueAmount,
    };

    if (params.paymentMethod === 'MIXED' && params.paymentBreakdown) {
      finalBreakdown = {
        cash: params.paymentBreakdown.cash || 0,
        upi: params.paymentBreakdown.upi || 0,
        card: params.paymentBreakdown.card || 0,
        credit: dueAmount,
      };
    } else if (params.paymentMethod === 'CASH') {
      finalBreakdown.cash = params.paidAmount;
    } else if (params.paymentMethod === 'UPI') {
      finalBreakdown.upi = params.paidAmount;
    } else if (params.paymentMethod === 'CARD') {
      finalBreakdown.card = params.paidAmount;
    } else if (params.paymentMethod === 'CREDIT') {
      finalBreakdown.credit = totals.grandTotal;
    }

    const saleItems: SaleItem[] = params.items.map((i) => ({
      productId: i.productId,
      productName: i.product.name,
      barcode: i.product.barcode || '',
      unit: i.product.unit,
      quantity: i.quantity,
      sellingRate: i.sellingRate,
      mrp: i.mrp,
      purchaseRate: i.purchaseRate,
      discountPercent: i.discountPercent,
      discountAmount: i.discountAmount,
      lineTotal: i.lineTotal,
      lineCost: i.purchaseRate * i.quantity,
      lineProfit: i.lineProfit,
    }));

    const sale: Sale = {
      id: saleId,
      branchId,
      staffId: authUid,
      staffNameSnapshot: currentUser.fullName,
      billNumber,
      invoiceDate: nowIso,
      customerId: params.customerId,
      customerName: params.customerName,
      customerMobile: params.customerMobile,
      customerWhatsapp: params.customerWhatsapp || params.customerMobile,
      items: saleItems,
      subtotal: totals.subtotal,
      itemDiscountTotal: totals.itemDiscountTotal,
      billDiscountPercent: totals.billDiscountPercent,
      billDiscountAmount: totals.billDiscountAmount,
      totalDiscount: totals.totalDiscount,
      grandTotal: totals.grandTotal,
      totalPurchaseCost: totals.totalPurchaseCost,
      totalProfit: totals.totalProfit,
      paymentMethod: params.paymentMethod,
      paymentBreakdown: finalBreakdown,
      paidAmount: params.paidAmount,
      dueAmount,
      status: 'COMPLETED',
      cashierId: authUid,
      cashierName: currentUser.fullName,
      notes: params.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 1. Save Sale
    try {
      // Commit and verify the bill before showing success or clearing the cart.
      // Firestore rejects undefined fields (admin bills commonly have no branch
      // and optional notes/WhatsApp values). Strip only undefined properties;
      // keep the original sale object for the UI and receipt.
      const firestoreSale = JSON.parse(JSON.stringify(sale)) as Sale;
      await setDoc(doc(db, 'sales', sale.id), firestoreSale, { merge: true });
      const saved = await getDoc(doc(db, 'sales', sale.id));
      if (!saved.exists()) throw new Error('Firebase did not confirm the saved bill.');
      await StorageService.saveSale(sale, false);
    } catch (error: any) {
      return { success: false, error: `Bill could not be saved to Firebase: ${error?.message || 'permission or network error'}` };
    }

    // 2. Deduct Inventory & Record Stock Movements
    for (const item of params.items) {
      StorageService.updateProductStock(
        item.productId,
        -item.quantity,
        'SALE',
        billNumber,
        `Sold on Invoice ${billNumber}`,
        currentUser.fullName
      );
    }

    // 3. Customer Ledger for Credit / Due or Customer purchase history
    const customer = StorageService.getCustomerById(params.customerId);
    if (customer) {
      const prevDue = customer.currentDue || 0;
      const newDue = prevDue + dueAmount;

      customer.totalPurchased = (customer.totalPurchased || 0) + totals.grandTotal;
      customer.totalPaid = (customer.totalPaid || 0) + params.paidAmount;
      customer.currentDue = newDue;
      StorageService.saveCustomer(customer);

      if (dueAmount > 0 || params.paymentMethod === 'CREDIT') {
        const ledgerEntry: CustomerLedgerEntry = {
          id: `cld-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          customerId: customer.id,
          date: nowIso,
          type: 'SALE',
          referenceId: sale.id,
          referenceNo: billNumber,
          debit: totals.grandTotal,
          credit: params.paidAmount,
          balance: newDue,
          paymentMode: params.paymentMethod,
          notes: `Sale Bill ${billNumber} - Paid: ₹${params.paidAmount}, Due: ₹${dueAmount}`,
          createdAt: nowIso,
        };
        StorageService.addCustomerLedgerEntry(ledgerEntry);
      }
    }

    // 4. Audit Log
    StorageService.logAudit(
      'CREATE_BILL',
      `Completed bill ${billNumber} for ₹${totals.grandTotal} (${params.paymentMethod}) to ${params.customerName}`,
      billNumber
    );

    return { success: true, sale };
  }
}
