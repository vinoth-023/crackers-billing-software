import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Search,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  Sliders,
  History,
  Boxes,
  IndianRupee,
  Layers,
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Product, StockMovement } from '../../types';
import { useToast } from '../../components/common/Toast';

export const StockManagementView: React.FC = () => {
  const { success, error, info } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'CURRENT_STOCK' | 'MOVEMENTS'>('CURRENT_STOCK');
  const [viewLayout, setViewLayout] = useState<'CARDS' | 'TABLE'>('TABLE');

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'ADD' | 'REMOVE'>('ADD');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState('Stock count audit discrepancy');

  const currentUser = StorageService.getCurrentUser();

  const loadData = () => {
    setProducts(StorageService.getProducts());
    setMovements(StorageService.getStockMovements());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (stockFilter === 'LOW' && (p.currentStock <= 0 || p.currentStock > p.minimumStockLevel)) return false;
      if (stockFilter === 'OUT' && p.currentStock > 0) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.rackLocation.toLowerCase().includes(q)
      );
    });
  }, [products, stockFilter, search]);

  const filteredMovements = useMemo(() => {
    if (!search.trim()) return movements;
    const q = search.toLowerCase().trim();
    return movements.filter(
      (m) =>
        m.productName.toLowerCase().includes(q) ||
        m.referenceNumber?.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        m.notes?.toLowerCase().includes(q)
    );
  }, [movements, search]);

  // Inventory Valuation Metrics
  const totalStockQty = products.reduce((acc, p) => acc + (p.currentStock > 0 ? p.currentStock : 0), 0);
  const totalCostValuation = products.reduce(
    (acc, p) => acc + (p.currentStock > 0 ? p.currentStock * p.purchaseRate : 0),
    0
  );
  const totalRetailValuation = products.reduce(
    (acc, p) => acc + (p.currentStock > 0 ? p.currentStock * p.sellingRate : 0),
    0
  );
  const lowStockCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minimumStockLevel).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  const handleOpenAdjust = (prod: Product) => {
    setSelectedProd(prod);
    setAdjustQty(1);
    setAdjustType('ADD');
    setAdjustReason('Physical stock audit match');
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) return;
    if (adjustQty <= 0) {
      error('Adjustment quantity must be greater than 0');
      return;
    }

    const delta = adjustType === 'ADD' ? adjustQty : -adjustQty;

    const res = StorageService.updateProductStock(
      selectedProd.id,
      delta,
      'ADJUSTMENT',
      'MANUAL_AUDIT',
      `${adjustReason} (Adjusted by ${currentUser.fullName})`,
      currentUser.fullName
    );

    if (res?.success) {
      success(`Stock for "${selectedProd.name}" adjusted by ${delta > 0 ? '+' : ''}${delta}!`);
      setIsAdjustModalOpen(false);
      loadData();
    } else {
      error('Failed to adjust stock');
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'SALE':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'SALES_RETURN':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'PURCHASE_RETURN':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'DAMAGE':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'ADJUSTMENT':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div id="stock-view-root" className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto overflow-y-auto h-full flex flex-col">
      {/* Header & Metrics */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Stock Management & Movement Ledger</h2>
              <p className="text-xs text-slate-400">
                Track fireworks inventory levels, valuation, and every stock transaction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('CURRENT_STOCK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'CURRENT_STOCK' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Current Stock ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'MOVEMENTS' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Stock Log ({movements.length})
            </button>
          </div>
        </div>

        {/* Valuation Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs">
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">TOTAL ITEMS IN STOCK</span>
            <strong className="text-base font-black text-white font-mono">{totalStockQty} Boxes/Units</strong>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">PURCHASE COST VALUATION</span>
            <strong className="text-base font-black text-emerald-400 font-mono">
              ₹{totalCostValuation.toLocaleString('en-IN')}
            </strong>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">RETAIL SALES VALUATION</span>
            <strong className="text-base font-black text-orange-400 font-mono">
              ₹{totalRetailValuation.toLocaleString('en-IN')}
            </strong>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-slate-400 block text-[10px]">STOCK ALERTS</span>
              <span className="text-xs font-bold text-amber-400">{lowStockCount} Low</span> •{' '}
              <span className="text-xs font-bold text-rose-400">{outOfStockCount} Out</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'CURRENT_STOCK' ? 'Filter stock by name, barcode, rack...' : 'Search stock movement log...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'CURRENT_STOCK' && (
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg p-0.5">
                <button
                  onClick={() => setStockFilter('ALL')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold ${
                    stockFilter === 'ALL' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStockFilter('LOW')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold ${
                    stockFilter === 'LOW' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Low Stock
                </button>
                <button
                  onClick={() => setStockFilter('OUT')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold ${
                    stockFilter === 'OUT' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Out of Stock
                </button>
              </div>
            )}

            {/* Layout Toggle on mobile & tablet */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg p-0.5">
              <button
                onClick={() => setViewLayout('TABLE')}
                className={`px-2.5 py-1.5 rounded-md font-semibold ${
                  viewLayout === 'TABLE' ? 'bg-slate-800 text-orange-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Full Table View"
              >
                📊 Table
              </button>
              <button
                onClick={() => setViewLayout('CARDS')}
                className={`px-2.5 py-1.5 rounded-md font-semibold ${
                  viewLayout === 'CARDS' ? 'bg-slate-800 text-orange-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Card View"
              >
                📱 Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[300px]">
        {activeTab === 'CURRENT_STOCK' ? (
          <>
            {/* Mobile/Card View (When viewLayout === 'CARDS' or small screen with cards selected) */}
            {viewLayout === 'CARDS' ? (
              <div className="overflow-y-auto flex-1 p-3 space-y-2.5">
                {filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.minimumStockLevel;
                  const isOut = p.currentStock <= 0;
                  const stockVal = p.currentStock * p.purchaseRate;

                  return (
                    <div
                      key={p.id}
                      className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white text-sm leading-snug">{p.name}</h4>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            {p.barcode} • Rack: {p.rackLocation || 'A1'}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono shrink-0 ${
                            isOut
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isLow
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {p.currentStock} {p.unit}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Selling Rate</span>
                          <span className="font-mono font-bold text-white">₹{p.sellingRate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Cost Valuation</span>
                          <span className="font-mono text-emerald-400 font-bold">₹{stockVal.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Alert Level</span>
                          <span className="font-mono text-slate-300">{p.minimumStockLevel} {p.unit}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">{p.categoryName}</span>
                        <button
                          onClick={() => handleOpenAdjust(p)}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                        >
                          <Sliders className="w-3.5 h-3.5" /> Adjust Stock
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <div className="p-8 text-center text-slate-500">No stock records found matching filters.</div>
                )}
              </div>
            ) : (
              /* Full Responsive Table View */
              <div className="overflow-x-auto overflow-y-auto flex-1">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="p-3">Cracker Item</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Location / Rack</th>
                      <th className="p-3 text-right">Cost Rate</th>
                      <th className="p-3 text-right">Retail Rate</th>
                      <th className="p-3 text-center">Current Stock</th>
                      <th className="p-3 text-center">Alert Level</th>
                      <th className="p-3 text-right">Stock Value (Cost)</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {filteredProducts.map((p) => {
                      const isLow = p.currentStock <= p.minimumStockLevel;
                      const isOut = p.currentStock <= 0;
                      const stockVal = p.currentStock * p.purchaseRate;

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40">
                          <td className="p-3">
                            <div className="font-bold text-slate-100">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{p.barcode} • {p.shortName}</div>
                          </td>
                          <td className="p-3 text-slate-300">{p.categoryName}</td>
                          <td className="p-3 font-mono text-slate-400">{p.rackLocation || 'A1'}</td>
                          <td className="p-3 text-right font-mono text-slate-400">₹{p.purchaseRate}</td>
                          <td className="p-3 text-right font-mono font-bold text-white">₹{p.sellingRate}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono inline-block ${
                                isOut
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : isLow
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {p.currentStock} {p.unit}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-400">
                            {p.minimumStockLevel} {p.unit}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">
                            ₹{stockVal.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleOpenAdjust(p)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-orange-400 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              Adjust
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Movement Ledger View (Cards or Table) */}
            {viewLayout === 'CARDS' ? (
              <div className="overflow-y-auto flex-1 p-3 space-y-2.5">
                {filteredMovements.map((m) => (
                  <div key={m.id} className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 space-y-2 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">{m.productName}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(m.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getMovementBadge(m.type)}`}>
                        {m.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-y border-slate-800/80 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Previous</span>
                        <span className="text-slate-300">{m.previousStock}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Change</span>
                        <span className={`font-bold ${m.quantityChange > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">New Stock</span>
                        <span className="font-bold text-white">{m.newStock}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{m.referenceNumber || 'Ref: Direct'}</span>
                      <span>Staff: {m.createdBy}</span>
                    </div>
                  </div>
                ))}
                {filteredMovements.length === 0 && (
                  <div className="p-8 text-center text-slate-500">No stock movements logged.</div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto flex-1">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Cracker Item</th>
                      <th className="p-3">Movement Type</th>
                      <th className="p-3 text-center">Prev Stock</th>
                      <th className="p-3 text-center">Change</th>
                      <th className="p-3 text-center">New Stock</th>
                      <th className="p-3">Reference / Notes</th>
                      <th className="p-3">Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {filteredMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400">
                          {new Date(m.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3 font-bold text-slate-200">{m.productName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getMovementBadge(m.type)}`}>
                            {m.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-400">{m.previousStock}</td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={m.quantityChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-white">{m.newStock}</td>
                        <td className="p-3 text-slate-300 font-mono text-[11px]">{m.referenceNumber || m.notes || '-'}</td>
                        <td className="p-3 text-slate-400">{m.createdBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && selectedProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-400" />
              Adjust Stock: {selectedProd.name}
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[10px]">CURRENT STOCK</span>
                <strong className="text-base font-bold text-white font-mono">
                  {selectedProd.currentStock} {selectedProd.unit}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">RACK LOCATION</span>
                <span className="text-slate-300 font-mono">{selectedProd.rackLocation}</span>
              </div>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Adjustment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADD')}
                    className={`p-2 rounded-xl border font-bold ${
                      adjustType === 'ADD'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                  >
                    + Add to Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('REMOVE')}
                    className={`p-2 rounded-xl border font-bold ${
                      adjustType === 'REMOVE'
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                  >
                    - Deduct Stock
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Adjustment Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Audit Reason / Notes</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical inventory count verified"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl"
                >
                  Apply Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
