import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  IndianRupee,
  TrendingUp,
  Boxes,
  PieChart as PieIcon,
  Users,
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Sale, Product, Expense, Purchase, Customer } from '../../types';
import { useToast } from '../../components/common/Toast';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

export const ReportsView: React.FC = () => {
  const { success } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [activeReport, setActiveReport] = useState<'PROFIT_LOSS' | 'ITEM_SALES' | 'STOCK_VALUATION' | 'CUSTOMER_DUES'>('PROFIT_LOSS');
  const [dateRange, setDateRange] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL'>('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [branches, setBranches] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    setSales(StorageService.getSales());
    setProducts(StorageService.getProducts());
    setExpenses(StorageService.getExpenses());
    setPurchases(StorageService.getPurchases());
    setCustomers(StorageService.getCustomers());
    Promise.all([getDocs(collection(db, 'branches')), getDocs(collection(db, 'staff'))]).then(([b, s]) => {
      setBranches(b.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStaff(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    }).catch(() => undefined);
  }, []);

  const visibleStaff = staff.filter((s) => branchFilter === 'ALL' || s.branchId === branchFilter);

  const filteredSales = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    return sales.filter((s) => {
      if (s.status === 'CANCELLED') return false;
      if (branchFilter !== 'ALL' && s.branchId !== branchFilter) return false;
      if (staffFilter !== 'ALL' && s.staffId !== staffFilter) return false;
      if (dateRange === 'TODAY') return s.invoiceDate.startsWith(todayStr);
      if (dateRange === 'THIS_MONTH') return s.invoiceDate.startsWith(monthStr);
      return true;
    });
  }, [sales, dateRange, branchFilter, staffFilter]);

  const filteredExpenses = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    return expenses.filter((e) => {
      if (dateRange === 'TODAY') return e.date.startsWith(todayStr);
      if (dateRange === 'THIS_MONTH') return e.date.startsWith(monthStr);
      return true;
    });
  }, [expenses, dateRange]);

  // Profit Loss Calculations
  const grossSalesRevenue = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalCostOfGoodsSold = filteredSales.reduce((acc, s) => {
    const cogs = s.items.reduce((itemSum, it) => itemSum + it.quantity * it.purchaseRate, 0);
    return acc + cogs;
  }, 0);
  const totalItemProfits = grossSalesRevenue - totalCostOfGoodsSold;
  const totalOperatingExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netOperatingProfit = totalItemProfits - totalOperatingExpenses;

  // Item Sales Aggregation
  const itemSummary = useMemo(() => {
    const map: { [prodId: string]: { name: string; category: string; qty: number; revenue: number; profit: number } } = {};
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        if (!map[it.productId]) {
          const product = products.find((p) => p.id === it.productId);
          map[it.productId] = {
            name: it.productName,
            category: product?.categoryName || 'Crackers',
            qty: 0,
            revenue: 0,
            profit: 0,
          };
        }
        map[it.productId].qty += it.quantity;
        map[it.productId].revenue += it.lineTotal;
        map[it.productId].profit += (it.sellingRate - it.purchaseRate) * it.quantity - it.discountAmount;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, products]);

  // Stock Valuation Summary
  const stockValuation = useMemo(() => {
    return products.map((p) => {
      const costVal = (p.currentStock > 0 ? p.currentStock : 0) * p.purchaseRate;
      const retailVal = (p.currentStock > 0 ? p.currentStock : 0) * p.sellingRate;
      const potentialProfit = retailVal - costVal;
      return { ...p, costVal, retailVal, potentialProfit };
    });
  }, [products]);

  const totalCostStockVal = stockValuation.reduce((acc, p) => acc + p.costVal, 0);
  const totalRetailStockVal = stockValuation.reduce((acc, p) => acc + p.retailVal, 0);

  // Customer Dues Summary
  const dueCustomers = customers.filter((c) => c.currentDue > 0);
  const totalDueAmount = dueCustomers.reduce((acc, c) => acc + c.currentDue, 0);

  // CSV Export Helper
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (activeReport === 'PROFIT_LOSS') {
      csvContent += 'Metric,Amount (INR)\n';
      csvContent += `Gross Sales Revenue,${grossSalesRevenue}\n`;
      csvContent += `Cost of Goods Sold (COGS),${totalCostOfGoodsSold}\n`;
      csvContent += `Gross Profit,${totalItemProfits}\n`;
      csvContent += `Operating Expenses,${totalOperatingExpenses}\n`;
      csvContent += `Net Profit,${netOperatingProfit}\n`;
    } else if (activeReport === 'ITEM_SALES') {
      csvContent += 'Item Name,Category,Quantity Sold,Revenue (INR),Profit (INR)\n';
      itemSummary.forEach((it) => {
        csvContent += `"${it.name}","${it.category}",${it.qty},${it.revenue},${it.profit}\n`;
      });
    } else if (activeReport === 'STOCK_VALUATION') {
      csvContent += 'Product,Barcode,Stock Qty,Cost Rate,Cost Valuation,Retail Rate,Retail Valuation\n';
      stockValuation.forEach((p) => {
        csvContent += `"${p.name}","${p.barcode}",${p.currentStock},${p.purchaseRate},${p.costVal},${p.sellingRate},${p.retailVal}\n`;
      });
    } else if (activeReport === 'CUSTOMER_DUES') {
      csvContent += 'Customer Name,Mobile,City,Outstanding Due (INR)\n';
      dueCustomers.forEach((c) => {
        csvContent += `"${c.name}","${c.mobile}","${c.city}",${c.currentDue}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fireworks_${activeReport.toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Report exported to CSV!');
  };

  return (
    <div id="reports-view-root" className="p-2.5 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 max-w-7xl mx-auto overflow-y-auto h-full flex flex-col">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">Business Analytics & Profit Reports</h2>
              <p className="text-xs text-slate-400">Financial statements, inventory valuation, and customer credit aging</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select value={branchFilter} onChange={(e)=>{setBranchFilter(e.target.value);setStaffFilter('ALL')}} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"><option value="ALL">All Branches</option>{branches.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <select value={staffFilter} onChange={(e)=>setStaffFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"><option value="ALL">All Staff</option>{visibleStaff.map((s)=><option key={s.id} value={s.id}>{s.name || 'Unnamed staff'}</option>)}</select>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Report Selector Tabs & Range */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg p-0.5 overflow-x-auto max-w-full no-scrollbar">
            <button
              onClick={() => setActiveReport('PROFIT_LOSS')}
              className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                activeReport === 'PROFIT_LOSS' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Profit & Loss Statement
            </button>
            <button
              onClick={() => setActiveReport('ITEM_SALES')}
              className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                activeReport === 'ITEM_SALES' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Item-wise Sales Volume
            </button>
            <button
              onClick={() => setActiveReport('STOCK_VALUATION')}
              className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                activeReport === 'STOCK_VALUATION' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Stock Valuation
            </button>
            <button
              onClick={() => setActiveReport('CUSTOMER_DUES')}
              className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                activeReport === 'CUSTOMER_DUES' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Customer Credit Dues
            </button>
          </div>

          {(activeReport === 'PROFIT_LOSS' || activeReport === 'ITEM_SALES') && (
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium focus:outline-hidden"
            >
              <option value="TODAY">Today's Activity</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="ALL">All Time History</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Report Content */}
      <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col p-2.5 sm:p-4">
        {activeReport === 'PROFIT_LOSS' && (
          <div className="max-w-2xl mx-auto w-full space-y-4 my-auto">
            <h3 className="text-base font-bold text-white text-center pb-2 border-b border-slate-800">
              Retail Profit & Loss Summary ({dateRange.replace('_', ' ')})
            </h3>

            <div className="divide-y divide-slate-800 text-xs bg-slate-950 rounded-2xl border border-slate-800 p-3 sm:p-4">
              <div className="flex justify-between py-2 text-slate-300">
                <span>(+) Gross Sales Turnover ({filteredSales.length} bills):</span>
                <strong className="text-white font-mono text-sm">₹{grossSalesRevenue.toLocaleString('en-IN')}</strong>
              </div>

              <div className="flex justify-between py-2 text-slate-400">
                <span>(-) Cost of Goods Sold (Purchase Cost of Items Sold):</span>
                <strong className="text-slate-300 font-mono">₹{totalCostOfGoodsSold.toLocaleString('en-IN')}</strong>
              </div>

              <div className="flex justify-between py-2 text-emerald-400 font-bold">
                <span>(=) Gross Profit from Cracker Sales:</span>
                <strong className="font-mono text-sm">₹{totalItemProfits.toLocaleString('en-IN')}</strong>
              </div>

              <div className="flex justify-between py-2 text-rose-400">
                <span>(-) Operating Shop Expenses (Rent, Staff, Transport, Electricity):</span>
                <strong className="font-mono">₹{totalOperatingExpenses.toLocaleString('en-IN')}</strong>
              </div>

              <div className="flex justify-between py-3 text-base font-black text-white border-t-2 border-slate-700">
                <span>NET SHOP PROFIT:</span>
                <span className={`font-mono ${netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ₹{netOperatingProfit.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              * Non-GST simplified calculation. Realized profit excludes unpaid credit dues until collected.
            </p>
          </div>
        )}

        {activeReport === 'ITEM_SALES' && (
          <div className="overflow-x-auto flex-1">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Cracker Item</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-center">Quantity Sold</th>
                  <th className="p-3 text-right">Revenue Generated</th>
                  <th className="p-3 text-right">Net Item Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {itemSummary.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-3 text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-100">{it.name}</td>
                    <td className="p-3 text-slate-400">{it.category}</td>
                    <td className="p-3 text-center font-mono font-bold text-orange-400">{it.qty} Boxes</td>
                    <td className="p-3 text-right font-mono font-bold text-white">₹{it.revenue}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">₹{it.profit}</td>
                  </tr>
                ))}
                {itemSummary.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No sales recorded in the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'STOCK_VALUATION' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">TOTAL PURCHASE COST VALUATION</span>
                <strong className="text-lg font-black text-emerald-400 font-mono">
                  ₹{totalCostStockVal.toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">TOTAL RETAIL SELLING VALUATION</span>
                <strong className="text-lg font-black text-orange-400 font-mono">
                  ₹{totalRetailStockVal.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 border border-slate-800 rounded-xl">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Barcode</th>
                    <th className="p-3 text-center">Available Stock</th>
                    <th className="p-3 text-right">Cost Rate</th>
                    <th className="p-3 text-right">Cost Valuation</th>
                    <th className="p-3 text-right">Retail Rate</th>
                    <th className="p-3 text-right">Retail Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {stockValuation.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-slate-100">{p.name}</td>
                      <td className="p-3 font-mono text-slate-400">{p.barcode}</td>
                      <td className="p-3 text-center font-mono font-bold">{p.currentStock} {p.unit}</td>
                      <td className="p-3 text-right font-mono text-slate-400">₹{p.purchaseRate}</td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-bold">₹{p.costVal}</td>
                      <td className="p-3 text-right font-mono text-slate-400">₹{p.sellingRate}</td>
                      <td className="p-3 text-right font-mono text-orange-400 font-bold">₹{p.retailVal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'CUSTOMER_DUES' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[10px]">OUTSTANDING CREDIT BALANCES</span>
                <strong className="text-base font-black text-rose-400 font-mono">
                  {dueCustomers.length} Customers with active dues
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">TOTAL PENDING COLLECTION</span>
                <strong className="text-xl font-black text-rose-400 font-mono">
                  ₹{totalDueAmount.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 border border-slate-800 rounded-xl">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Mobile Number</th>
                    <th className="p-3">City / Town</th>
                    <th className="p-3 text-right">Total Purchased</th>
                    <th className="p-3 text-right">Total Paid</th>
                    <th className="p-3 text-right font-bold text-rose-400">Current Due Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {dueCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-100">{c.name}</td>
                      <td className="p-3 font-mono">{c.mobile}</td>
                      <td className="p-3 text-slate-300">{c.city}</td>
                      <td className="p-3 text-right font-mono text-slate-300">₹{c.totalPurchased || 0}</td>
                      <td className="p-3 text-right font-mono text-emerald-400">₹{c.totalPaid || 0}</td>
                      <td className="p-3 text-right font-mono font-black text-rose-400 text-sm">
                        ₹{c.currentDue}
                      </td>
                    </tr>
                  ))}
                  {dueCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        All customer accounts are 100% paid and cleared!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
