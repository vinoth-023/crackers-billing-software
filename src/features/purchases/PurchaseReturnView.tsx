import React, { useState, useEffect } from 'react';
import { RotateCcw, Search, CheckCircle2, Truck, AlertCircle } from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Purchase, PurchaseReturnItem, PurchaseReturn } from '../../types';
import { useToast } from '../../components/common/Toast';

export const PurchaseReturnView: React.FC = () => {
  const { success, error, warning } = useToast();

  const [purSearch, setPurSearch] = useState('');
  const [selectedPur, setSelectedPur] = useState<Purchase | null>(null);
  const [returnItems, setReturnItems] = useState<{ [productId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('Damp / Damaged cracker batch received from manufacturer');

  const handleSearchPurchase = () => {
    if (!purSearch.trim()) return;
    const purchases = StorageService.getPurchases();
    const found = purchases.find(
      (p) =>
        p.purchaseNumber.toLowerCase() === purSearch.trim().toLowerCase() ||
        p.supplierInvoiceNo.toLowerCase() === purSearch.trim().toLowerCase()
    );

    if (found) {
      setSelectedPur(found);
      setReturnItems({});
      success(`Loaded Purchase: ${found.purchaseNumber}`);
    } else {
      error(`No purchase entry found matching "${purSearch}"`);
    }
  };

  const handleQtyChange = (productId: string, maxQty: number, valStr: string) => {
    const qty = parseInt(valStr, 10) || 0;
    if (qty < 0) return;
    if (qty > maxQty) {
      warning(`Cannot return more than purchased (${maxQty})`);
      return;
    }
    setReturnItems((prev) => ({ ...prev, [productId]: qty }));
  };

  const totalRefund = selectedPur
    ? selectedPur.items.reduce((acc, it) => {
        const q = returnItems[it.productId] || 0;
        return acc + q * it.purchaseRate;
      }, 0)
    : 0;

  const handleProcessReturn = () => {
    if (!selectedPur) return;

    const items: PurchaseReturnItem[] = [];
    selectedPur.items.forEach((it) => {
      const q = returnItems[it.productId] || 0;
      if (q > 0) {
        items.push({
          productId: it.productId,
          productName: it.productName,
          quantity: q,
          rate: it.purchaseRate,
          totalAmount: q * it.purchaseRate,
          reason: returnReason,
        });
      }
    });

    if (items.length === 0) {
      warning('Please enter return quantity for at least one item.');
      return;
    }

    const returnRecord: PurchaseReturn = {
      id: `pret-${Date.now()}`,
      returnNumber: `PR-${Date.now().toString().slice(-6)}`,
      originalPurchaseId: selectedPur.id,
      originalPurchaseNumber: selectedPur.purchaseNumber,
      supplierId: selectedPur.supplierId,
      supplierName: selectedPur.supplierName,
      date: new Date().toISOString(),
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        rate: item.rate,
        total: item.quantity * item.rate,
        totalAmount: item.quantity * item.rate,
        reason: returnReason,
      })),
      totalAmount: totalRefund,
      refundMethod: 'CREDIT_ADJUSTMENT',
      notes: returnReason,
      createdAt: new Date().toISOString(),
    };

    StorageService.processPurchaseReturn(returnRecord);
    success(`Purchase return saved! Stock reduced and supplier balance adjusted.`);
    setSelectedPur(null);
    setPurSearch('');
    setReturnItems({});
  };

  return (
    <div id="purchase-return-root" className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Purchase Return to Sivakasi Supplier</h2>
            <p className="text-xs text-slate-400">
              Return damaged or defective cracker shipments, deduct warehouse inventory, and reduce supplier due ledger
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={purSearch}
              onChange={(e) => setPurSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchPurchase()}
              placeholder="Enter Purchase No (e.g. PUR-0001) or Supplier Invoice No..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
            />
          </div>
          <button
            onClick={handleSearchPurchase}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
          >
            Find Entry
          </button>
        </div>
      </div>

      {selectedPur ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">PURCHASE NO</span>
              <strong className="text-emerald-400 font-mono text-sm">{selectedPur.purchaseNumber}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">SUPPLIER</span>
              <strong className="text-white">{selectedPur.supplierName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">SUPPLIER INVOICE</span>
              <span className="text-slate-200 font-mono">{selectedPur.supplierInvoiceNo}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">TOTAL PURCHASE</span>
              <strong className="text-white font-mono">₹{selectedPur.grandTotal}</strong>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Return Quantities to Supplier
            </h4>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3 text-center">Purchased</th>
                    <th className="p-3 text-right">Cost Rate</th>
                    <th className="p-3 text-center w-32">Return Qty</th>
                    <th className="p-3 text-right">Return Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {selectedPur.items.map((it) => {
                    const q = returnItems[it.productId] || 0;
                    return (
                      <tr key={it.productId}>
                        <td className="p-3 font-semibold">{it.productName}</td>
                        <td className="p-3 text-center font-mono">{it.quantity} {it.unit}</td>
                        <td className="p-3 text-right font-mono">₹{it.purchaseRate}</td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={it.quantity}
                            value={q || ''}
                            onChange={(e) => handleQtyChange(it.productId, it.quantity, e.target.value)}
                            placeholder="0"
                            className="w-20 p-1.5 bg-slate-950 border border-slate-700 rounded-lg text-center font-bold text-white"
                          />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-400">
                          ₹{q * it.purchaseRate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Return Reason</label>
            <input
              type="text"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block">Total Credit from Supplier:</span>
              <strong className="text-2xl font-black text-rose-400 font-mono">₹{totalRefund}</strong>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPur(null)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 font-medium text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessReturn}
                disabled={totalRefund <= 0}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Process Return to Supplier
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
          <Truck className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400" />
          <p className="font-semibold text-slate-300">No purchase entry loaded.</p>
          <p className="text-slate-500 mt-1">Search a purchase number above to begin return.</p>
        </div>
      )}
    </div>
  );
};
