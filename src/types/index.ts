export type UserRole = 'OWNER' | 'ADMIN' | 'BILLING_STAFF' | 'STOCK_STAFF';

export type NavigationTab =
  | 'DASHBOARD'
  | 'BILLING'
  | 'SALES_HISTORY'
  | 'PRODUCTS'
  | 'STOCK'
  | 'CUSTOMERS'
  | 'PURCHASES'
  | 'SUPPLIERS'
  | 'REPORTS'
  | 'SETTINGS'
  | 'SALES_RETURN'
  | 'CATEGORIES'
  | 'PURCHASE_RETURN'
  | 'DAMAGE_STOCK'
  | 'EXPENSES'
  | 'DAY_CLOSING'
  | 'USERS'
  | 'BRANCHES'
  | 'EMERGENCY'
  | 'PRINTER';
  

export interface UserPermissions {
  dashboard?: boolean;
  salesHistory?: boolean;
  billing?: boolean;
  products?: boolean;
  purchases?: boolean;
  stock?: boolean;
  customers?: boolean;
  suppliers?: boolean;
  reports?: boolean;
  expenses?: boolean;
  settings?: boolean;
  users?: boolean;
  canEditRate: boolean;
  canGiveDiscount: boolean;
  canCancelBill: boolean;
  canManualStockAdjust?: boolean;
  canChangePrinterConfig?: boolean;
  canViewReports?: boolean;
  canManageStock?: boolean;
  canManageUsers?: boolean;
}

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email?: string;
  pin?: string;
  isActive: boolean;
  permissions: UserPermissions;
  createdAt?: string;
  branchId?: string;
}

export type User = AppUser;

export interface ShopSettings {
  shopName: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  whatsappNumber: string;
  billHeader: string;
  billFooter: string;
  safetyDisclaimer: string;
  allowNegativeStock: boolean;
  allowDiscounts: boolean;
  printer: {
    mode: 'CONNECTOR' | 'SERIAL' | 'NO_PRINTER';
    paperWidth: '58mm' | '80mm';
    connectorUrl: string;
    baudRate?: number;
    copies?: number;
    autoPrintOnSave?: boolean;
  };
  whatsapp: {
    enabled: boolean;
    messageHeader: string;
    messageFooter: string;
  };
}

export interface ShopProfile {
  shopName: string;
  tagline?: string;
  shopLogo?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  website?: string;
  footerMessage: string;
  billHeader?: string;
}

export interface Category {
  id: string;
  name: string;
  shortCode?: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: string;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  city?: string;
  contactNumber?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  isDefault?: boolean;
}

export interface Product {
  id: string;
  name: string;
  tamilName?: string;
  searchAliases?: string[];
  isDiscountable?: boolean;
  shortName: string;
  barcode: string;
  categoryId: string;
  categoryName?: string;
  brandName?: string;
  subCategory?: string;
  brandId: string;
  unit: string;
  packingType: string; // e.g. 'Box of 10', '1 Piece', 'Packet of 5'
  piecesPerPack?: number;
  purchaseRate: number;
  sellingRate: number;
  mrp: number;
  wholesaleRate: number;
  minimumSellingRate?: number;
  openingStock?: number;
  currentStock: number;
  minimumStockLevel: number;
  rackLocation: string;
  productImage?: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  mobile: string;
  whatsappNumber?: string;
  address?: string;
  city?: string;
  notes?: string;
  openingDue: number;
  currentDue: number;
  totalPurchased: number;
  totalPaid: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  supplierCode?: string;
  contactPerson?: string;
  mobile: string;
  whatsapp?: string;
  address?: string;
  city: string;
  gstNumber?: string;
  openingDue: number;
  currentDue: number;
  totalPurchased: number;
  totalPaid: number;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  sellingRate: number;
  mrp: number;
  purchaseRate: number;
  discountPercent: number;
  discountAmount: number;
  lineTotal: number;
  lineProfit: number;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'MIXED';

export interface PaymentBreakdown {
  cash: number;
  upi: number;
  card: number;
  credit: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  barcode: string;
  unit: string;
  quantity: number;
  sellingRate: number;
  mrp: number;
  purchaseRate: number;
  discountPercent: number;
  discountAmount: number;
  lineTotal: number;
  lineCost: number;
  lineProfit: number;
  returnedQty?: number;
}

export interface Sale {
  id: string;
  branchId?: string;
  branchNameSnapshot?: string;
  staffId?: string;
  staffNameSnapshot?: string;
  billNumber: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerWhatsapp?: string;
  items: SaleItem[];
  subtotal: number;
  itemDiscountTotal: number;
  billDiscountPercent: number;
  billDiscountAmount: number;
  totalDiscount: number;
  grandTotal: number;
  totalPurchaseCost: number;
  totalProfit: number;
  paymentMethod: PaymentMethod;
  paymentBreakdown: PaymentBreakdown;
  paidAmount: number;
  dueAmount: number;
  status: 'COMPLETED' | 'RETURNED' | 'CANCELLED' | 'PARTIALLY_RETURNED';
  cashierId: string;
  cashierName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  total?: number;
  totalAmount?: number;
  reason?: string;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  originalSaleId: string;
  originalBillNumber?: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  items: SalesReturnItem[];
  totalReturnAmount: number;
  refundMethod: 'CASH' | 'CREDIT_ADJUSTMENT' | 'UPI';
  cashierId: string;
  cashierName: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  purchaseRate: number;
  total?: number;
  mrp?: number;
  sellingRate?: number;
  discountAmount?: number;
  lineTotal?: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceNo: string;
  purchaseDate: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  totalDiscount?: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CREDIT';
  notes?: string;
  status: 'RECEIVED' | 'RETURNED' | 'CANCELLED';
  createdAt: string;
}

export interface PurchaseReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  total?: number;
  totalAmount?: number;
  reason?: string;
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  originalPurchaseId: string;
  originalPurchaseNumber?: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseReturnItem[];
  totalAmount: number;
  refundMethod: 'CASH' | 'CREDIT_ADJUSTMENT' | 'UPI';
  notes?: string;
  createdAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  customerName?: string;
  date: string;
  type: 'SALE' | 'PAYMENT' | 'RETURN' | 'OPENING_BALANCE' | 'PAYMENT_RECEIVED';
  referenceId?: string;
  referenceNo?: string;
  debit: number; // Increases customer due
  credit: number; // Decreases customer due
  balance: number;
  paymentMode?: string;
  description?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  supplierName?: string;
  date: string;
  type: 'PURCHASE' | 'PAYMENT' | 'RETURN' | 'OPENING_BALANCE' | 'PAYMENT_MADE';
  referenceId?: string;
  referenceNo?: string;
  debit: number; // Reduces supplier due (payment made)
  credit: number; // Increases supplier due (purchase made)
  balance: number;
  paymentMode?: string;
  description?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'SALES_RETURN'
  | 'PURCHASE_RETURN'
  | 'DAMAGE'
  | 'ADJUSTMENT'
  | 'OPENING'
  | 'OPENING_STOCK';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  date: string;
  type: StockMovementType;
  quantity: number; // + for incoming, - for outgoing
  previousStock: number;
  newStock: number;
  referenceId?: string;
  referenceNo?: string;
  reason?: string;
  createdBy: string;
  createdAt: string;
}

export type DamageReason =
  | 'DAMP_MOISTURE'
  | 'FUSE_FAILURE'
  | 'BROKEN_PACKAGING'
  | 'TRANSIT_DAMAGE'
  | 'TEST_FIRING'
  | 'OTHER';

export interface DamageStock {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit?: string;
  purchaseRate?: number;
  lossAmount?: number;
  damageReason?: DamageReason;
  reason?: string;
  date?: string;
  notes?: string;
  reportedBy: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'RENT'
  | 'ELECTRICITY'
  | 'TRANSPORT'
  | 'STAFF_SALARY'
  | 'PACKING_MATERIAL'
  | 'LICENSES_FEES'
  | 'TEA_SNACKS'
  | 'MARKETING'
  | 'OTHER';

export interface Expense {
  id: string;
  title?: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
  description?: string;
  notes?: string;
  recordedBy?: string;
  createdBy?: string;
  createdAt: string;
}

export interface DayClosing {
  id: string;
  closingDate: string;
  openingCash: number;
  openingCashBalance?: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  creditSales: number;
  totalSalesAmount?: number;
  cashExpenses: number;
  totalExpenseAmount?: number;
  cashCollectedFromDues: number;
  expectedCashInDrawer: number;
  actualCashInDrawer: number;
  actualPhysicalCash?: number;
  difference: number;
  totalBillsCount: number;
  totalInvoicesCount?: number;
  notes?: string;
  closedBy: string;
  closedAt: string;
  isClosed: boolean;
  status?: string;
}

export type PrinterMode = 'CONNECTOR' | 'SERIAL' | 'NO_PRINTER';

export interface PrinterSettings {
  mode: PrinterMode;
  isEnabled: boolean;
  autoPrint: boolean;
  printerWidth: '80mm' | '58mm';
  // Mode 1: Connector App
  connectorUrl: string;
  connectorPort: number;
  connectorStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  // Mode 2: Serial Printer
  serialPort: string;
  serialBaudRate: number;
  serialConnected: boolean;
  // Receipt layout toggles
  receiptTemplate: {
    showLogo: boolean;
    showAddress: boolean;
    showPhone: boolean;
    showCustomer: boolean;
    showBarcode: boolean;
    showFooter: boolean;
    showPaymentBreakdown: boolean;
  };
}

export interface BillingConfig {
  billPrefix: string;
  startingNumber: number;
  defaultCustomerId: string;
  defaultPaymentMode: PaymentMethod;
  allowRateEditing: boolean;
  allowDiscountEditing: boolean;
  allowNegativeStock: boolean;
  autoPrintOnComplete: boolean;
  defaultDiscountPercent: number;
}

export interface WhatsAppConfig {
  shopWhatsappNumber: string;
  defaultMessageTemplate: string;
  includeItemDetails: boolean;
  includePdfLink: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  date: string;
  time: string;
  referenceId?: string;
  referenceNo?: string;
  details: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface HeldBill {
  id: string;
  heldAt: string;
  customerId: string;
  customerName: string;
  items: CartItem[];
  billDiscountPercent: number;
  billDiscountAmount: number;
  notes?: string;
}

export interface PrintReceiptResult {
  success: boolean;
  message: string;
  printerMode: PrinterMode;
  error?: string;
}
