import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  Percent,
  Sparkles,
  Barcode,
  Camera,
  Flame,
  XCircle,
  PauseCircle,
  PlayCircle,
  Package,
  Zap,
  Gift,
  Disc,
  Smile,
  Star,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import {
  Product,
  Category,
  Customer,
  CartItem,
  PaymentMethod,
  HeldBill,
  Sale,
} from '../../types';
import { StorageService } from '../../services/storageService';
import { BillingService } from '../../services/billingService';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { useToast } from '../../components/common/Toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { tamilToTanglish } from '../../services/transliterationService';

interface Props {
  onSaleCompleted?: (sale: Sale) => void;
  onOpenShortcuts?: () => void;
}

export const BillingView: React.FC<Props> = ({ onSaleCompleted, onOpenShortcuts }) => {
  const { success, error, warning, info } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);

  // Mobile View Tab: 'ITEMS' | 'CART'
  const [mobileTab, setMobileTab] = useState<'ITEMS' | 'CART'>('ITEMS');
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const handleViewportChange = () => setIsMobileViewport(media.matches);
    handleViewportChange();
    media.addEventListener('change', handleViewportChange);
    return () => media.removeEventListener('change', handleViewportChange);
  }, []);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-walkin');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Discount & Payment
  const [billDiscountType, setBillDiscountType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [mixedCash, setMixedCash] = useState<number>(0);
  const [mixedUpi, setMixedUpi] = useState<number>(0);
  const [billNotes, setBillNotes] = useState<string>('');

  // UI Modals / Drawers
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustCity, setNewCustCity] = useState('');

  const [isHeldBillsOpen, setIsHeldBillsOpen] = useState(false);
  const [completedSaleForReceipt, setCompletedSaleForReceipt] = useState<Sale | null>(null);

  // References
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scannerVideoRef = useRef<HTMLVideoElement>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState('Point your camera at a product barcode');
  const [manualScanValue, setManualScanValue] = useState('');
  const [emergencyNumber, setEmergencyNumber] = useState('');

  const currentUser = StorageService.getCurrentUser();
  const billingConfig = StorageService.getBillingConfig();

  // Load initial data
  const loadData = () => {
    setProducts(StorageService.getProducts());
    setCategories(StorageService.getCategories());
    setCustomers(StorageService.getCustomers());
    setHeldBills(StorageService.getHeldBills());
  };

  useEffect(() => {
    loadData();
    getDoc(doc(db,'settings','emergency')).then(s=>setEmergencyNumber(s.data()?.emergencyContactNumber || '')).catch(()=>{});
    searchInputRef.current?.focus();
  }, []);

  const closeScanner = () => {
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
    scannerStreamRef.current = null;
    setIsScannerOpen(false);
  };

  const openScanner = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerMessage('Camera access is not available in this browser.');
      setIsScannerOpen(true);
      return;
    }
    setIsScannerOpen(true);
    setScannerMessage('Point your camera at a product barcode');
    try {
      const reader = new BrowserMultiFormatReader();
      zxingControlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        scannerVideoRef.current!,
        (result) => {
          if (!result) return;
          const value = result.getText().trim();
          const product = products.find((p) => p.isActive && (p.barcode?.trim() === value || p.shortName?.toLowerCase() === value.toLowerCase()));
          if (product) {
            setSearchQuery(value);
            addToCart(product);
            closeScanner();
          } else {
            setScannerMessage(`Scanned ${value}, but no matching product was found.`);
          }
        }
      );
    } catch {
      setScannerMessage('Camera permission was not granted. Please allow camera access and try again.');
    }
  };

  const handleManualScan = () => {
    const value = manualScanValue.trim().toLowerCase();
    if (!value) return;
    const product = products.find((p) => p.isActive && (p.barcode?.toLowerCase() === value || p.shortName?.toLowerCase() === value));
    if (product) {
      addToCart(product);
      setManualScanValue('');
      closeScanner();
    } else {
      setScannerMessage(`No product found for ${manualScanValue.trim()}`);
    }
  };

  useEffect(() => () => closeScanner(), []);

  // Keyboard Shortcuts Listener (F2, F4, F8, F9, Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setMobileTab('ITEMS');
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setIsNewCustModalOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        const modes: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'CREDIT', 'MIXED'];
        const nextIdx = (modes.indexOf(paymentMethod) + 1) % modes.length;
        setPaymentMethod(modes[nextIdx]);
      } else if (e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        handleCompleteBill();
      } else if (e.key === 'Escape') {
        setIsNewCustModalOpen(false);
        setIsHeldBillsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchesCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.tamilName && p.tamilName.includes(searchQuery.trim())) ||
        tamilToTanglish(p.tamilName || p.name).includes(tamilToTanglish(searchQuery)) ||
        (p.searchAliases || []).some(alias => alias.includes(tamilToTanglish(searchQuery))) ||
        (p.shortName && p.shortName.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.unit && p.unit.toLowerCase().includes(q))
      );
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart Calculations
  const cartTotals = useMemo(() => {
    return BillingService.calculateTotals(
      cart,
      billDiscountType === 'PERCENT' ? billDiscountValue : 0,
      billDiscountType === 'FLAT' ? billDiscountValue : 0,
      billDiscountType
    );
  }, [cart, billDiscountType, billDiscountValue]);

  // Effective Paid Amount
  const effectivePaidAmount = useMemo(() => {
    if (paymentMethod === 'CREDIT') return 0;
    if (paymentMethod === 'MIXED') return mixedCash + mixedUpi;
    if (paidAmountInput.trim() !== '') {
      const p = parseFloat(paidAmountInput);
      return isNaN(p) ? 0 : p;
    }
    return cartTotals.grandTotal;
  }, [paymentMethod, mixedCash, mixedUpi, paidAmountInput, cartTotals.grandTotal]);

  const dueBalance = Math.max(0, cartTotals.grandTotal - effectivePaidAmount);

  // Selected Customer details
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (!billingConfig.allowNegativeStock && product.currentStock <= 0) {
      error(`${product.name} is Out of Stock!`);
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === product.id);
      if (existingIdx >= 0) {
        const item = prev[existingIdx];
        const newQty = item.quantity + 1;
        if (!billingConfig.allowNegativeStock && newQty > product.currentStock) {
          warning(`Only ${product.currentStock} available in stock`);
          return prev;
        }
        const updatedItem = BillingService.calculateItem({ ...item, quantity: newQty });
        const copy = [...prev];
        copy[existingIdx] = updatedItem;
        return copy;
      } else {
        const newItem: CartItem = {
          productId: product.id,
          product,
          quantity: 1,
          sellingRate: product.sellingRate,
          mrp: product.mrp,
          purchaseRate: product.purchaseRate,
          discountPercent: 0,
          discountAmount: 0,
          lineTotal: product.sellingRate,
          lineProfit: product.sellingRate - product.purchaseRate,
        };
        return [newItem, ...prev];
      }
    });
  };

  const updateItemQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (!billingConfig.allowNegativeStock && newQty > item.product.currentStock) {
            warning(`Only ${item.product.currentStock} available in stock`);
            return item;
          }
          return BillingService.calculateItem({ ...item, quantity: newQty });
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const setItemExactQty = (productId: string, qtyStr: string) => {
    const val = parseInt(qtyStr, 10);
    if (isNaN(val) || val <= 0) return;
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        if (!billingConfig.allowNegativeStock && val > item.product.currentStock) {
          warning(`Only ${item.product.currentStock} available in stock`);
          return item;
        }
        return BillingService.calculateItem({ ...item, quantity: val });
      })
    );
  };

  const setItemRate = (productId: string, rateStr: string) => {
    if (!currentUser?.permissions?.canEditRate) {
      error('Rate editing is disabled for your user role.');
      return;
    }
    const val = parseFloat(rateStr);
    if (isNaN(val) || val < 0) return;
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        return BillingService.calculateItem({ ...item, sellingRate: val });
      })
    );
  };

  const setItemDiscount = (productId: string, discPercentStr: string) => {
    if (!currentUser?.permissions?.canGiveDiscount) {
      error('Discount editing is disabled for your user role.');
      return;
    }
    const val = Math.min(100, Math.max(0, parseFloat(discPercentStr) || 0));
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        return BillingService.calculateItem({ ...item, discountPercent: val });
      })
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Clear current billing cart?')) {
      setCart([]);
      setBillDiscountValue(0);
      setPaidAmountInput('');
      setMixedCash(0);
      setMixedUpi(0);
      setBillNotes('');
    }
  };

  // Search input handling (Barcode scan or Enter)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return;

      // Exact barcode match first
      const exactBarcode = products.find(
        (p) => p.isActive && p.barcode && p.barcode.toLowerCase() === q
      );
      if (exactBarcode) {
        addToCart(exactBarcode);
        setSearchQuery('');
        return;
      }

      // If only one product filtered, add it
      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearchQuery('');
      }
    }
  };

  // Hold Bill
  const handleHoldBill = () => {
    if (cart.length === 0) {
      warning('Cart is empty. Nothing to hold.');
      return;
    }

    const newHold: HeldBill = {
      id: `hold-${Date.now()}`,
      heldAt: new Date().toISOString(),
      customerId: selectedCustomerId,
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      items: cart,
      billDiscountPercent: billDiscountType === 'PERCENT' ? billDiscountValue : 0,
      billDiscountAmount: billDiscountType === 'FLAT' ? billDiscountValue : 0,
      notes: billNotes,
    };

    StorageService.saveHeldBill(newHold);
    setHeldBills(StorageService.getHeldBills());

    // Reset current cart
    setCart([]);
    setBillDiscountValue(0);
    setPaidAmountInput('');
    setBillNotes('');
    success('Bill held successfully. You can recall it anytime.');
  };

  // Recall Held Bill
  const recallHeldBill = (held: HeldBill) => {
    if (cart.length > 0) {
      if (!confirm('Replace current cart with held bill?')) return;
    }

    setCart(held.items);
    setSelectedCustomerId(held.customerId || 'cust-walkin');
    setBillNotes(held.notes || '');
    if (held.billDiscountPercent > 0) {
      setBillDiscountType('PERCENT');
      setBillDiscountValue(held.billDiscountPercent);
    } else if (held.billDiscountAmount > 0) {
      setBillDiscountType('FLAT');
      setBillDiscountValue(held.billDiscountAmount);
    }

    // Remove from held
    StorageService.removeHeldBill(held.id);
    setHeldBills(StorageService.getHeldBills());
    setIsHeldBillsOpen(false);
    setMobileTab('CART');
    info(`Restored held bill for ${held.customerName}`);
  };

  // Create Quick Customer
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      warning('Customer name is required.');
      return;
    }

    const created: Customer = {
      id: `cust-${Date.now()}`,
      customerCode: `CUST-${String(customers.length + 1).padStart(4, '0')}`,
      name: newCustName.trim(),
      mobile: newCustMobile.trim() || 'N/A',
      whatsappNumber: newCustMobile.trim() || '',
      city: newCustCity.trim() || 'Local',
      address: '',
      openingDue: 0,
      currentDue: 0,
      totalPurchased: 0,
      totalPaid: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    StorageService.saveCustomer(created);
    const updated = StorageService.getCustomers();
    setCustomers(updated);
    setSelectedCustomerId(created.id);

    setNewCustName('');
    setNewCustMobile('');
    setNewCustCity('');
    setIsNewCustModalOpen(false);
    success(`Customer ${created.name} created!`);
  };

  // Finalize and Complete Bill
  const handleCompleteBill = async () => {
    if (cart.length === 0) {
      warning('Cannot complete bill. Cart is empty.');
      return;
    }

    const res = await BillingService.completeSale({
      items: cart,
      customerId: selectedCustomerId,
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      customerMobile: selectedCustomer?.mobile || '',
      customerWhatsapp: selectedCustomer?.whatsappNumber || selectedCustomer?.mobile,
      paymentMethod,
      paymentBreakdown: {
        cash: paymentMethod === 'MIXED' ? mixedCash : paymentMethod === 'CASH' ? effectivePaidAmount : 0,
        upi: paymentMethod === 'MIXED' ? mixedUpi : paymentMethod === 'UPI' ? effectivePaidAmount : 0,
        card: paymentMethod === 'CARD' ? effectivePaidAmount : 0,
        credit: paymentMethod === 'CREDIT' ? cartTotals.grandTotal : dueBalance,
      },
      paidAmount: effectivePaidAmount,
      billDiscountPercent: billDiscountType === 'PERCENT' ? billDiscountValue : 0,
      billDiscountAmount: billDiscountType === 'FLAT' ? billDiscountValue : 0,
      notes: billNotes,
    });

    if (res.success && res.sale) {
      success(`Bill #${res.sale.billNumber} completed! Grand Total: ₹${res.sale.grandTotal}`);

      // Clear current bill state
      setCart([]);
      setBillDiscountValue(0);
      setPaidAmountInput('');
      setMixedCash(0);
      setMixedUpi(0);
      setBillNotes('');
      setSelectedCustomerId('cust-walkin');
      setMobileTab('ITEMS');

      // Reload fresh stock
      loadData();

      // Open receipt dialog
      if (onSaleCompleted) {
        onSaleCompleted(res.sale);
      } else {
        setCompletedSaleForReceipt(res.sale);
      }
    } else {
      error(res.error || 'Failed to complete bill.');
    }
  };

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'cat-sparklers':
        return <Flame className="w-3.5 h-3.5" />;
      case 'cat-rockets':
        return <Zap className="w-3.5 h-3.5" />;
      case 'cat-pots':
      case 'cat-chakkars':
        return <Disc className="w-3.5 h-3.5" />;
      case 'cat-shots':
        return <Zap className="w-3.5 h-3.5" />;
      case 'cat-giftboxes':
        return <Gift className="w-3.5 h-3.5" />;
      case 'cat-kids':
        return <Smile className="w-3.5 h-3.5" />;
      case 'cat-fancy':
        return <Star className="w-3.5 h-3.5" />;
      default:
        return <Package className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div id="billing-view-container" className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-slate-950">
      {/* MOBILE SEGMENTED TOGGLE (Visible only on mobile < lg) */}
      <div className="lg:hidden p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 flex-1">
          <button
            onClick={() => setMobileTab('ITEMS')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'ITEMS'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Items Catalog</span>
          </button>

          <button
            onClick={() => setMobileTab('CART')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'CART'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>
              Cart ({cart.length}) {cartTotals.grandTotal > 0 ? `• ₹${cartTotals.grandTotal}` : ''}
            </span>
          </button>
        </div>

        {heldBills.length > 0 && (
          <button
            onClick={() => setIsHeldBillsOpen(true)}
            className="px-2 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
            title="Recall Held Invoices"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>{heldBills.length}</span>
          </button>
        )}
      </div>

      {/* LEFT COLUMN: Product Catalog & Search */}
      {(!isMobileViewport || mobileTab === 'ITEMS') && (
      <div
        id="mobile-products-panel"
        className={`${
          mobileTab === 'ITEMS' ? 'flex' : 'hidden lg:flex'
        } flex-1 flex-col h-full border-r border-slate-800 overflow-hidden relative`}
      >
        {/* Search Bar & Category Chips */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/90 shrink-0 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                id="pos-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search Cracker Name or Scan Barcode (F2)..."
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              id="btn-scan-barcode-action"
              onClick={openScanner}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-orange-400 rounded-xl transition-colors shrink-0"
              title="Barcode Scanner Ready"
            >
              <Barcode className="w-5 h-5" />
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              id="cat-chip-all"
              onClick={() => setSelectedCategory('ALL')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-orange-600 text-white shadow-sm shadow-orange-950'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              ALL FIREWORKS
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`cat-chip-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-orange-600 text-white shadow-sm shadow-orange-950 font-bold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {getCategoryIcon(cat.id)}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 pb-20 lg:pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5">
            {filteredProducts.map((prod) => {
              const isLow = prod.currentStock <= prod.minimumStockLevel;
              const isOut = prod.currentStock <= 0;
              const inCartItem = cart.find((c) => c.productId === prod.id);

              return (
                <button
                  key={prod.id}
                  id={`prod-card-${prod.id}`}
                  onClick={() => addToCart(prod)}
                  disabled={isOut && !billingConfig.allowNegativeStock}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left flex flex-col justify-between transition-all group relative overflow-hidden select-none active:scale-97 ${
                    inCartItem
                      ? 'bg-orange-950/30 border-orange-500/60 ring-1 ring-orange-500/40'
                      : isOut
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                      : 'bg-slate-900 border-slate-800 hover:border-orange-500/60 hover:bg-slate-800/90 shadow-sm'
                  }`}
                >
                  {/* In Cart Indicator */}
                  {inCartItem && (
                    <div className="absolute top-0 right-0 bg-orange-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg">
                      {inCartItem.quantity} in cart
                    </div>
                  )}

                  {/* Top Badge: Stock */}
                  <div className="flex items-start justify-between gap-1 w-full">
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[80px]">
                      {prod.shortName || prod.barcode}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        isOut
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : isLow
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {prod.currentStock} {prod.unit}
                    </span>
                  </div>

                  {/* Product Title */}
                  <div className="my-1.5 sm:my-2">
                    <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-tight group-hover:text-orange-400 transition-colors">
                      {prod.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{prod.packingType || prod.unit}</p>
                  </div>

                  {/* Price Row */}
                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-800/80 w-full">
                    <div>
                      <span className="text-xs sm:text-sm font-black text-white font-mono">₹{prod.sellingRate}</span>
                      {prod.mrp > prod.sellingRate && (
                        <span className="text-[9px] text-slate-400 line-through ml-1">₹{prod.mrp}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-orange-400 font-bold group-hover:underline">
                      + Add
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Flame className="w-8 h-8 text-slate-600 mb-2 opacity-60" />
              <p>No fireworks match your search.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                className="mt-2 text-orange-400 font-semibold hover:underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>

        {false && cart.length > 0 && (
          <div className="lg:hidden absolute bottom-2 left-2 right-2 p-2 bg-slate-900/95 border border-orange-500/50 backdrop-blur-md text-white rounded-2xl shadow-2xl flex items-center justify-between gap-2 z-20 animate-in slide-in-from-bottom-2">
            <div className="pl-1.5 min-w-0">
              <p className="text-xs font-black truncate">{cart.length} Items in Cart</p>
              <p className="text-xs font-mono font-bold text-orange-400">Total: ₹{cartTotals.grandTotal.toLocaleString('en-IN')}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setMobileTab('CART')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                <span>Cart</span>
              </button>
              <button
                onClick={handleCompleteBill}
                className="px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-md shadow-orange-950 flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>GENERATE BILL</span>
              </button>
            </div>
          </div>

        )}
      </div>
      )}

      {/* RIGHT COLUMN: POS Billing Cart & Terminal */}
      {(!isMobileViewport || mobileTab === 'CART') && (
      <div
        id="mobile-cart-panel"
        className={`${
          mobileTab === 'CART' ? 'flex' : 'hidden lg:flex'
        } w-full lg:w-[420px] xl:w-[460px] flex-col h-full min-h-0 overflow-y-auto bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 shrink-0 pb-20 lg:pb-0`}
      >
        {/* Customer Selector & Quick Add */}
        <div className="p-2.5 sm:p-3 border-b border-slate-800 bg-slate-900/95 shrink-0 flex items-center justify-between gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Customer (F4)
            </label>
            <div className="flex items-center gap-1.5">
              <select
                id="pos-customer-select"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-medium focus:outline-hidden focus:border-orange-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.currentDue > 0 ? `(Due: ₹${c.currentDue})` : ''} - {c.mobile}
                  </option>
                ))}
              </select>

              <button
                id="btn-pos-add-customer"
                onClick={() => setIsNewCustModalOpen(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700 rounded-lg transition-colors shrink-0"
                title="Add New Customer (F4)"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Held Bills Counter (Desktop) */}
          {heldBills.length > 0 && (
            <button
              id="btn-recall-held-bills"
              onClick={() => setIsHeldBillsOpen(true)}
              className="hidden lg:flex mt-4 px-2.5 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold items-center gap-1 transition-colors animate-pulse shrink-0"
              title="Recall Held Invoices"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>{heldBills.length} Held</span>
            </button>
          )}
        </div>

        {/* Cart Item Rows */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-2.5 space-y-1.5">
          {cart.map((item) => (
            <div
              key={item.productId}
              id={`cart-item-${item.productId}`}
              className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-100 truncate">{item.product.name}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span>Stock: {item.product.currentStock} {item.product.unit}</span>
                    <span>•</span>
                    <span className="font-mono">Rate: ₹{item.sellingRate}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-white font-mono">₹{item.lineTotal}</span>
                  {item.discountAmount > 0 && (
                    <span className="block text-[9px] text-emerald-400 font-semibold">
                      -₹{item.discountAmount}
                    </span>
                  )}
                </div>
              </div>

              {/* Controls Row: Qty -/+ | Edit Rate | Item Disc % | Delete */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                {/* Qty +/- */}
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateItemQty(item.productId, -1)}
                    className="p-1.5 hover:bg-slate-800 text-slate-300 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => setItemExactQty(item.productId, e.target.value)}
                    className="w-10 text-center bg-transparent text-xs font-mono font-bold text-white focus:outline-hidden"
                  />
                  <button
                    onClick={() => updateItemQty(item.productId, 1)}
                    className="p-1.5 hover:bg-slate-800 text-slate-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Optional Inline Rate Editing (if permitted) */}
                {billingConfig.allowRateEditing && currentUser?.permissions?.canEditRate && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">₹</span>
                    <input
                      type="number"
                      value={item.sellingRate}
                      onChange={(e) => setItemRate(item.productId, e.target.value)}
                      className="w-14 py-0.5 px-1 bg-slate-900 border border-slate-700 rounded text-center text-xs font-mono text-white focus:outline-hidden"
                      title="Edit Selling Rate"
                    />
                  </div>
                )}

                {/* Optional Item Discount % */}
                {billingConfig.allowDiscountEditing && currentUser?.permissions?.canGiveDiscount && (
                  <div className="flex items-center gap-1">
                    <Percent className="w-3 h-3 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={item.discountPercent || ''}
                      onChange={(e) => setItemDiscount(item.productId, e.target.value)}
                      className="w-10 py-0.5 px-1 bg-slate-900 border border-slate-700 rounded text-center text-xs font-mono text-emerald-400 placeholder-slate-600 focus:outline-hidden"
                      title="Item Discount %"
                    />
                  </div>
                )}

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.productId)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Remove Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Package className="w-7 h-7 text-slate-700 mb-1" />
              <p>Cart is currently empty.</p>
              <button
                onClick={() => setMobileTab('ITEMS')}
                className="mt-2 text-orange-400 font-bold hover:underline lg:hidden"
              >
                ← Browse Fireworks to Add
              </button>
            </div>
          )}
        </div>

        {/* Bill Summary & Payment Section (Pinned at Bottom) */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0 space-y-2 pb-5 lg:pb-3">
          {/* Subtotal & Bill Discount Row */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal ({cart.length} items):</span>
              <span className="font-mono text-slate-200">₹{cartTotals.subtotal}</span>
            </div>

            {/* Bill Level Discount */}
            {billingConfig.allowDiscountEditing && (
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Bill Discount:</span>
                  <div className="flex bg-slate-900 border border-slate-700 rounded p-0.5 text-[10px]">
                    <button
                      onClick={() => setBillDiscountType('PERCENT')}
                      className={`px-1.5 py-0.5 rounded ${
                        billDiscountType === 'PERCENT' ? 'bg-orange-600 text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      %
                    </button>
                    <button
                      onClick={() => setBillDiscountType('FLAT')}
                      className={`px-1.5 py-0.5 rounded ${
                        billDiscountType === 'FLAT' ? 'bg-orange-600 text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      ₹
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={billDiscountValue || ''}
                    onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-16 py-0.5 px-1.5 bg-slate-900 border border-slate-700 rounded text-right text-xs font-mono text-emerald-400 focus:outline-hidden"
                  />
                  {cartTotals.totalDiscount > 0 && (
                    <span className="text-[10px] text-emerald-400 font-mono">
                      (-₹{cartTotals.totalDiscount})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Grand Total Display */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-300">GRAND TOTAL:</span>
              <span className="text-xl font-black text-orange-400 font-mono tracking-tight">
                ₹{cartTotals.grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Payment Method Selector (F8) */}
          <div id="payment-section" className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Mode (F8)</span>
              {selectedCustomer?.currentDue > 0 && (
                <span className="text-[10px] text-amber-400 font-semibold">
                  Prev Due: ₹{selectedCustomer.currentDue}
                </span>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1 text-[11px] font-bold">
              {(['CASH', 'UPI', 'CARD', 'CREDIT', 'MIXED'] as PaymentMethod[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentMethod(mode)}
                  className={`py-1.5 rounded-lg border transition-colors ${
                    paymentMethod === mode
                      ? mode === 'CASH'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                        : mode === 'UPI'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                        : mode === 'CREDIT'
                        ? 'bg-amber-600 border-amber-500 text-white shadow-xs'
                        : 'bg-orange-600 border-orange-500 text-white shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Split / Mixed Payment Fields */}
            {paymentMethod === 'MIXED' && (
              <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Cash Paid ₹</label>
                  <input
                    type="number"
                    value={mixedCash || ''}
                    onChange={(e) => setMixedCash(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">UPI Paid ₹</label>
                  <input
                    type="number"
                    value={mixedUpi || ''}
                    onChange={(e) => setMixedUpi(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white"
                  />
                </div>
              </div>
            )}

            {/* Partial Payment input if not Credit or Mixed */}
            {paymentMethod !== 'CREDIT' && paymentMethod !== 'MIXED' && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Paid Amount:</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">₹</span>
                  <input
                    type="number"
                    placeholder={String(cartTotals.grandTotal)}
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    className="w-24 py-1 px-1.5 bg-slate-900 border border-slate-700 rounded text-right text-xs font-mono text-white focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {dueBalance > 0 && (
              <div className="flex justify-between text-xs font-bold text-rose-400 bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20">
                <span>Remaining Due:</span>
                <span className="font-mono">₹{dueBalance}</span>
              </div>
            )}
          </div>

          {/* Action Buttons: Hold, Clear, Complete */}
          <div id="mobile-action-buttons" className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              id="btn-hold-bill"
              onClick={handleHoldBill}
              className="py-2.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors"
              title="Hold this bill and recall later"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Hold</span>
            </button>

            <button
              id="btn-clear-cart"
              onClick={clearCart}
              className="py-2.5 px-2 bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors"
              title="Clear all cart items"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            <button
              id="btn-complete-sale"
              onClick={handleCompleteBill}
              disabled={cart.length === 0}
              className="col-span-2 py-2.5 px-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-orange-950 flex items-center justify-center gap-1.5 transition-all active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>GENERATE BILL & PRINT (F9)</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL (F4) */}
      {isNewCustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-orange-400" />
                Add New Customer
              </h3>
              <button
                onClick={() => setIsNewCustModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Mobile Number (WhatsApp)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">City / Area</label>
                <input
                  type="text"
                  placeholder="e.g. Sivakasi / Madurai"
                  value={newCustCity}
                  onChange={(e) => setNewCustCity(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECALL HELD BILLS MODAL */}
      {isHeldBillsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-amber-400" />
                Held Invoices ({heldBills.length})
              </h3>
              <button
                onClick={() => setIsHeldBillsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {heldBills.map((h) => {
                const subtotal = h.items.reduce((s, i) => s + i.lineTotal, 0);
                return (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">{h.customerName}</h4>
                      <p className="text-[10px] text-slate-400">
                        {h.items.length} items • Held at {new Date(h.heldAt).toLocaleTimeString()}
                      </p>
                      <p className="text-xs font-mono font-bold text-orange-400 mt-1">₹{subtotal}</p>
                    </div>
                    <button
                      onClick={() => recallHeldBill(h)}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Recall
                    </button>
                  </div>
                );
              })}

              {heldBills.length === 0 && (
                <p className="text-center py-6 text-xs text-slate-500">No held bills found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED SALE RECEIPT MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-4"><h3 className="flex items-center gap-2 text-sm font-bold text-white"><Camera className="h-4 w-4 text-orange-400" />Scan product barcode</h3><button onClick={closeScanner} className="text-slate-400 hover:text-white"><XCircle className="h-5 w-5" /></button></div>
            <div className="relative aspect-video bg-black"><video ref={scannerVideoRef} className="h-full w-full object-cover" muted playsInline /><div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-orange-400 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]"><span className="absolute left-0 right-0 top-1/2 h-0.5 animate-pulse bg-red-500 shadow-[0_0_10px_#ef4444]" /></div></div>
            <p className="px-4 pt-3 text-center text-xs text-slate-400">{scannerMessage}</p>
            <form onSubmit={(event) => { event.preventDefault(); handleManualScan(); }} className="flex gap-2 p-4 pt-2">
              <input value={manualScanValue} onChange={(event) => setManualScanValue(event.target.value)} placeholder="Or type barcode" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-orange-500" />
              <button type="submit" className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white">Add</button>
            </form>
          </div>
        </div>
      )}

      <ReceiptModal
        sale={completedSaleForReceipt}
        isOpen={Boolean(completedSaleForReceipt)}
        onClose={() => setCompletedSaleForReceipt(null)}
      />
    </div>
  );
};
