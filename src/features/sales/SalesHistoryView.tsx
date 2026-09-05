import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Printer,
  Share2,
  Undo2,
  XCircle,
  Eye,
  Filter,
  Calendar,
  IndianRupee,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { WhatsAppService } from '../../services/whatsappService';
import { Sale } from '../../types';
import { useToast } from '../../components/common/Toast';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface Props {
  onOpenReceipt?: (sale: Sale) => void;
  onInitiateReturn?: (sale: Sale) => void;
  onNavigateToReturn?: (sale?: Sale) => void;
}

export const SalesHistoryView: React.FC<Props> = ({
  onOpenReceipt,
  onInitiateReturn,
  onNavigateToReturn,
}) => {
  const { success, error, info } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH'>('TODAY');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<Sale | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const currentUser = StorageService.getCurrentUser();

  const loadSales = () => {
    setSales(StorageService.getSales());
  };

  useEffect(() => {
    loadSales();
    Promise.all([getDocs(collection(db, 'branches')), getDocs(collection(db, 'staff'))]).then(([b, s]) => {
      setBranches(b.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStaff(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    }).catch(() => undefined);
  }, []);

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name || id;
  const visibleStaff = staff.filter((s) => branchFilter === 'ALL' || s.branchId === branchFilter);

  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    return sales.filter((sale) => {
      // Date filter
      if (dateFilter === 'TODAY' && !sale.invoiceDate.startsWith(todayStr)) return false;
      if (dateFilter === 'YESTERDAY' && !sale.invoiceDate.startsWith(yesterdayStr)) return false;
      if (dateFilter === 'THIS_MONTH') {
        const monthPrefix = todayStr.substring(0, 7);
        if (!sale.invoiceDate.startsWith(monthPrefix)) return false;
      }

      // Payment filter
      if (paymentFilter !== 'ALL' && sale.paymentMethod !== paymentFilter) return false;
      if (branchFilter !== 'ALL' && sale.branchId !== branchFilter) return false;
      if (staffFilter !== 'ALL' && sale.staffId !== staffFilter) return false;

      // Text search
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        sale.billNumber.toLowerCase().includes(q) ||
        sale.customerName.toLowerCase().includes(q) ||
        sale.customerMobile.toLowerCase().includes(q)
      );
    });
  }, [sales, dateFilter, paymentFilter, branchFilter, staffFilter, search]);

  const handleCancelBill = (sale: Sale) => {
    if (!currentUser.permissions.canCancelBill) {
      error('Bill cancellation is not allowed for your role.');
      return;
    }

    if (sale.status === 'CANCELLED') {
      info('This bill is already cancelled.');
      return;
    }

    const confirmCancel = window.confirm(
      `Are you sure you want to cancel Bill ${sale.billNumber}? All items will be restored to inventory.`
    );
    if (!confirmCancel) return;

    // 1. Restore Inventory
    for (const item of sale.items) {
      StorageService.updateProductStock(
        item.productId,
        item.quantity,
        'ADJUSTMENT',
        sale.billNumber,
        `Restored from cancelled bill ${sale.billNumber}`,
        currentUser.fullName
      );
    }

    // 2. Adjust Customer Ledger if due existed
    if (sale.dueAmount > 0) {
      const customer = StorageService.getCustomerById(sale.customerId);
      if (customer) {
        customer.currentDue = Math.max(0, (customer.currentDue || 0) - sale.dueAmount);
        StorageService.saveCustomer(customer);
      }
    }

    // 3. Mark Sale as Cancelled
    sale.status = 'CANCELLED';
    sale.updatedAt = new Date().toISOString();
    StorageService.saveSale(sale);

    // 4. Audit Log
    StorageService.logAudit(
      'CANCEL_BILL',
      `Cancelled invoice ${sale.billNumber} for ₹${sale.grandTotal}`,
      sale.billNumber
    );

    loadSales();
    success(`Bill ${sale.billNumber} cancelled & stock restored.`);
  };

  return (
    <div id="sales-history-root" className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto overflow-y-auto h-full flex flex-col">
      {/* Top Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-400" />
              Sales Invoices History
            </h2>
            <p className="text-xs text-slate-400">View, reprint, share, or process returns for retail bills</p>
          </div>

          <div className="text-xs font-mono font-semibold bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-orange-400">
            Total Sales: ₹{filteredSales.reduce((a, b) => a + (b.status !== 'CANCELLED' ? b.grandTotal : 0), 0).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Bill No, Customer, Mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 text-xs"
            />
          </div>

          <select value={branchFilter} onChange={(e)=>{setBranchFilter(e.target.value);setStaffFilter('ALL')}} className="py-2 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"><option value="ALL">All Branches</option>{branches.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <select value={staffFilter} onChange={(e)=>setStaffFilter(e.target.value)} className="py-2 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"><option value="ALL">All Staff</option>{visibleStaff.map((s)=><option key={s.id} value={s.id}>{s.name || 'Unnamed staff'}</option>)}</select>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setDateFilter('TODAY')}
              className={`px-2.5 py-1.5 rounded-md font-semibold ${
                dateFilter === 'TODAY' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('YESTERDAY')}
              className={`px-2.5 py-1.5 rounded-md font-semibold ${
                dateFilter === 'YESTERDAY' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateFilter('THIS_MONTH')}
              className={`px-2.5 py-1.5 rounded-md font-semibold ${
                dateFilter === 'THIS_MONTH' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-md font-semibold ${
                dateFilter === 'ALL' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Payment Method Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="py-2 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium focus:outline-hidden"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="CASH">Cash Only</option>
            <option value="UPI">UPI Only</option>
            <option value="CARD">Card Only</option>
            <option value="CREDIT">Credit (Due) Only</option>
            <option value="MIXED">Mixed Payment</option>
          </select>
        </div>
      </div>

      {/* Sales Invoices List (Mobile Cards + Desktop Table) */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        {/* Mobile View: Clean Invoice Cards */}
        <div className="md:hidden overflow-y-auto flex-1 p-3 space-y-2.5">
          {filteredSales.map((sale) => (
            <div
              key={sale.id}
              className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-orange-400 text-sm">{sale.billNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sale.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : sale.status === 'CANCELLED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(sale.invoiceDate).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Grand Total</span>
                  <span className="font-mono font-bold text-white text-base">₹{sale.grandTotal}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-y border-slate-800/80 text-xs">
                <div>
                  <span className="font-semibold text-slate-200 block">{sale.customerName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{sale.customerMobile || 'Cash Walk-in'}</span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 font-mono">
                    {sale.paymentMethod}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{sale.items.length} items</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setSelectedSaleForDetails(sale)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (onOpenReceipt) onOpenReceipt(sale);
                      else setSelectedSaleForDetails(sale);
                    }}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                  <button
                    onClick={() => WhatsAppService.sendBillViaWhatsApp(sale)}
                    className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors"
                    title="WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  {sale.status === 'COMPLETED' && (
                    <button
                      onClick={() => {
                        if (onInitiateReturn) onInitiateReturn(sale);
                        else if (onNavigateToReturn) onNavigateToReturn(sale);
                      }}
                      className="p-1.5 bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white rounded-lg transition-colors"
                      title="Return"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredSales.length === 0 && (
            <div className="p-8 text-center text-slate-500">No sales invoices found matching filters.</div>
          )}
        </div>

        {/* Desktop View: Full Responsive Table */}
        <div className="hidden md:block overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
              <tr>
                <th className="p-3">Bill No</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items</th>
                <th className="p-3">Mode</th>
                <th className="p-3 text-right">Grand Total</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-right">Due</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 font-mono font-bold text-orange-400">{sale.billNumber}</td>
                  <td className="p-3 text-slate-400">
                    {new Date(sale.invoiceDate).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-100">{sale.customerName}</div>
                    <div className="text-[10px] text-slate-400">{sale.customerMobile}</div>
                  </td>
                  <td className="p-3 font-mono">{sale.items.length} items</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-white">₹{sale.grandTotal}</td>
                  <td className="p-3 text-right font-mono text-emerald-400">₹{sale.paidAmount}</td>
                  <td className="p-3 text-right font-mono">
                    {sale.dueAmount > 0 ? (
                      <span className="font-bold text-rose-400">₹{sale.dueAmount}</span>
                    ) : (
                      <span className="text-slate-500">₹0</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sale.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : sale.status === 'CANCELLED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedSaleForDetails(sale)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (onOpenReceipt) onOpenReceipt(sale);
                          else setSelectedSaleForDetails(sale);
                        }}
                        className="p-1.5 bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white rounded-lg transition-colors"
                        title="Print Thermal 80mm Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => WhatsAppService.sendBillViaWhatsApp(sale)}
                        className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors"
                        title="Share WhatsApp Invoice"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      {sale.status === 'COMPLETED' && (
                        <>
                          <button
                            onClick={() => {
                              if (onInitiateReturn) onInitiateReturn(sale);
                              else if (onNavigateToReturn) onNavigateToReturn(sale);
                            }}
                            className="p-1.5 bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white rounded-lg transition-colors"
                            title="Sales Return"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.permissions?.canCancelBill && (
                            <button
                              onClick={() => handleCancelBill(sale)}
                              className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-colors"
                              title="Cancel Bill & Restore Stock"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No sales invoices found matching selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Details Modal */}
      {selectedSaleForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Invoice Details</h3>
                <p className="text-xs text-orange-400 font-mono">{selectedSaleForDetails.billNumber}</p>
              </div>
              <button
                onClick={() => setSelectedSaleForDetails(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-400 block">Customer</span>
                  <span className="font-bold text-slate-200">{selectedSaleForDetails.customerName}</span>
                  <span className="text-slate-400 block text-[10px]">{selectedSaleForDetails.customerMobile}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Cashier / Date</span>
                  <span className="font-medium text-slate-200">{selectedSaleForDetails.cashierName}</span>
                  <span className="text-slate-400 block text-[10px]">
                    {new Date(selectedSaleForDetails.invoiceDate).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedSaleForDetails.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{it.productName}</td>
                        <td className="p-2 text-center">{it.quantity} {it.unit}</td>
                        <td className="p-2 text-right">₹{it.sellingRate}</td>
                        <td className="p-2 text-right font-bold font-mono">₹{it.lineTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>₹{selectedSaleForDetails.subtotal}</span>
                </div>
                {selectedSaleForDetails.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span>-₹{selectedSaleForDetails.totalDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-white pt-1 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span>₹{selectedSaleForDetails.grandTotal}</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1">
                  <span>Payment ({selectedSaleForDetails.paymentMethod}):</span>
                  <span>Paid: ₹{selectedSaleForDetails.paidAmount}</span>
                </div>
                {selectedSaleForDetails.dueAmount > 0 && (
                  <div className="flex justify-between text-rose-400 font-bold">
                    <span>Balance Due:</span>
                    <span>₹{selectedSaleForDetails.dueAmount}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setSelectedSaleForDetails(null);
                  onOpenReceipt(selectedSaleForDetails);
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print / Share Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
