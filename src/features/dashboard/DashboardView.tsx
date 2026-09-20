import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Receipt,
  IndianRupee,
  ShoppingBag,
  CreditCard,
  QrCode,
  Users,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Package,
  PlusCircle,
  Clock,
  Printer,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { StorageService } from '../../services/storageService';
import { Sale, Product, Expense, DayClosing } from '../../types';

interface Props {
  onNavigate?: (view: any) => void;
  onOpenReceipt?: (sale: Sale) => void;
}

const COLORS = ['#ea580c', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

export const DashboardView: React.FC<Props> = ({ onNavigate, onOpenReceipt }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);

  useEffect(() => {
    setSales(StorageService.getSales());
    setProducts(StorageService.getProducts());
    setExpenses(StorageService.getExpenses());
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.invoiceDate.startsWith(todayStr) && s.status !== 'CANCELLED');
  const todayPurchases = StorageService.getPurchases().filter((p) => p.purchaseDate.startsWith(todayStr));
  const todayExpenses = expenses.filter((e) => e.date.startsWith(todayStr));

  // Today metrics
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.grandTotal, 0);
  const todayBillsCount = todaySales.length;
  const todayGrossProfit = todaySales.reduce((acc, s) => acc + s.totalProfit, 0);
  const todayExpenseTotal = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const todayNetProfit = todayGrossProfit - todayExpenseTotal;
  const todayPurchaseTotal = todayPurchases.reduce((acc, p) => acc + p.grandTotal, 0);

  // Payment Breakdown
  const cashSales = todaySales.reduce((acc, s) => acc + (s.paymentBreakdown?.cash || 0), 0);
  const upiSales = todaySales.reduce((acc, s) => acc + (s.paymentBreakdown?.upi || 0), 0);
  const creditSales = todaySales.reduce((acc, s) => acc + (s.paymentBreakdown?.credit || 0), 0);
  const cardSales = todaySales.reduce((acc, s) => acc + (s.paymentBreakdown?.card || 0), 0);

  // Inventory Health
  const lowStockProds = products.filter((p) => p.isActive && p.currentStock > 0 && p.currentStock <= p.minimumStockLevel);
  const outOfStockProds = products.filter((p) => p.isActive && p.currentStock <= 0);
  const totalCustomersCount = StorageService.getCustomers().length;

  // Chart 1: Sales by day (Last 7 days)
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayKey = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    const dayTotal = sales
      .filter((s) => s.invoiceDate.startsWith(dayKey) && s.status !== 'CANCELLED')
      .reduce((sum, s) => sum + s.grandTotal, 0);
    return { day: dayLabel, sales: dayTotal };
  });

  // Chart 2: Payment distribution
  const paymentData = [
    { name: 'Cash', value: cashSales || 1 },
    { name: 'UPI', value: upiSales },
    { name: 'Credit', value: creditSales },
    { name: 'Card', value: cardSales },
  ].filter((p) => p.value > 0);

  // Chart 3: Top Selling Fireworks
  const itemMap: { [name: string]: number } = {};
  sales.forEach((s) => {
    if (s.status !== 'CANCELLED') {
      s.items.forEach((item) => {
        itemMap[item.productName] = (itemMap[item.productName] || 0) + item.quantity;
      });
    }
  });
  const topProductsData = Object.entries(itemMap)
    .map(([name, qty]) => ({ name: name.length > 16 ? name.substring(0, 16) + '...' : name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div id="dashboard-view-root" className="h-full min-h-0 p-3 sm:p-4 lg:p-6 pb-20 md:pb-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto overflow-y-auto overscroll-contain">
      {/* Top Banner / Quick Actions */}
      <div className="dashboard-hero flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="dashboard-brand-mark p-1.5 rounded-lg">
              <Flame className="w-5 h-5" />
            </span>
            <h2 className="dashboard-hero-title text-xl font-black tracking-tight">Fireworks Retail POS Terminal</h2>
          </div>
          <p className="dashboard-hero-subtitle text-xs mt-1">
            Diwali season high-velocity billing • Tax-free retail invoicing • Real-time stock sync
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="dash-btn-billing"
            onClick={() => onNavigate && onNavigate('BILLING')}
            className="dashboard-action-primary flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl shadow-lg transition-all scale-100 hover:scale-102"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Start Billing (F9)
          </button>
          <button
            id="dash-btn-products"
            onClick={() => onNavigate && onNavigate('PRODUCTS')}
            className="dashboard-action-secondary flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl border transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-orange-400" />
            Add Cracker
          </button>
          <button
            id="dash-btn-purchases"
            onClick={() => onNavigate && onNavigate('PURCHASES')}
            className="dashboard-action-secondary flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl border transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            New Purchase
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="dashboard-card bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Today's Sales</span>
            <div className="dashboard-metric-icon dashboard-metric-icon-sales p-2 rounded-lg">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">₹{todaySalesTotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{todayBillsCount} bills processed today</span>
            <span className="text-emerald-400 font-semibold">Live</span>
          </div>
        </div>

        {/* Today's Net Profit */}
        <div className="dashboard-card bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Today's Net Profit</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">₹{todayNetProfit.toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Gross: ₹{todayGrossProfit.toLocaleString('en-IN')}</span>
            <span>Exp: ₹{todayExpenseTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Cash & UPI Collection */}
        <div className="dashboard-card bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Cash & Digital Coll.</span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-400">₹{(cashSales + upiSales).toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Cash: ₹{cashSales}</span>
            <span>UPI: ₹{upiSales}</span>
          </div>
        </div>

        {/* Credit / Due Sales */}
        <div className="dashboard-card bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Credit Sales (Due)</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">₹{creditSales.toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Total Cust: {totalCustomersCount}</span>
            <button onClick={() => onNavigate('customers')} className="text-amber-400 hover:underline">
              Ledger &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Stock Health Alerts Banner */}
      {(lowStockProds.length > 0 || outOfStockProds.length > 0) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/15 text-rose-400 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">Inventory Alert</h4>
              <p className="text-xs text-slate-400">
                {outOfStockProds.length > 0 && <strong className="text-rose-400">{outOfStockProds.length} Out of Stock</strong>}
                {outOfStockProds.length > 0 && lowStockProds.length > 0 && ' and '}
                {lowStockProds.length > 0 && <strong className="text-amber-400">{lowStockProds.length} Low Stock</strong>}{' '}
                fireworks items need replenishment before festival rush.
              </p>
            </div>
          </div>
          <button
            id="dash-btn-view-stock"
            onClick={() => onNavigate('stock')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition-colors shrink-0"
          >
            Review Stock &rarr;
          </button>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales by Day */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Weekly Sales Revenue</h3>
              <p className="text-xs text-slate-400">Last 7 days turnover trend</p>
            </div>
            <span className="text-xs text-orange-400 font-mono">₹{sales.reduce((a, s) => a + s.grandTotal, 0).toLocaleString('en-IN')} Total</span>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Sales']}
                />
                <Bar dataKey="sales" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Payment Methods</h3>
              <p className="text-xs text-slate-400">Today's collection mode distribution</p>
            </div>
          </div>
          <div className="h-52 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData.length ? paymentData : [{ name: 'None', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
              <span className="text-slate-400">Cash:</span>
              <strong className="text-slate-200">₹{cashSales}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-400">UPI:</span>
              <strong className="text-slate-200">₹{upiSales}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-400">Credit:</span>
              <strong className="text-slate-200">₹{creditSales}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span className="text-slate-400">Card:</span>
              <strong className="text-slate-200">₹{cardSales}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Invoices & Fast Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Feed */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Recent Sales Invoices</h3>
              <p className="text-xs text-slate-400">Latest completed customer bills</p>
            </div>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1"
            >
              All Invoices <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-800/80">
            {sales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 text-slate-300 rounded-lg font-mono font-bold">
                    {sale.billNumber}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">{sale.customerName}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(sale.invoiceDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {sale.items.length} items • {sale.paymentMethod}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-white">₹{sale.grandTotal}</p>
                    {sale.dueAmount > 0 ? (
                      <span className="text-[10px] text-rose-400 font-semibold">Due: ₹{sale.dueAmount}</span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-semibold">Paid</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (onOpenReceipt) onOpenReceipt(sale);
                      else setSelectedReceipt(sale);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                    title="View / Print Receipt"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {sales.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-xs">
                No sales bills recorded yet today. Click "Start Billing" to create your first bill.
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Crackers */}
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Fast Moving Items</h3>
            <p className="text-xs text-slate-400">Top selling fireworks by volume</p>
          </div>

          <div className="mt-3 space-y-3">
            {topProductsData.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-200">{item.name}</span>
                  <span className="text-orange-400 font-mono">{item.qty} Sold</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full"
                    style={{ width: `${Math.min(100, (item.qty / (topProductsData[0]?.qty || 1)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {topProductsData.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-xs">
                Product sales volume stats will appear after billing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
