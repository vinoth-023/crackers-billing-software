import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Barcode,
  Sparkles,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Product, Category, Brand } from '../../types';
import { useToast } from '../../components/common/Toast';
import { tamilToTanglish } from '../../services/transliterationService';

export const ProductsView: React.FC = () => {
  const { success, error, warning } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT' | 'AVAILABLE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formTamilName, setFormTamilName] = useState('');
  const [formIsDiscountable, setFormIsDiscountable] = useState(true);
  const [formShortName, setFormShortName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formBrandId, setFormBrandId] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formUnit, setFormUnit] = useState('Box');
  const [formPackingType, setFormPackingType] = useState('1 Box (10 Pcs)');
  const [formPurchaseRate, setFormPurchaseRate] = useState<number>(0);
  const [formSellingRate, setFormSellingRate] = useState<number>(0);
  const [formMrp, setFormMrp] = useState<number>(0);
  const [formWholesaleRate, setFormWholesaleRate] = useState<number>(0);
  const [formCurrentStock, setFormCurrentStock] = useState<number>(0);
  const [formMinStock, setFormMinStock] = useState<number>(10);
  const [formRackLocation, setFormRackLocation] = useState('Rack A-1');
  const [formIsActive, setFormIsActive] = useState(true);

  const currentUser = StorageService.getCurrentUser();

  const loadData = () => {
    setProducts(StorageService.getProducts());
    setCategories(StorageService.getCategories());
    setBrands(StorageService.getBrands());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCat !== 'ALL' && p.categoryId !== selectedCat) return false;

      if (stockFilter === 'LOW' && (p.currentStock <= 0 || p.currentStock > p.minimumStockLevel)) return false;
      if (stockFilter === 'OUT' && p.currentStock > 0) return false;
      if (stockFilter === 'AVAILABLE' && p.currentStock <= 0) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.rackLocation.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCat, stockFilter, search]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormTamilName(''); setFormIsDiscountable(true);
    setFormShortName('');
    setFormCategoryId(categories[0]?.id || 'cat-bombs');
    setFormBrandId(brands[0]?.id || 'brand-standard');
    setFormBarcode(`FW-${Math.floor(100000 + Math.random() * 900000)}`);
    setFormUnit('Box');
    setFormPackingType('1 Box (10 Pcs)');
    setFormPurchaseRate(50);
    setFormSellingRate(100);
    setFormMrp(120);
    setFormWholesaleRate(80);
    setFormCurrentStock(50);
    setFormMinStock(15);
    setFormRackLocation('Rack A-1');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormTamilName(prod.tamilName || ''); setFormIsDiscountable(prod.isDiscountable !== false);
    setFormShortName(prod.shortName);
    setFormCategoryId(prod.categoryId);
    setFormBrandId(prod.brandId || brands[0]?.id || '');
    setFormBarcode(prod.barcode);
    setFormUnit(prod.unit);
    setFormPackingType(prod.packingType);
    setFormPurchaseRate(prod.purchaseRate);
    setFormSellingRate(prod.sellingRate);
    setFormMrp(prod.mrp);
    setFormWholesaleRate(prod.wholesaleRate || prod.sellingRate);
    setFormCurrentStock(prod.currentStock);
    setFormMinStock(prod.minimumStockLevel);
    setFormRackLocation(prod.rackLocation);
    setFormIsActive(prod.isActive);
    setIsModalOpen(true);
  };

  const handleGenerateBarcode = () => {
    const code = `890${Math.floor(100000000 + Math.random() * 900000000)}`;
    setFormBarcode(code);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      error('Product Name is required.');
      return;
    }
    if (formSellingRate < 0 || formPurchaseRate < 0) {
      error('Rates cannot be negative.');
      return;
    }

    const categoryObj = categories.find((c) => c.id === formCategoryId);
    const brandObj = brands.find((b) => b.id === formBrandId);

    if (editingProduct) {
      // Update existing
      const updated: Product = {
        ...editingProduct,
        name: formName.trim(), tamilName: formName.trim(), searchAliases: [tamilToTanglish(formName.trim())], isDiscountable: formIsDiscountable,
        shortName: formShortName.trim() || formName.trim().substring(0, 12),
        categoryId: formCategoryId,
        categoryName: categoryObj?.name || 'General',
        brandId: formBrandId,
        brandName: brandObj?.name || 'Standard Fireworks',
        barcode: formBarcode.trim(),
        unit: formUnit,
        packingType: formPackingType,
        purchaseRate: Number(formPurchaseRate),
        sellingRate: Number(formSellingRate),
        mrp: Number(formMrp),
        wholesaleRate: Number(formWholesaleRate),
        minimumStockLevel: Number(formMinStock),
        rackLocation: formRackLocation.trim(),
        isActive: formIsActive,
        updatedAt: new Date().toISOString(),
      };

      // Check if stock changed directly in edit form
      if (formCurrentStock !== editingProduct.currentStock) {
        const delta = formCurrentStock - editingProduct.currentStock;
        StorageService.updateProductStock(
          updated.id,
          delta,
          'ADJUSTMENT',
          'DIRECT_EDIT',
          `Manual stock correction from ${editingProduct.currentStock} to ${formCurrentStock}`,
          currentUser.fullName
        );
      } else {
        StorageService.saveProduct(updated);
      }

      success(`Product "${updated.name}" updated!`);
    } else {
      // Create new
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        name: formName.trim(), tamilName: formName.trim(), searchAliases: [tamilToTanglish(formName.trim())], isDiscountable: formIsDiscountable,
        shortName: formShortName.trim() || formName.trim().substring(0, 12),
        categoryId: formCategoryId,
        categoryName: categoryObj?.name || 'General',
        brandId: formBrandId,
        brandName: brandObj?.name || 'Standard Fireworks',
        barcode: formBarcode.trim(),
        unit: formUnit,
        packingType: formPackingType,
        purchaseRate: Number(formPurchaseRate),
        sellingRate: Number(formSellingRate),
        mrp: Number(formMrp),
        wholesaleRate: Number(formWholesaleRate),
        currentStock: 0,
        minimumStockLevel: Number(formMinStock),
        rackLocation: formRackLocation.trim(),
        isActive: formIsActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      StorageService.saveProduct(newProd);

      // Add opening stock if provided
      if (formCurrentStock > 0) {
        StorageService.updateProductStock(
          newProd.id,
          formCurrentStock,
          'OPENING_STOCK',
          'INITIAL',
          'Opening inventory upon cracker product creation',
          currentUser.fullName
        );
      }

      success(`New cracker product "${newProd.name}" created!`);
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleDeleteProduct = (prod: Product) => {
    const confirm = window.confirm(`Are you sure you want to delete "${prod.name}"?`);
    if (!confirm) return;

    StorageService.deleteProduct(prod.id);
    loadData();
    success(`Product "${prod.name}" deleted.`);
  };

  return (
    <div id="products-view-root" className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto overflow-y-auto h-full flex flex-col">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Fireworks Catalog & Master List</h2>
              <p className="text-xs text-slate-400">
                Manage fireworks products, barcodes, rates, and minimum stock alert thresholds
              </p>
            </div>
          </div>

          <button
            id="btn-add-new-product"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-950 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Cracker Product
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product name, short code, barcode, rack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 text-xs"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="py-2 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium focus:outline-hidden"
          >
            <option value="ALL">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Filter Pills */}
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
        </div>
      </div>

      {/* Products Display (Mobile Cards + Desktop Table) */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        {/* Mobile View: High-Legibility Card List */}
        <div className="md:hidden overflow-y-auto flex-1 p-3 space-y-2.5">
          {filteredProducts.map((prod) => {
            const isLow = prod.currentStock <= prod.minimumStockLevel;
            const isOut = prod.currentStock <= 0;

            return (
              <div
                key={prod.id}
                className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm leading-snug">{prod.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="font-mono text-orange-400 font-semibold">{prod.barcode}</span>
                      <span>•</span>
                      <span>{prod.categoryName}</span>
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
                    {prod.currentStock} {prod.unit}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Selling Rate</span>
                    <span className="font-bold text-white font-mono text-sm">₹{prod.sellingRate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Cost Rate</span>
                    <span className="font-mono text-slate-300">₹{prod.purchaseRate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Rack / Loc</span>
                    <span className="font-mono text-slate-300 truncate block">{prod.rackLocation || 'Shelf'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">{prod.brandName} • {prod.packingType}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(prod)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-orange-400" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prod)}
                      className="p-1.5 bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-slate-500">No cracker products match your search.</div>
          )}
        </div>

        {/* Desktop View: Full Responsive Table */}
        <div className="hidden md:block overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
              <tr>
                <th className="p-3">Barcode / Code</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Packing / Rack</th>
                <th className="p-3 text-right">Purchase ₹</th>
                <th className="p-3 text-right">Selling ₹</th>
                <th className="p-3 text-right">MRP ₹</th>
                <th className="p-3 text-center">Stock Level</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredProducts.map((prod) => {
                const isLow = prod.currentStock <= prod.minimumStockLevel;
                const isOut = prod.currentStock <= 0;

                return (
                  <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-orange-400">
                      <div>{prod.barcode}</div>
                      <div className="text-[10px] text-slate-400">{prod.shortName}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-100">{prod.name}</div>
                      <div className="text-[10px] text-slate-400">{prod.brandName}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300">
                        {prod.categoryName}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      <div>{prod.packingType}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{prod.rackLocation}</div>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400">₹{prod.purchaseRate}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">₹{prod.sellingRate}</td>
                    <td className="p-3 text-right font-mono text-slate-400 line-through">₹{prod.mrp}</td>
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
                        {prod.currentStock} {prod.unit}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {prod.isActive ? (
                        <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
                      ) : (
                        <span className="text-[10px] text-rose-400 font-semibold">Inactive</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod)}
                          className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No cracker products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-400" />
                {editingProduct ? 'Edit Cracker Product' : 'Add New Cracker Product'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="text-slate-300 font-semibold block mb-1">Product Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. 28 Giant Sound Cracker Red"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-200"><input type="checkbox" checked={formIsDiscountable} onChange={(e)=>setFormIsDiscountable(e.target.checked)} className="accent-orange-500"/> Discountable product</label>

                {/* Short Name / Code */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Short Name / Code</label>
                  <input
                    type="text"
                    value={formShortName}
                    onChange={(e) => setFormShortName(e.target.value)}
                    placeholder="e.g. 28 GIANT"
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>

                {/* Barcode with Auto-generate */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-300 font-semibold">Barcode</label>
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="text-[10px] text-orange-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Barcode className="w-3 h-3" /> Auto Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="Barcode string"
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Category *</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Brand / Manufacturer</label>
                  <select
                    value={formBrandId}
                    onChange={(e) => setFormBrandId(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rates Grid */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Purchase Rate ₹ *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formPurchaseRate}
                    onChange={(e) => setFormPurchaseRate(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Selling Rate ₹ (Retail) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formSellingRate}
                    onChange={(e) => setFormSellingRate(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold text-orange-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">MRP ₹ (Maximum Retail Price)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formMrp}
                    onChange={(e) => setFormMrp(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Wholesale Rate ₹</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formWholesaleRate}
                    onChange={(e) => setFormWholesaleRate(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                {/* Stock & Unit */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Current Stock Quantity</label>
                  <input
                    type="number"
                    value={formCurrentStock}
                    onChange={(e) => setFormCurrentStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Minimum Alert Stock Level</label>
                  <input
                    type="number"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="e.g. Box, Pkt, Pcs, Bag"
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Rack / Shelf Location</label>
                  <input
                    type="text"
                    value={formRackLocation}
                    onChange={(e) => setFormRackLocation(e.target.value)}
                    placeholder="e.g. Rack A-1 / Floor Stand 3"
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prod-active-toggle"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 bg-slate-950 border-slate-700"
                />
                <label htmlFor="prod-active-toggle" className="text-slate-200 font-medium cursor-pointer">
                  Product is active for POS billing and inventory
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md shadow-orange-950"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
