import {
  ShopProfile,
  Category,
  Brand,
  Unit,
  Product,
  Customer,
  Supplier,
  Sale,
  SalesReturn,
  Purchase,
  PurchaseReturn,
  CustomerLedgerEntry,
  SupplierLedgerEntry,
  StockMovement,
  DamageStock,
  Expense,
  DayClosing,
  AppUser,
  PrinterSettings,
  BillingConfig,
  WhatsAppConfig,
  AuditLog,
  HeldBill,
} from '../types';
import {
  INITIAL_SHOP_PROFILE,
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_UNITS,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_USERS,
  INITIAL_PRINTER_SETTINGS,
  INITIAL_BILLING_CONFIG,
  INITIAL_WHATSAPP_CONFIG,
} from '../data/initialData';

const KEYS = {
  SHOP_PROFILE: 'fw_shop_profile',
  CATEGORIES: 'fw_categories',
  BRANDS: 'fw_brands',
  UNITS: 'fw_units',
  PRODUCTS: 'fw_products',
  CUSTOMERS: 'fw_customers',
  SUPPLIERS: 'fw_suppliers',
  SALES: 'fw_sales',
  SALES_RETURNS: 'fw_sales_returns',
  PURCHASES: 'fw_purchases',
  PURCHASE_RETURNS: 'fw_purchase_returns',
  CUSTOMER_LEDGER: 'fw_customer_ledger',
  SUPPLIER_LEDGER: 'fw_supplier_ledger',
  STOCK_MOVEMENTS: 'fw_stock_movements',
  DAMAGE_STOCK: 'fw_damage_stock',
  EXPENSES: 'fw_expenses',
  DAY_CLOSINGS: 'fw_day_closings',
  USERS: 'fw_users',
  CURRENT_USER: 'fw_current_user',
  PRINTER_SETTINGS: 'fw_printer_settings',
  BILLING_CONFIG: 'fw_billing_config',
  WHATSAPP_CONFIG: 'fw_whatsapp_config',
  AUDIT_LOGS: 'fw_audit_logs',
  HELD_BILLS: 'fw_held_bills',
  LAST_BILL_SEQ: 'fw_last_bill_seq',
  SYNC_QUEUE: 'fw_sync_queue',
};

// Firestore is the only persistent source of truth. This in-memory mirror is
// deliberately cleared on every page load; it is populated from Firestore by
// FirestoreSync after authentication.
const memoryStore = new Map<string, unknown>();
if (typeof window !== 'undefined') {
  for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith('fw_')) window.localStorage.removeItem(key);
  }
}

function getItem<T>(key: string, defaultValue: T): T {
  return (memoryStore.has(key) ? memoryStore.get(key) : defaultValue) as T;
}

function setItem<T>(key: string, value: T): void {
  memoryStore.set(key, value);
}

export class StorageService {
  // Initialization
  static init(): void {
    if (!memoryStore.has(KEYS.PRODUCTS)) {
      this.resetToDefaults();
    }
  }

  static resetToDefaults(): void {
    setItem(KEYS.SHOP_PROFILE, INITIAL_SHOP_PROFILE);
    setItem(KEYS.CATEGORIES, INITIAL_CATEGORIES);
    setItem(KEYS.BRANDS, INITIAL_BRANDS);
    setItem(KEYS.UNITS, INITIAL_UNITS);
    setItem(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    setItem(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    setItem(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    setItem(KEYS.USERS, INITIAL_USERS);
    setItem(KEYS.CURRENT_USER, INITIAL_USERS[0]);
    setItem(KEYS.PRINTER_SETTINGS, INITIAL_PRINTER_SETTINGS);
    setItem(KEYS.BILLING_CONFIG, INITIAL_BILLING_CONFIG);
    setItem(KEYS.WHATSAPP_CONFIG, INITIAL_WHATSAPP_CONFIG);
    setItem(KEYS.SALES, []);
    setItem(KEYS.SALES_RETURNS, []);
    setItem(KEYS.PURCHASES, []);
    setItem(KEYS.PURCHASE_RETURNS, []);
    setItem(KEYS.CUSTOMER_LEDGER, []);
    setItem(KEYS.SUPPLIER_LEDGER, []);
    setItem(KEYS.STOCK_MOVEMENTS, []);
    setItem(KEYS.DAMAGE_STOCK, []);
    setItem(KEYS.EXPENSES, []);
    setItem(KEYS.DAY_CLOSINGS, []);
    setItem(KEYS.AUDIT_LOGS, []);
    setItem(KEYS.HELD_BILLS, []);
    setItem(KEYS.LAST_BILL_SEQ, 100);
  }

  // Shop Profile
  static getShopProfile(): ShopProfile {
    return getItem<ShopProfile>(KEYS.SHOP_PROFILE, INITIAL_SHOP_PROFILE);
  }

  static updateShopProfile(profile: ShopProfile): void {
    setItem(KEYS.SHOP_PROFILE, profile);
  }

  // Categories
  static getCategories(): Category[] {
    return getItem<Category[]>(KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }

  static saveCategory(category: Category): void {
    const list = this.getCategories();
    const idx = list.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      list[idx] = category;
    } else {
      list.push(category);
    }
    setItem(KEYS.CATEGORIES, list);
  }

  static deleteCategory(id: string): void {
    const list = this.getCategories().filter((c) => c.id !== id);
    setItem(KEYS.CATEGORIES, list);
  }

  // Brands
  static getBrands(): Brand[] {
    return getItem<Brand[]>(KEYS.BRANDS, INITIAL_BRANDS);
  }

  static saveBrand(brand: Brand): void {
    const list = this.getBrands();
    const idx = list.findIndex((b) => b.id === brand.id);
    if (idx >= 0) {
      list[idx] = brand;
    } else {
      list.push(brand);
    }
    setItem(KEYS.BRANDS, list);
  }

  static deleteBrand(id: string): void {
    const list = this.getBrands().filter((b) => b.id !== id);
    setItem(KEYS.BRANDS, list);
  }

  // Units
  static getUnits(): Unit[] {
    return getItem<Unit[]>(KEYS.UNITS, INITIAL_UNITS);
  }

  static saveUnit(unit: Unit): void {
    const list = this.getUnits();
    const idx = list.findIndex((u) => u.id === unit.id);
    if (idx >= 0) {
      list[idx] = unit;
    } else {
      list.push(unit);
    }
    setItem(KEYS.UNITS, list);
  }

  // Products
  static getProducts(): Product[] {
    return getItem<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  static setDirectProducts(products: Product[]): void {
    setItem(KEYS.PRODUCTS, products);
  }

  static setDirectCustomers(customers: Customer[]): void {
    setItem(KEYS.CUSTOMERS, customers);
  }

  static setDirectCategories(categories: Category[]): void {
    setItem(KEYS.CATEGORIES, categories);
  }

  static setDirectBrands(brands: Brand[]): void { setItem(KEYS.BRANDS, brands); }
  static setDirectUnits(units: Unit[]): void { setItem(KEYS.UNITS, units); }

  static setDirectSales(sales: Sale[]): void {
    setItem(KEYS.SALES, sales);
  }

  static setDirectPurchases(purchases: Purchase[]): void {
    setItem(KEYS.PURCHASES, purchases);
  }

  static setDirectSuppliers(suppliers: Supplier[]): void {
    setItem(KEYS.SUPPLIERS, suppliers);
  }

  static setDirectExpenses(expenses: Expense[]): void { setItem(KEYS.EXPENSES, expenses); }
  static setDirectDayClosings(dayClosings: DayClosing[]): void { setItem(KEYS.DAY_CLOSINGS, dayClosings); }

  static getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  static getProductByBarcode(barcode: string): Product | undefined {
    const clean = barcode.trim();
    if (!clean) return undefined;
    return this.getProducts().find(
      (p) => p.barcode?.trim() === clean || p.shortName?.toLowerCase() === clean.toLowerCase()
    );
  }

  static saveProduct(product: Product): void {
    const list = this.getProducts();
    const idx = list.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      list[idx] = product;
    } else {
      list.unshift(product);
    }
    setItem(KEYS.PRODUCTS, list);
    // Background cloud sync
    try {
      import('./firestoreSyncService').then(({ FirestoreSync }) => {
        FirestoreSync.syncProduct(product);
      });
    } catch {}
  }

  static deleteProduct(id: string): void {
    const list = this.getProducts().filter((p) => p.id !== id);
    setItem(KEYS.PRODUCTS, list);
    try {
      import('./firestoreSyncService').then(({ FirestoreSync }) => {
        FirestoreSync.deleteProduct(id);
      });
    } catch {}
  }

  static updateProductStock(
    productId: string,
    quantityDelta: number,
    type: StockMovement['type'],
    referenceNo?: string,
    reason?: string,
    userFullName: string = 'System'
  ): { success: boolean } {
    const products = this.getProducts();
    const prod = products.find((p) => p.id === productId);
    if (!prod) return { success: false };

    const prevStock = prod.currentStock;
    const newStock = prevStock + quantityDelta;
    prod.currentStock = newStock;
    prod.updatedAt = new Date().toISOString();
    setItem(KEYS.PRODUCTS, products);

    // Record Stock Movement
    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId: prod.id,
      productName: prod.name,
      date: new Date().toISOString(),
      type,
      quantity: quantityDelta,
      previousStock: prevStock,
      newStock,
      referenceNo,
      reason,
      createdBy: userFullName,
      createdAt: new Date().toISOString(),
    };

    const movements = this.getStockMovements();
    movements.unshift(movement);
    setItem(KEYS.STOCK_MOVEMENTS, movements);
    return { success: true };
  }

  // Customers
  static getCustomers(): Customer[] {
    return getItem<Customer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  static getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  static saveCustomer(customer: Customer): void {
    const list = this.getCustomers();
    const idx = list.findIndex((c) => c.id === customer.id);
    if (idx >= 0) {
      list[idx] = customer;
    } else {
      list.unshift(customer);
    }
    setItem(KEYS.CUSTOMERS, list);
    try {
      import('./firestoreSyncService').then(({ FirestoreSync }) => {
        FirestoreSync.syncCustomer(customer);
      });
    } catch {}
  }

  // Customer Ledger
  static getCustomerLedger(customerId?: string): CustomerLedgerEntry[] {
    const list = getItem<CustomerLedgerEntry[]>(KEYS.CUSTOMER_LEDGER, []);
    if (!customerId) return list;
    return list.filter((e) => e.customerId === customerId);
  }

  static getCustomerLedgers(customerId?: string): CustomerLedgerEntry[] {
    return this.getCustomerLedger(customerId);
  }

  static addCustomerLedgerEntry(entry: CustomerLedgerEntry): void {
    const list = this.getCustomerLedger();
    list.unshift(entry);
    setItem(KEYS.CUSTOMER_LEDGER, list);

    // Update customer current due
    const customers = this.getCustomers();
    const cust = customers.find((c) => c.id === entry.customerId);
    if (cust) {
      cust.currentDue = entry.balance;
      cust.updatedAt = new Date().toISOString();
      setItem(KEYS.CUSTOMERS, customers);
    }
  }

  static recordCustomerLedger(entry: Partial<CustomerLedgerEntry> & { customerId: string; type: CustomerLedgerEntry['type']; debit: number; credit: number; balance: number }): void {
    const fullEntry: CustomerLedgerEntry = {
      id: entry.id || `cled-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customerId: entry.customerId,
      customerName: entry.customerName,
      date: entry.date || new Date().toISOString(),
      type: entry.type,
      referenceId: entry.referenceId,
      referenceNo: entry.referenceNo,
      debit: entry.debit,
      credit: entry.credit,
      balance: entry.balance,
      paymentMode: entry.paymentMode,
      description: entry.description,
      notes: entry.notes,
      createdBy: entry.createdBy,
      createdAt: entry.createdAt || new Date().toISOString(),
    };
    this.addCustomerLedgerEntry(fullEntry);
  }

  // Suppliers
  static getSuppliers(): Supplier[] {
    return getItem<Supplier[]>(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  }

  static saveSupplier(supplier: Supplier): void {
    const list = this.getSuppliers();
    const idx = list.findIndex((s) => s.id === supplier.id);
    if (idx >= 0) {
      list[idx] = supplier;
    } else {
      list.unshift(supplier);
    }
    setItem(KEYS.SUPPLIERS, list);
    try {
      import('./firestoreSyncService').then(({ FirestoreSync }) => {
        FirestoreSync.syncSupplier(supplier);
      });
    } catch {}
  }

  // Supplier Ledger
  static getSupplierLedger(supplierId?: string): SupplierLedgerEntry[] {
    const list = getItem<SupplierLedgerEntry[]>(KEYS.SUPPLIER_LEDGER, []);
    if (!supplierId) return list;
    return list.filter((e) => e.supplierId === supplierId);
  }

  static getSupplierLedgers(supplierId?: string): SupplierLedgerEntry[] {
    return this.getSupplierLedger(supplierId);
  }

  static addSupplierLedgerEntry(entry: SupplierLedgerEntry): void {
    const list = this.getSupplierLedger();
    list.unshift(entry);
    setItem(KEYS.SUPPLIER_LEDGER, list);

    // Update supplier current due
    const suppliers = this.getSuppliers();
    const sup = suppliers.find((s) => s.id === entry.supplierId);
    if (sup) {
      sup.currentDue = entry.balance;
      sup.updatedAt = new Date().toISOString();
      setItem(KEYS.SUPPLIERS, suppliers);
    }
  }

  static recordSupplierLedger(entry: Partial<SupplierLedgerEntry> & { supplierId: string; type: SupplierLedgerEntry['type']; debit: number; credit: number; balance: number }): void {
    const fullEntry: SupplierLedgerEntry = {
      id: entry.id || `sled-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      supplierId: entry.supplierId,
      supplierName: entry.supplierName,
      date: entry.date || new Date().toISOString(),
      type: entry.type,
      referenceId: entry.referenceId,
      referenceNo: entry.referenceNo,
      debit: entry.debit,
      credit: entry.credit,
      balance: entry.balance,
      paymentMode: entry.paymentMode,
      description: entry.description,
      notes: entry.notes,
      createdBy: entry.createdBy,
      createdAt: entry.createdAt || new Date().toISOString(),
    };
    this.addSupplierLedgerEntry(fullEntry);
  }

  // Sales
  static getSales(): Sale[] {
    return getItem<Sale[]>(KEYS.SALES, []);
  }

  static getSaleById(id: string): Sale | undefined {
    return this.getSales().find((s) => s.id === id);
  }

  static getSaleByBillNumber(billNumber: string): Sale | undefined {
    return this.getSales().find((s) => s.billNumber.trim().toLowerCase() === billNumber.trim().toLowerCase());
  }

  static async saveSale(sale: Sale, syncCloud = true): Promise<void> {
    const list = this.getSales();
    const idx = list.findIndex((s) => s.id === sale.id);
    if (idx >= 0) {
      list[idx] = sale;
    } else {
      list.unshift(sale);
    }
    setItem(KEYS.SALES, list);
    if (syncCloud) {
      const { FirestoreSync } = await import('./firestoreSyncService');
      await FirestoreSync.syncSale(sale);
    }
  }

  static getNextBillNumber(): string {
    const config = this.getBillingConfig();
    let lastSeq = getItem<number>(KEYS.LAST_BILL_SEQ, 100);
    lastSeq += 1;
    setItem(KEYS.LAST_BILL_SEQ, lastSeq);

    const padded = String(lastSeq).padStart(6, '0');
    return `${config.billPrefix || 'INV-'}${padded}`;
  }

  // Sales Returns
  static getSalesReturns(): SalesReturn[] {
    return getItem<SalesReturn[]>(KEYS.SALES_RETURNS, []);
  }

  static saveSalesReturn(returnRecord: SalesReturn): void {
    const list = this.getSalesReturns();
    list.unshift(returnRecord);
    setItem(KEYS.SALES_RETURNS, list);
  }

  // Purchases
  static getPurchases(): Purchase[] {
    return getItem<Purchase[]>(KEYS.PURCHASES, []);
  }

  static savePurchase(purchase: Purchase): void {
    const list = this.getPurchases();
    const idx = list.findIndex((p) => p.id === purchase.id);
    if (idx >= 0) {
      list[idx] = purchase;
    } else {
      list.unshift(purchase);
    }
    setItem(KEYS.PURCHASES, list);
    try {
      import('./firestoreSyncService').then(({ FirestoreSync }) => {
        FirestoreSync.syncPurchase(purchase);
      });
    } catch {}
  }

  // Purchase Returns
  static getPurchaseReturns(): PurchaseReturn[] {
    return getItem<PurchaseReturn[]>(KEYS.PURCHASE_RETURNS, []);
  }

  static savePurchaseReturn(returnRecord: PurchaseReturn): void {
    const list = this.getPurchaseReturns();
    list.unshift(returnRecord);
    setItem(KEYS.PURCHASE_RETURNS, list);
  }

  // Stock Movements
  static getStockMovements(): StockMovement[] {
    return getItem<StockMovement[]>(KEYS.STOCK_MOVEMENTS, []);
  }

  // Damage Stock
  static getDamageStock(): DamageStock[] {
    return getItem<DamageStock[]>(KEYS.DAMAGE_STOCK, []);
  }

  static saveDamageStock(record: DamageStock): void {
    const list = this.getDamageStock();
    list.unshift(record);
    setItem(KEYS.DAMAGE_STOCK, list);
  }

  // Expenses
  static getExpenses(): Expense[] {
    return getItem<Expense[]>(KEYS.EXPENSES, []);
  }

  static saveExpense(expense: Expense): void {
    const list = this.getExpenses();
    const idx = list.findIndex((e) => e.id === expense.id);
    if (idx >= 0) {
      list[idx] = expense;
    } else {
      list.unshift(expense);
    }
    setItem(KEYS.EXPENSES, list);
  }

  static deleteExpense(id: string): void {
    const list = this.getExpenses().filter((e) => e.id !== id);
    setItem(KEYS.EXPENSES, list);
  }

  static deleteUser(id: string): void {
    const list = this.getUsers().filter((u) => u.id !== id);
    setItem(KEYS.USERS, list);
  }

  // Settings Helper
  static getSettings(): import('../types').ShopSettings {
    const profile = this.getShopProfile();
    const printer = this.getPrinterSettings();
    const billing = this.getBillingConfig();
    const whatsapp = this.getWhatsAppConfig();
    return {
      shopName: profile.shopName,
      tagline: profile.tagline || '',
      address: profile.address,
      city: profile.city,
      state: profile.state,
      pincode: profile.pincode,
      phone: profile.phone,
      whatsappNumber: profile.whatsappNumber,
      billHeader: profile.billHeader || 'Crackers Retail Invoice',
      billFooter: profile.footerMessage || 'Thank you! Visit again.',
      safetyDisclaimer: 'Store in cool dry place. Keep away from fire. Children must fire with adult supervision.',
      allowNegativeStock: billing.allowNegativeStock,
      allowDiscounts: billing.allowDiscountEditing,
      printer: {
        mode: printer.mode,
        paperWidth: printer.printerWidth,
        connectorUrl: printer.connectorUrl,
        baudRate: printer.serialBaudRate,
        copies: 1,
        autoPrintOnSave: billing.autoPrintOnComplete,
      },
      whatsapp: {
        enabled: true,
        messageHeader: whatsapp.defaultMessageTemplate || '🎆 *SIVAKASI FIREWORKS STORE* 🎆',
        messageFooter: '✨ Happy & Safe Diwali! Thank you. ✨',
      },
    };
  }

  static saveSettings(settings: import('../types').ShopSettings): void {
    const profile = this.getShopProfile();
    this.updateShopProfile({
      ...profile,
      shopName: settings.shopName,
      tagline: settings.tagline,
      address: settings.address,
      city: settings.city,
      state: settings.state,
      pincode: settings.pincode,
      phone: settings.phone,
      whatsappNumber: settings.whatsappNumber,
      billHeader: settings.billHeader,
      footerMessage: settings.billFooter,
    });

    const printer = this.getPrinterSettings();
    this.updatePrinterSettings({
      ...printer,
      mode: settings.printer.mode,
      printerWidth: settings.printer.paperWidth,
      connectorUrl: settings.printer.connectorUrl,
      serialBaudRate: settings.printer.baudRate || 9600,
    });

    const billing = this.getBillingConfig();
    this.updateBillingConfig({
      ...billing,
      allowNegativeStock: settings.allowNegativeStock,
      allowDiscountEditing: settings.allowDiscounts,
      autoPrintOnComplete: !!settings.printer.autoPrintOnSave,
    });

    const whatsapp = this.getWhatsAppConfig();
    this.updateWhatsAppConfig({
      ...whatsapp,
      defaultMessageTemplate: settings.whatsapp.messageHeader,
    });
  }

  static exportBackupJson(): string {
    return this.exportCompleteBackup();
  }

  static importBackupJson(jsonString: string): { success: boolean; error?: string } {
    const res = this.importBackup(jsonString);
    return { success: res.success, error: res.message };
  }

  static getDamagedStock(): DamageStock[] {
    return this.getDamageStock();
  }

  static saveDamagedStock(record: DamageStock): void {
    this.saveDamageStock(record);
  }

  static processSalesReturn(returnRecord: SalesReturn): void {
    this.saveSalesReturn(returnRecord);
    const user = this.getCurrentUser();

    // Restock returned items
    for (const item of returnRecord.items) {
      this.updateProductStock(
        item.productId,
        item.quantity,
        'SALES_RETURN',
        returnRecord.returnNumber,
        item.reason || 'Sales return',
        user.fullName
      );
    }

    // Ledger adjustment if customer exists
    if (returnRecord.customerId && returnRecord.customerId !== 'WALK_IN') {
      const cust = this.getCustomerById(returnRecord.customerId);
      const newBal = (cust?.currentDue || 0) - returnRecord.totalReturnAmount;
      this.addCustomerLedgerEntry({
        id: `cled-${Date.now()}`,
        customerId: returnRecord.customerId,
        date: returnRecord.date,
        type: 'RETURN',
        referenceId: returnRecord.id,
        referenceNo: returnRecord.returnNumber,
        debit: 0,
        credit: returnRecord.totalReturnAmount,
        balance: newBal,
        notes: `Sales return for bill ${returnRecord.billNumber}`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  static processPurchaseReturn(returnRecord: PurchaseReturn): void {
    this.savePurchaseReturn(returnRecord);
    const user = this.getCurrentUser();

    // Deduct stock for returned items
    for (const item of returnRecord.items) {
      this.updateProductStock(
        item.productId,
        -item.quantity,
        'PURCHASE_RETURN',
        returnRecord.returnNumber,
        item.reason || 'Purchase return to supplier',
        user.fullName
      );
    }

    // Supplier ledger adjustment
    if (returnRecord.supplierId) {
      const sup = this.getSuppliers().find((s) => s.id === returnRecord.supplierId);
      const newBal = (sup?.currentDue || 0) - returnRecord.totalAmount;
      this.addSupplierLedgerEntry({
        id: `sled-${Date.now()}`,
        supplierId: returnRecord.supplierId,
        date: returnRecord.date,
        type: 'RETURN',
        referenceId: returnRecord.id,
        referenceNo: returnRecord.returnNumber,
        debit: returnRecord.totalAmount,
        credit: 0,
        balance: newBal,
        notes: `Purchase return ${returnRecord.returnNumber}`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Day Closings
  static getDayClosings(): DayClosing[] {
    return getItem<DayClosing[]>(KEYS.DAY_CLOSINGS, []);
  }

  static saveDayClosing(closing: DayClosing): void {
    const list = this.getDayClosings();
    const idx = list.findIndex((d) => d.id === closing.id);
    if (idx >= 0) {
      list[idx] = closing;
    } else {
      list.unshift(closing);
    }
    setItem(KEYS.DAY_CLOSINGS, list);
  }

  // Users & Auth
  static getUsers(): AppUser[] {
    const users = getItem<AppUser[]>(KEYS.USERS, INITIAL_USERS);
    if (!Array.isArray(users) || users.length === 0) {
      return INITIAL_USERS;
    }
    return users.map((u) => ({
      ...u,
      permissions: u.permissions || INITIAL_USERS[0].permissions,
    }));
  }

  static saveUser(user: AppUser): void {
    const list = this.getUsers();
    const idx = list.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    setItem(KEYS.USERS, list);
  }

  static getCurrentUser(): AppUser {
    const user = getItem<AppUser>(KEYS.CURRENT_USER, INITIAL_USERS[0]);
    if (!user || !user.permissions) {
      return {
        ...(user || INITIAL_USERS[0]),
        permissions: user?.permissions || INITIAL_USERS[0].permissions,
      };
    }
    return user;
  }

  static setCurrentUser(user: AppUser): void {
    setItem(KEYS.CURRENT_USER, user);
  }

  // Printer Settings
  static getPrinterSettings(): PrinterSettings {
    return getItem<PrinterSettings>(KEYS.PRINTER_SETTINGS, INITIAL_PRINTER_SETTINGS);
  }

  static updatePrinterSettings(settings: PrinterSettings): void {
    setItem(KEYS.PRINTER_SETTINGS, settings);
  }

  // Billing Config
  static getBillingConfig(): BillingConfig {
    return getItem<BillingConfig>(KEYS.BILLING_CONFIG, INITIAL_BILLING_CONFIG);
  }

  static updateBillingConfig(config: BillingConfig): void {
    setItem(KEYS.BILLING_CONFIG, config);
  }

  // WhatsApp Config
  static getWhatsAppConfig(): WhatsAppConfig {
    return getItem<WhatsAppConfig>(KEYS.WHATSAPP_CONFIG, INITIAL_WHATSAPP_CONFIG);
  }

  static updateWhatsAppConfig(config: WhatsAppConfig): void {
    setItem(KEYS.WHATSAPP_CONFIG, config);
  }

  // Held Bills
  static getHeldBills(): HeldBill[] {
    return getItem<HeldBill[]>(KEYS.HELD_BILLS, []);
  }

  static saveHeldBill(heldBill: HeldBill): void {
    const list = this.getHeldBills();
    list.unshift(heldBill);
    setItem(KEYS.HELD_BILLS, list);
  }

  static removeHeldBill(id: string): void {
    const list = this.getHeldBills().filter((b) => b.id !== id);
    setItem(KEYS.HELD_BILLS, list);
  }

  // Audit Logs
  static getAuditLogs(): AuditLog[] {
    return getItem<AuditLog[]>(KEYS.AUDIT_LOGS, []);
  }

  static logAudit(
    action: string,
    details: string,
    referenceNo?: string,
    oldValue?: string,
    newValue?: string
  ): void {
    const user = this.getCurrentUser();
    const now = new Date();
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userName: user.fullName,
      action,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString(),
      referenceNo,
      details,
      oldValue,
      newValue,
      createdAt: now.toISOString(),
    };
    const list = this.getAuditLogs();
    list.unshift(log);
    setItem(KEYS.AUDIT_LOGS, list.slice(0, 500)); // Keep last 500 logs
  }

  // Backup & Restore
  static exportCompleteBackup(): string {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      shopProfile: this.getShopProfile(),
      categories: this.getCategories(),
      brands: this.getBrands(),
      units: this.getUnits(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      suppliers: this.getSuppliers(),
      sales: this.getSales(),
      salesReturns: this.getSalesReturns(),
      purchases: this.getPurchases(),
      purchaseReturns: this.getPurchaseReturns(),
      customerLedger: this.getCustomerLedger(),
      supplierLedger: this.getSupplierLedger(),
      stockMovements: this.getStockMovements(),
      damageStock: this.getDamageStock(),
      expenses: this.getExpenses(),
      dayClosings: this.getDayClosings(),
      printerSettings: this.getPrinterSettings(),
      billingConfig: this.getBillingConfig(),
      whatsappConfig: this.getWhatsAppConfig(),
      users: this.getUsers(),
    };
    return JSON.stringify(data, null, 2);
  }

  static importBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data.products || !data.sales || !data.shopProfile) {
        return { success: false, message: 'Invalid backup file format.' };
      }

      if (data.shopProfile) setItem(KEYS.SHOP_PROFILE, data.shopProfile);
      if (data.categories) setItem(KEYS.CATEGORIES, data.categories);
      if (data.brands) setItem(KEYS.BRANDS, data.brands);
      if (data.units) setItem(KEYS.UNITS, data.units);
      if (data.products) setItem(KEYS.PRODUCTS, data.products);
      if (data.customers) setItem(KEYS.CUSTOMERS, data.customers);
      if (data.suppliers) setItem(KEYS.SUPPLIERS, data.suppliers);
      if (data.sales) setItem(KEYS.SALES, data.sales);
      if (data.salesReturns) setItem(KEYS.SALES_RETURNS, data.salesReturns);
      if (data.purchases) setItem(KEYS.PURCHASES, data.purchases);
      if (data.purchaseReturns) setItem(KEYS.PURCHASE_RETURNS, data.purchaseReturns);
      if (data.customerLedger) setItem(KEYS.CUSTOMER_LEDGER, data.customerLedger);
      if (data.supplierLedger) setItem(KEYS.SUPPLIER_LEDGER, data.supplierLedger);
      if (data.stockMovements) setItem(KEYS.STOCK_MOVEMENTS, data.stockMovements);
      if (data.damageStock) setItem(KEYS.DAMAGE_STOCK, data.damageStock);
      if (data.expenses) setItem(KEYS.EXPENSES, data.expenses);
      if (data.dayClosings) setItem(KEYS.DAY_CLOSINGS, data.dayClosings);
      if (data.printerSettings) setItem(KEYS.PRINTER_SETTINGS, data.printerSettings);
      if (data.billingConfig) setItem(KEYS.BILLING_CONFIG, data.billingConfig);
      if (data.whatsappConfig) setItem(KEYS.WHATSAPP_CONFIG, data.whatsappConfig);
      if (data.users) setItem(KEYS.USERS, data.users);

      return { success: true, message: 'Backup restored successfully!' };
    } catch (err) {
      return { success: false, message: `Failed to parse backup: ${(err as Error).message}` };
    }
  }
}
