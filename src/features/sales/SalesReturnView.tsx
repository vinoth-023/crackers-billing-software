import React, { useState, useEffect } from 'react';
import {
  Undo2,
  Search,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Sale, SalesReturnItem, SalesReturn } from '../../types';
import { useToast } from '../../components/common/Toast';

interface Props {
  initialSale?: Sale | null;
  onReturnCompleted?: () => void;
}

export const SalesReturnView: React.FC<Props> = ({ initialSale, onReturnCompleted }) => {
  const { success, error, warning } = useToast();
  const currentUser = StorageService.getCurrentUser();

  const [billSearch, setBillSearch] = useState(initialSale?.billNumber || '');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(initialSale || null);
  const [returnItems, setReturnItems] = useState<{ [productId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('Customer returned unopened boxes');
  const [refundMode, setRefundMode] = useState<'CASH' | 'LEDGER_ADJUSTMENT'>('CASH');

  useEffect(() => {
    if (initialSale) {
      setSelectedSale(initialSale);
      setBillSearch(initialSale.billNumber);
    }
  }, [initialSale]);

  const handleSearchBill = () => {
    if (!billSearch.trim()) return;
    const sale = StorageService.getSaleByBillNumber(billSearch.trim());
    if (sale) {
      if (sale.status === 'CANCELLED') {
        error('Cannot return items from a cancelled bill.');
        return;
      }
      setSelectedSale(sale);
      setReturnItems({});
      success(`Loaded Bill: ${sale.billNumber}`);
    } else {
      error(`No bill found with number "${billSearch}"`);
    }
  };

  const handleQtyChange = (productId: string, maxQty: number, valStr: string) => {
    const qty = parseInt(valStr, 10) || 0;
    if (qty < 0) return;
    if (qty > maxQty) {
      warning(`Cannot return more than purchased quantity (${maxQty})`);
      return;
    }
    setReturnItems((prev) => ({ ...prev, [productId]: qty }));
  };

  // Calculate refund total
  const calculatedRefund = selectedSale
    ? selectedSale.items.reduce((acc, item) => {
        const returnQty = returnItems[item.productId] || 0;
        return acc + returnQty * item.sellingRate;
      }, 0)
    : 0;

  const handleProcessReturn = () => {
    if (!selectedSale) return;

    const itemsToReturn: SalesReturnItem[] = [];
    selectedSale.items.forEach((item) => {
      const returnQty = returnItems[item.productId] || 0;
      if (returnQty > 0) {
        itemsToReturn.push({
          productId: item.productId,
          productName: item.productName,
          quantity: returnQty,
          rate: item.sellingRate,
          totalAmount: returnQty * item.sellingRate,
          reason: returnReason,
        });
      }
    });

    if (itemsToReturn.length === 0) {
      warning('Please enter return quantity for at least one cracker item.');
      return;
    }

    const returnRecord: SalesReturn = {
      id: `sret-${Date.now()}`,
      returnNumber: `SR-${Date.now().toString().slice(-6)}`,
      originalSaleId: selectedSale.id,
      originalBillNumber: selectedSale.billNumber,
      billNumber: selectedSale.billNumber,
      customerId: selectedSale.customerId,
      customerName: selectedSale.customerName,
      date: new Date().toISOString(),
      items: itemsToReturn.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        rate: item.rate,
        total: item.quantity * item.rate,
        totalAmount: item.quantity * item.rate,
        reason: returnReason,
      })),
      totalReturnAmount: calculatedRefund,
      refundMethod: refundMode as any,
      cashierId: currentUser.id,
      cashierName: currentUser.fullName,
      notes: returnReason,
      createdAt: new Date().toISOString(),
    };

    StorageService.processSalesReturn(returnRecord);
    success(`Sales return processed! Stock restored for ${itemsToReturn.length} items.`);
    setSelectedSale(null);
    setBillSearch('');
    setReturnItems({});
    if (onReturnCompleted) onReturnCompleted();
  };

  return (
    <div id="sales-return-root" className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Sales Return & Stock Restoration</h2>
            <p className="text-xs text-slate-400">
              Return items from a previous invoice, adjust customer balance or cash refund, and restore inventory
            </p>
          </div>
        </div>

        {/* Bill Search Bar */}
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={billSearch}
              onChange={(e) => setBillSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchBill()}
              placeholder="Enter Bill Number (e.g. BILL-0001)..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
            />
          </div>
          <button
            onClick={handleSearchBill}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Find Bill
          </button>
        </div>
      </div>

      {selectedSale ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          {/* Bill Summary */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">INVOICE</span>
              <strong className="text-orange-400 font-mono text-sm">{selectedSale.billNumber}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">CUSTOMER</span>
              <strong className="text-white">{selectedSale.customerName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">DATE</span>
              <span className="text-slate-200">{new Date(selectedSale.invoiceDate).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">ORIGINAL TOTAL</span>
              <strong className="text-emerald-400 font-mono">₹{selectedSale.grandTotal}</strong>
            </div>
          </div>

          {/* Items to Return */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Return Quantities
            </h4>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-center">Purchased Qty</th>
                    <th className="p-3 text-right">Selling Rate</th>
                    <th className="p-3 text-center w-32">Return Qty</th>
                    <th className="p-3 text-right">Refund Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {selectedSale.items.map((item) => {
                    const returnQty = returnItems[item.productId] || 0;
                    const itemRefund = returnQty * item.sellingRate;

                    return (
                      <tr key={item.productId} className="hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-slate-100">{item.productName}</td>
                        <td className="p-3 text-center font-mono">{item.quantity} {item.unit}</td>
                        <td className="p-3 text-right font-mono">₹{item.sellingRate}</td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={returnQty || ''}
                            onChange={(e) => handleQtyChange(item.productId, item.quantity, e.target.value)}
                            placeholder="0"
                            className="w-20 p-1.5 bg-slate-950 border border-slate-700 rounded-lg text-center font-bold text-white focus:outline-hidden focus:border-orange-500"
                          />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-orange-400">
                          ₹{itemRefund}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Return Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Return Reason</label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Unopened box / Excess purchase"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Refund Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMode('CASH')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold ${
                    refundMode === 'CASH'
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-700 text-slate-400'
                  }`}
                >
                  Cash Refund
                </button>
                <button
                  type="button"
                  onClick={() => setRefundMode('LEDGER_ADJUSTMENT')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold ${
                    refundMode === 'LEDGER_ADJUSTMENT'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-950 border-slate-700 text-slate-400'
                  }`}
                >
                  Customer Credit (Ledger)
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block">Total Refund:</span>
              <strong className="text-2xl font-black text-orange-400 font-mono">₹{calculatedRefund}</strong>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessReturn}
                disabled={calculatedRefund <= 0}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-950 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Process Return & Restore Stock
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
          <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400" />
          <p className="font-semibold text-slate-300">No invoice currently loaded for return.</p>
          <p className="text-slate-500 mt-1">Search an invoice number above or select return from the Sales Invoices list.</p>
        </div>
      )}
    </div>
  );
};
