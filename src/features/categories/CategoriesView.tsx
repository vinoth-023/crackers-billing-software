import React, { useState, useEffect } from 'react';
import { Boxes, Plus, Edit2, Trash2, Tag, CheckCircle2, XCircle, Flame } from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Category, Brand } from '../../types';
import { useToast } from '../../components/common/Toast';

export const CategoriesView: React.FC = () => {
  const { success, error } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeTab, setActiveTab] = useState<'CATEGORIES' | 'BRANDS'>('CATEGORIES');

  // Category Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Brand Modal
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandCity, setBrandCity] = useState('Sivakasi');
  const [brandContact, setBrandContact] = useState('');

  const loadData = () => {
    setCategories(StorageService.getCategories());
    setBrands(StorageService.getBrands());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      error('Category name is required.');
      return;
    }

    if (editingCat) {
      const updated: Category = {
        ...editingCat,
        name: catName.trim(),
        description: catDesc.trim(),
      };
      StorageService.saveCategory(updated);
      success(`Category "${updated.name}" updated!`);
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: catName.trim(),
        description: catDesc.trim(),
        isActive: true,
      };
      StorageService.saveCategory(newCat);
      success(`Category "${newCat.name}" added!`);
    }
    setIsCatModalOpen(false);
    loadData();
  };

  const handleDeleteCategory = (cat: Category) => {
    const confirm = window.confirm(`Are you sure you want to delete category "${cat.name}"?`);
    if (!confirm) return;
    StorageService.deleteCategory(cat.id);
    loadData();
    success(`Category deleted.`);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      error('Brand name is required.');
      return;
    }

    if (editingBrand) {
      const updated: Brand = {
        ...editingBrand,
        name: brandName.trim(),
        city: brandCity.trim(),
        contactNumber: brandContact.trim(),
      };
      StorageService.saveBrand(updated);
      success(`Brand "${updated.name}" updated!`);
    } else {
      const newBrand: Brand = {
        id: `brand-${Date.now()}`,
        name: brandName.trim(),
        city: brandCity.trim(),
        contactNumber: brandContact.trim(),
        isActive: true,
      };
      StorageService.saveBrand(newBrand);
      success(`Brand "${newBrand.name}" added!`);
    }
    setIsBrandModalOpen(false);
    loadData();
  };

  const handleDeleteBrand = (brand: Brand) => {
    const confirm = window.confirm(`Are you sure you want to delete brand "${brand.name}"?`);
    if (!confirm) return;
    StorageService.deleteBrand(brand.id);
    loadData();
    success(`Brand deleted.`);
  };

  return (
    <div id="categories-view-root" className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Categories & Cracker Brands</h2>
            <p className="text-xs text-slate-400">Classify fireworks and organize Sivakasi manufacturer brands</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'CATEGORIES' ? (
            <button
              onClick={() => {
                setEditingCat(null);
                setCatName('');
                setCatDesc('');
                setIsCatModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingBrand(null);
                setBrandName('');
                setBrandCity('Sivakasi');
                setBrandContact('');
                setIsBrandModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Brand
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'CATEGORIES' ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('BRANDS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'BRANDS' ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Manufacturer Brands ({brands.length})
        </button>
      </div>

      {/* Categories Tab Content */}
      {activeTab === 'CATEGORIES' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-start justify-between gap-2"
            >
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  {cat.name}
                </h4>
                <p className="text-xs text-slate-400 mt-1">{cat.description || 'Cracker category'}</p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingCat(cat);
                    setCatName(cat.name);
                    setCatDesc(cat.description || '');
                    setIsCatModalOpen(true);
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brands Tab Content */}
      {activeTab === 'BRANDS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-start justify-between gap-2"
            >
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  {brand.name}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">{brand.city} • {brand.contactNumber || 'No Phone'}</p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingBrand(brand);
                    setBrandName(brand.name);
                    setBrandCity(brand.city);
                    setBrandContact(brand.contactNumber || '');
                    setIsBrandModalOpen(true);
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteBrand(brand)}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">
              {editingCat ? 'Edit Category' : 'Add Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Electric Sparklers"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Description</label>
                <textarea
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="e.g. Handheld color sparkle wires"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white h-20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 text-white font-bold rounded-lg"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Modal */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">
              {editingBrand ? 'Edit Brand' : 'Add Brand'}
            </h3>
            <form onSubmit={handleSaveBrand} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Standard Fireworks"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Manufacturing City</label>
                <input
                  type="text"
                  value={brandCity}
                  onChange={(e) => setBrandCity(e.target.value)}
                  placeholder="e.g. Sivakasi"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={brandContact}
                  onChange={(e) => setBrandContact(e.target.value)}
                  placeholder="e.g. 04562-220011"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 text-white font-bold rounded-lg"
                >
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
