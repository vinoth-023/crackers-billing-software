import React, { useState, useEffect, useMemo } from 'react';
import { Lock, Calculator, CheckCircle2, AlertCircle, History, Printer, IndianRupee, ShieldCheck } from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { DayClosing, Sale, Expense, CustomerLedgerEntry, SupplierLedgerEntry } from '../../types';
import { useToast } from '../../components/common/Toast';

export const DayClosingView: React.FC = () => {
  const { success, error, warning } = useToast();

  const [closings, setClosings] = useState<DayClosing[]>([]);
  const [openingCash, setOpeningCash] = useState<number>(2000);
  const [closingNotes, setClosingNotes] = useState('');

  // Cash Denominations
  const [c500, setC500] = useState<number>(0);
  const [c200, setC200] = useState<number>(0);
  const [c100, setC100] = useState<number>(0);
  const [c50, setC50] = useState<number>(0);
  const [c20, setC20] = useState<number>(0);
  const [c10, setC10] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);

  const currentUser = StorageService.getCurrentUser();

  const loadClosings = () => {
    setClosings(StorageService.getDayClosings());
  };

  useEffect(() => {
    loadClosings();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Today's Sales
  const todaysSales = useMemo(() => {
    return StorageService.getSales().filter((s) => s.invoiceDate.startsWith(todayStr) && s.status !== 'CANCELLED');
  }, [todayStr]);

  const totalSalesRevenue = todaysSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalCashSales = todaysSales
    .filter((s) => s.paymentMethod === 'CASH')
    .reduce((acc, s) => acc + s.paidAmount, 0);
  const totalUpiSales = todaysSales
    .filter((s) => s.paymentMethod === 'UPI')
    .reduce((acc, s) => acc + s.paidAmount, 0);
  const totalCardSales = todaysSales
    .filter((s) => s.paymentMethod === 'CARD')
    .reduce((acc, s) => acc + s.paidAmount, 0);
  const totalCreditSales = todaysSales
    .filter((s) => s.paymentMethod === 'CREDIT' || s.dueAmount > 0)
    .reduce((acc, s) => acc + s.dueAmount, 0);

  // Today's Expenses paid via Cash
  const todaysExpenses = useMemo(() => {
    return StorageService.getExpenses().filter((e) => e.date.startsWith(todayStr));
  }, [todayStr]);
  const totalCashExpenses = todaysExpenses
    .filter((e) => e.paymentMethod === 'CASH')
    .reduce((acc, e) => acc + e.amount, 0);

  // Today's Customer Dues Collected in Cash
  const todaysCustomerCashDues = useMemo(() => {
    return StorageService.getCustomerLedgers()
      .filter((l) => l.createdAt.startsWith(todayStr) && l.type === 'PAYMENT_RECEIVED')
      .reduce((acc, l) => acc + l.credit, 0);
  }, [todayStr]);

  // Total Expected Physical Cash
  const totalCashInflow = openingCash + totalCashSales + todaysCustomerCashDues;
  const totalCashOutflow = totalCashExpenses;
  const expectedCashInDrawer = totalCashInflow - totalCashOutflow;

  // Actual Physical Count
  const actualCashCounted =
    c500 * 500 + c200 * 200 + c100 * 100 + c50 * 50 + c20 * 20 + c10 * 10 + coins;

  const cashDifference = actualCashCounted - expectedCashInDrawer;

  const handleSaveDayClose = (e: React.FormEvent) => {
    e.preventDefault();

    if (actualCashCounted === 0) {
      const confirmZero = window.confirm('You have entered ₹0 for counted physical cash. Continue?');
      if (!confirmZero) return;
    }

    const newClosing: DayClosing = {
      id: `close-${Date.now()}`,
      closingDate: new Date().toISOString(),
      openingCash,
      openingCashBalance: openingCash,
      totalSalesAmount: totalSalesRevenue,
      cashSales: totalCashSales,
      upiSales: totalUpiSales,
      cardSales: totalCardSales,
      creditSales: totalCreditSales,
      cashExpenses: totalCashExpenses,
      totalExpenseAmount: totalCashExpenses,
      cashCollectedFromDues: todaysCustomerCashDues,
      expectedCashInDrawer,
      actualCashInDrawer: actualCashCounted,
      actualPhysicalCash: actualCashCounted,
      difference: cashDifference,
      totalBillsCount: todaysSales.length,
      totalInvoicesCount: todaysSales.length,
      closedBy: currentUser.fullName,
      closedAt: new Date().toISOString(),
      isClosed: true,
      notes: closingNotes,
      status: 'CLOSED',
    };

    StorageService.saveDayClosing(newClosing);
    success(`Day Closing locked for ${todayStr}! Total Turnover: ₹${totalSalesRevenue}`);
    loadClosings();
  };

  return (
    <div id="day-closing-root" className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Daily Register Balancing & Day Close</h2>
            <p className="text-xs text-slate-400">
              Count cash drawer, balance daily UPI/Cash transactions, and lock register for the day
            </p>
          </div>
        </div>

        <div className="text-xs font-mono font-bold bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-slate-300">
          DATE: {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* Main Closing Worksheet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Summary of Transactions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Calculator className="w-4 h-4 text-orange-400" />
            Today's System Cash Flow Summary
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">TOTAL INVOICES</span>
              <strong className="text-base text-white font-mono">{todaysSales.length} Bills</strong>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">TOTAL SALES TURNOVER</span>
              <strong className="text-base text-orange-400 font-mono">₹{totalSalesRevenue}</strong>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">UPI / QR RECEIPTS</span>
              <strong className="text-base text-sky-400 font-mono">₹{totalUpiSales}</strong>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">UNPAID CREDIT SALES</span>
              <strong className="text-base text-amber-400 font-mono">₹{totalCreditSales}</strong>
            </div>
          </div>

          <div className="divide-y divide-slate-800 text-xs bg-slate-950 rounded-xl border border-slate-800 p-3 space-y-2">
            <div className="flex justify-between pt-1">
              <span className="text-slate-300 font-medium">Opening Cash In Hand (Morning Float):</span>
              <input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                className="w-28 p-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-white text-xs font-bold"
              />
            </div>

            <div className="flex justify-between pt-2 text-slate-300">
              <span>(+) Direct Cash Sales at Counter:</span>
              <strong className="font-mono text-emerald-400">₹{totalCashSales}</strong>
            </div>

            <div className="flex justify-between pt-2 text-slate-300">
              <span>(+) Customer Credit Dues Recovered (Cash):</span>
              <strong className="font-mono text-emerald-400">₹{todaysCustomerCashDues}</strong>
            </div>

            <div className="flex justify-between pt-2 text-slate-400">
              <span>(-) Cash Expenses Paid from Drawer:</span>
              <strong className="font-mono text-rose-400">-₹{totalCashExpenses}</strong>
            </div>

            <div className="flex justify-between pt-3 text-sm font-bold text-white border-t-2 border-slate-700">
              <span>EXPECTED PHYSICAL CASH IN DRAWER:</span>
              <strong className="font-mono text-base text-orange-400">₹{expectedCashInDrawer}</strong>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Day Close Notes / Handover Signoff</label>
            <textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="e.g. Cash handed over to owner locker. All counter receipts tallied."
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white h-16"
            />
          </div>
        </div>

        {/* Right: Physical Denomination Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              Physical Cash Denominations
            </h3>

            <div className="space-y-1.5 pt-2 text-xs">
              {[
                { label: '₹500 Notes', val: c500, setVal: setC500, mult: 500 },
                { label: '₹200 Notes', val: c200, setVal: setC200, mult: 200 },
                { label: '₹100 Notes', val: c100, setVal: setC100, mult: 100 },
                { label: '₹50 Notes', val: c50, setVal: setC50, mult: 50 },
                { label: '₹20 Notes', val: c20, setVal: setC20, mult: 20 },
                { label: '₹10 Notes', val: c10, setVal: setC10, mult: 10 },
              ].map((d) => (
                <div key={d.mult} className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 w-24">{d.label}</span>
                  <input
                    type="number"
                    min="0"
                    value={d.val || ''}
                    onChange={(e) => d.setVal(parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    className="w-16 p-1 bg-slate-950 border border-slate-700 rounded text-center font-mono text-white text-xs"
                  />
                  <span className="text-slate-300 font-mono w-16 text-right">₹{d.val * d.mult}</span>
                </div>
              ))}

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                <span className="text-slate-400 w-24">Coins & Change</span>
                <input
                  type="number"
                  min="0"
                  value={coins || ''}
                  onChange={(e) => setCoins(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-16 p-1 bg-slate-950 border border-slate-700 rounded text-center font-mono text-white text-xs"
                />
                <span className="text-slate-300 font-mono w-16 text-right">₹{coins}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Actual Counted Cash:</span>
              <strong className="text-sm font-black text-white font-mono">₹{actualCashCounted}</strong>
            </div>

            <div className="flex justify-between text-xs font-bold">
              <span>Difference:</span>
              <span
                className={`font-mono ${
                  cashDifference === 0
                    ? 'text-emerald-400'
                    : cashDifference > 0
                    ? 'text-sky-400'
                    : 'text-rose-400'
                }`}
              >
                {cashDifference === 0 ? 'Exact Match (₹0)' : cashDifference > 0 ? `+₹${cashDifference} (Excess)` : `-₹${Math.abs(cashDifference)} (Shortage)`}
              </span>
            </div>

            <button
              onClick={handleSaveDayClose}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-950 transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" /> Lock & Save Day Close
            </button>
          </div>
        </div>
      </div>

      {/* Past Day Closings Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-2 p-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <History className="w-4 h-4 text-slate-400" /> Past Day Closing Records
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5 text-center">Bills</th>
                <th className="p-2.5 text-right">Total Sales</th>
                <th className="p-2.5 text-right">Cash Inflow</th>
                <th className="p-2.5 text-right">Expenses</th>
                <th className="p-2.5 text-right">Expected Cash</th>
                <th className="p-2.5 text-right">Actual Counted</th>
                <th className="p-2.5 text-right">Diff</th>
                <th className="p-2.5">Closed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {closings.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40">
                  <td className="p-2.5 text-slate-400">
                    {new Date(c.closingDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="p-2.5 text-center font-mono">{c.totalInvoicesCount}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-white">₹{c.totalSalesAmount}</td>
                  <td className="p-2.5 text-right font-mono text-emerald-400">₹{c.cashSales}</td>
                  <td className="p-2.5 text-right font-mono text-rose-400">₹{c.totalExpenseAmount}</td>
                  <td className="p-2.5 text-right font-mono text-slate-300">₹{c.expectedCashInDrawer}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-white">₹{c.actualPhysicalCash}</td>
                  <td className="p-2.5 text-right font-mono font-bold">
                    {c.difference === 0 ? (
                      <span className="text-emerald-400">₹0</span>
                    ) : c.difference > 0 ? (
                      <span className="text-sky-400">+{c.difference}</span>
                    ) : (
                      <span className="text-rose-400">{c.difference}</span>
                    )}
                  </td>
                  <td className="p-2.5 text-slate-400">{c.closedBy}</td>
                </tr>
              ))}
              {closings.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    No past day closings recorded yet. Complete your first day close above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
