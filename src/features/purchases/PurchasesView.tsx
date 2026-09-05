import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Building2,
  Calendar,
  IndianRupee,
  FileText,
  Boxes,
  LayoutGrid,
  List,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Purchase, Supplier, Product, PurchaseItem } from '../../types';
import { useToast } from '../../components/common/Toast';

interface Props {
  onNavigateToReturn?: () => void;
}

export const PurchasesView: React.FC<Props> = ({ onNavigateToReturn }) => {
  const { success, error, warning } = useToast();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [viewLayout, setViewLayout] = useState<'AUTO' | 'TABLE' | 'CARDS'>('AUTO');
  const [searchQuery, setSearchQuery] = useState('');

  // Entry Mode
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  // Cart / Items in Purchase
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [itemQty, setItemQty] = useState<number>(10);
  const [itemRate, setItemRate] = useState<number>(0);
  const [itemSellingRate, setItemSellingRate] = useState<number>(0);
  const [itemMrp, setItemMrp] = useState<number>(0);
  const [itemDiscount, setItemDiscount] = useState<number>(0);

  // Payment
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CREDIT'>('CREDIT');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  const currentUser = StorageService.getCurrentUser();

  const loadData = () => {
    setPurchases(StorageService.getPurchases());
    const supList = StorageService.getSuppliers();
    setSuppliers(supList);
    if (supList.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(supList[0].id);
    }
    const prodList = StorageService.getProducts();
    setProducts(prodList);
    if (prodList.length > 0 && !selectedProdId) {
      setSelectedProdId(prodList[0].id);
      setItemRate(prodList[0].purchaseRate);
      setItemSellingRate(prodList[0].sellingRate);
      setItemMrp(prodList[0].mrp);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductSelectChange = (id: string) => {
    setSelectedProdId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      setItemRate(p.purchaseRate);
      setItemSellingRate(p.sellingRate);
      setItemMrp(p.mrp);
    }
  };

  const handleAddItemToPurchase = () => {
    const prod = products.find((x) => x.id === selectedProdId);
    if (!prod) return;
    if (itemQty <= 0) {
      error('Quantity must be greater than 0');
      return;
    }

    const lineTotal = itemQty * itemRate - itemDiscount;

    const newItem: PurchaseItem = {
      productId: prod.id,
      productName: prod.name,
      quantity: itemQty,
      unit: prod.unit,
      purchaseRate: itemRate,
      mrp: itemMrp || prod.mrp,
      sellingRate: itemSellingRate || prod.sellingRate,
      discountAmount: itemDiscount,
      lineTotal: Math.max(0, lineTotal),
    };

    setPurchaseItems((prev) => [...prev, newItem]);
    setItemDiscount(0);
    success(`Added ${prod.name} (${itemQty} ${prod.unit})`);
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = purchaseItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const grandTotal = subtotal;
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();

    if (purchaseItems.length === 0) {
      error('Please add at least one product item.');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supplier) {
      error('Please select a supplier.');
      return;
    }

    const purchaseData: Purchase = {
      id: `pur-${Date.now()}`,
      purchaseNumber: `PUR-${Date.now().toString().slice(-6)}`,
      supplierInvoiceNo: supplierInvoiceNo.trim() || `INV-${Date.now().toString().slice(-4)}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      purchaseDate: new Date(purchaseDate).toISOString(),
      items: purchaseItems,
      subtotal,
      discount: 0,
      totalDiscount: 0,
      grandTotal,
      paidAmount: paymentMode === 'CREDIT' ? 0 : paidAmount,
      dueAmount: paymentMode === 'CREDIT' ? grandTotal : dueAmount,
      paymentMethod: paymentMode as any,
      status: 'RECEIVED',
      notes: purchaseNotes,
      createdAt: new Date().toISOString(),
    };

    StorageService.savePurchase(purchaseData);

    // Update stock for all items
    for (const item of purchaseItems) {
      StorageService.updateProductStock(
        item.productId,
        item.quantity,
        'PURCHASE',
        purchaseData.purchaseNumber,
        `Supplier Invoice ${purchaseData.supplierInvoiceNo}`,
        currentUser.fullName
      );
    }

    // Ledger entry if credit or partial payment
    if (purchaseData.dueAmount > 0) {
      const newBal = (supplier.currentDue || 0) + purchaseData.dueAmount;
      StorageService.addSupplierLedgerEntry({
        id: `sled-${Date.now()}`,
        supplierId: supplier.id,
        date: purchaseData.purchaseDate,
        type: 'PURCHASE',
        referenceId: purchaseData.id,
        referenceNo: purchaseData.purchaseNumber,
        debit: 0,
        credit: purchaseData.dueAmount,
        balance: newBal,
        notes: `Purchase inv ${purchaseData.supplierInvoiceNo}`,
        createdAt: new Date().toISOString(),
      });
    }

    success(`Purchase ${purchaseData.purchaseNumber} recorded! Stock added.`);
    setIsEntryOpen(false);
    setPurchaseItems([]);
    setSupplierInvoiceNo('');
    setPaidAmount(0);
    setPurchaseNotes('');
    loadData();
  };

  const totalPurchasesAmount = purchases.reduce((acc, p) => acc + (p.grandTotal || 0), 0);
  const totalPaidAmount = purchases.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
  const totalDueAmount = purchases.reduce((acc, p) => acc + (p.dueAmount || 0), 0);

  const filteredPurchases = purchases.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.purchaseNumber?.toLowerCase().includes(q) ||
      p.supplierName?.toLowerCase().includes(q) ||
      p.supplierInvoiceNo?.toLowerCase().includes(q)
    );
  });

  return (
    <div id="purchases-view-root" className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto overflow-y-auto h-full flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Purchase Entry & Supplier Invoices</h2>
              <p className="text-xs text-slate-400">
                Log purchases from Sivakasi manufacturers, auto-increase stock, and track supplier dues
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEntryOpen(!isEntryOpen)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-colors w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              {isEntryOpen ? 'Close Entry Form' : 'New Purchase Entry'}
            </button>
          </div>
        </div>
      </div>

      {/* KEY METRICS & TOTALS BANNER (Visible on Mobile, Tablet & Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl">
          <span className="text-[11px] text-slate-400 block font-medium">TOTAL INWARD PURCHASES</span>
          <span className="text-base sm:text-xl font-bold font-mono text-white mt-1 block">
            ₹{totalPurchasesAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{purchases.length} total supplier invoices</span>
        </div>

        <div className="bg-slate-900 border border-emerald-900/40 p-3 sm:p-4 rounded-xl">
          <span className="text-[11px] text-emerald-400 block font-medium">TOTAL PAID TO SUPPLIERS</span>
          <span className="text-base sm:text-xl font-bold font-mono text-emerald-400 mt-1 block">
            ₹{totalPaidAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Cash / UPI / Bank settled</span>
        </div>

        <div className="bg-slate-900 border border-rose-900/40 p-3 sm:p-4 rounded-xl">
          <span className="text-[11px] text-rose-400 block font-medium">OUTSTANDING SUPPLIER DUE</span>
          <span className="text-base sm:text-xl font-bold font-mono text-rose-400 mt-1 block">
            ₹{totalDueAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Pending payment to factories</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl">
          <span className="text-[11px] text-slate-400 block font-medium">REGISTERED SUPPLIERS</span>
          <span className="text-base sm:text-xl font-bold font-mono text-orange-400 mt-1 block">
            {suppliers.length} Factories
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Sivakasi & Local Distributors</span>
        </div>
      </div>

      {/* New Purchase Entry Form */}
      {isEntryOpen && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in duration-200">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Truck className="w-4 h-4" />
            Record Supplier Cracker Purchase
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Supplier *</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city}) {s.currentDue > 0 ? `- Due: ₹${s.currentDue}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Supplier Invoice No</label>
              <input
                type="text"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                placeholder="e.g. SIV-9842"
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>
          </div>

          {/* Add Item Row */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase">Add Cracker to Purchase</h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
              <div className="col-span-2">
                <label className="text-slate-400 block mb-0.5">Select Cracker</label>
                <select
                  value={selectedProdId}
                  onChange={(e) => handleProductSelectChange(e.target.value)}
                  className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.currentStock} {p.unit} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={itemQty}
                  onChange={(e) => setItemQty(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5">Purchase Rate ₹</label>
                <input
                  type="number"
                  min="0"
                  value={itemRate}
                  onChange={(e) => setItemRate(parseFloat(e.target.value) || 0)}
                  className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5">Selling Rate ₹</label>
                <input
                  type="number"
                  min="0"
                  value={itemSellingRate}
                  onChange={(e) => setItemSellingRate(parseFloat(e.target.value) || 0)}
                  className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-orange-400"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddItemToPurchase}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
                >
                  + Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Items Table */}
          {purchaseItems.length > 0 && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-2.5">Item Name</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Purchase Rate</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {purchaseItems.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-medium">{it.productName}</td>
                      <td className="p-2.5 text-center font-mono">{it.quantity} {it.unit}</td>
                      <td className="p-2.5 text-right font-mono">₹{it.purchaseRate}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-white">₹{it.lineTotal}</td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payment & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs border-t border-slate-800">
            <div className="space-y-2">
              <label className="text-slate-300 font-semibold block">Payment Mode</label>
              <div className="grid grid-cols-4 gap-1 font-bold">
                {['CREDIT', 'CASH', 'UPI', 'BANK_TRANSFER'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode as any)}
                    className={`py-1.5 rounded-lg border text-[10px] ${
                      paymentMode === mode
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                  >
                    {mode.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {paymentMode !== 'CREDIT' && (
                <div>
                  <label className="text-slate-400 block mb-0.5">Paid Amount ₹</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1 text-right">
              <div className="flex justify-between text-slate-400">
                <span>Grand Total:</span>
                <strong className="text-base text-white font-mono">₹{grandTotal}</strong>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Paid Now:</span>
                <strong className="font-mono">₹{paymentMode === 'CREDIT' ? 0 : paidAmount}</strong>
              </div>
              <div className="flex justify-between text-rose-400 font-bold">
                <span>Balance Due to Supplier:</span>
                <strong className="font-mono">₹{paymentMode === 'CREDIT' ? grandTotal : dueAmount}</strong>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEntryOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePurchase}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950"
                >
                  Save Purchase Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchases History Filter & Layout Controls */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search purchases by supplier, invoice #, or purchase number..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-[11px] text-slate-400 font-medium mr-1">View:</span>
          <button
            onClick={() => setViewLayout('TABLE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewLayout === 'TABLE'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
          <button
            onClick={() => setViewLayout('CARDS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewLayout === 'CARDS'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewLayout('AUTO')}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-colors ${
              viewLayout === 'AUTO'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-300'
            }`}
          >
            Auto
          </button>
        </div>
      </div>

      {/* Purchases History List (Mobile Cards + Desktop Table + Toggleable) */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[300px]">
        {/* CARDS VIEW */}
        {(viewLayout === 'CARDS' || viewLayout === 'AUTO') && (
          <div className={`${viewLayout === 'AUTO' ? 'md:hidden' : ''} overflow-y-auto flex-1 p-3 space-y-2.5`}>
            {filteredPurchases.map((pur) => (
              <div
                key={pur.id}
                className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400 text-sm">{pur.purchaseNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {pur.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(pur.purchaseDate).toLocaleDateString('en-IN')} • Inv: {pur.supplierInvoiceNo || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Grand Total</span>
                    <span className="font-mono font-bold text-white text-base">₹{pur.grandTotal}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-y border-slate-800/80 text-xs">
                  <div>
                    <span className="font-bold text-slate-200 block">{pur.supplierName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{pur.items.length} items received</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-emerald-400 block text-xs">Paid: ₹{pur.paidAmount}</span>
                    {pur.dueAmount > 0 ? (
                      <span className="text-rose-400 font-bold text-xs block">Due: ₹{pur.dueAmount}</span>
                    ) : (
                      <span className="text-slate-500 text-[10px] block">Settled</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredPurchases.length === 0 && (
              <div className="p-8 text-center text-slate-500">No purchase entries found.</div>
            )}
          </div>
        )}

        {/* TABLE VIEW */}
        {(viewLayout === 'TABLE' || viewLayout === 'AUTO') && (
          <div className={`${viewLayout === 'AUTO' ? 'hidden md:block' : ''} overflow-x-auto overflow-y-auto flex-1`}>
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold sticky top-0 z-10">
                <tr>
                  <th className="p-3">Purchase No</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Supplier Inv</th>
                  <th className="p-3">Items</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Due</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredPurchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-emerald-400">{pur.purchaseNumber}</td>
                    <td className="p-3 text-slate-400">
                      {new Date(pur.purchaseDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3 font-semibold text-slate-100">{pur.supplierName}</td>
                    <td className="p-3 font-mono text-slate-400">{pur.supplierInvoiceNo}</td>
                    <td className="p-3 font-mono">{pur.items.length} items</td>
                    <td className="p-3 text-right font-mono font-bold text-white">₹{pur.grandTotal}</td>
                    <td className="p-3 text-right font-mono text-emerald-400">₹{pur.paidAmount}</td>
                    <td className="p-3 text-right font-mono text-rose-400 font-bold">₹{pur.dueAmount}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {pur.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No purchase entries logged yet. Click "New Purchase Entry" to receive stock.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
