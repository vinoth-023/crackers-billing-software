import React, { useState, useEffect } from 'react';
import { AlertOctagon, Plus, Trash2, IndianRupee, Flame, ShieldAlert } from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { DamageStock, Product } from '../../types';
import { useToast } from '../../components/common/Toast';

export const DamageStockView: React.FC = () => {
  const { success, error, warning } = useToast();

  const [damages, setDamages] = useState<DamageStock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedProdId, setSelectedProdId] = useState('');
  const [damagedQty, setDamagedQty] = useState<number>(1);
  const [reasonCategory, setReasonCategory] = useState<'DAMP_MOISTURE' | 'FUSE_FAIL' | 'BROKEN_BOX' | 'MISFIRE_TEST' | 'OTHER'>('DAMP_MOISTURE');
  const [customReason, setCustomReason] = useState('');

  const currentUser = StorageService.getCurrentUser();

  const loadData = () => {
    setDamages(StorageService.getDamagedStock());
    const prodList = StorageService.getProducts();
    setProducts(prodList);
    if (prodList.length > 0 && !selectedProdId) {
      setSelectedProdId(prodList[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalLoss = damages.reduce((acc, d) => acc + d.lossAmount, 0);

  const handleRecordDamage = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    if (damagedQty <= 0) {
      error('Quantity must be greater than 0');
      return;
    }
    if (damagedQty > prod.currentStock) {
      warning(`Cannot damage more than current stock of ${prod.currentStock}`);
      return;
    }

    const lossAmount = damagedQty * prod.purchaseRate;
    const reasonText = customReason.trim() || reasonCategory.replace('_', ' ');

    const newDamage: DamageStock = {
      id: `dmg-${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      quantity: damagedQty,
      unit: prod.unit,
      purchaseRate: prod.purchaseRate,
      lossAmount,
      reason: reasonText,
      reportedBy: currentUser.fullName,
      createdAt: new Date().toISOString(),
    };

    // Save and reduce active inventory
    StorageService.saveDamagedStock(newDamage);
    StorageService.updateProductStock(
      prod.id,
      -damagedQty,
      'DAMAGE',
      newDamage.id,
      `Damaged cracker write-off: ${reasonText}`,
      currentUser.fullName
    );

    success(`Recorded ${damagedQty} damaged items for "${prod.name}" (Loss: ₹${lossAmount})`);
    setIsModalOpen(false);
    setDamagedQty(1);
    setCustomReason('');
    loadData();
  };

  return (
    <div id="damage-stock-root" className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Damaged Fireworks & Scrap Register</h2>
            <p className="text-xs text-slate-400">
              Record damp crackers, broken spark fuses, transit damage, and write off loss from stock
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-bold bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-rose-400">
            Total Scrap Loss: ₹{totalLoss.toLocaleString('en-IN')}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950 transition-colors"
          >
            <Plus className="w-4 h-4" /> Record Damaged Cracker
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
            <tr>
              <th className="p-3">Date & Time</th>
              <th className="p-3">Cracker Item</th>
              <th className="p-3 text-center">Damaged Qty</th>
              <th className="p-3 text-right">Cost Rate</th>
              <th className="p-3 text-right">Scrap Loss</th>
              <th className="p-3">Reason / Cause</th>
              <th className="p-3">Reported By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {damages.map((dmg) => (
              <tr key={dmg.id} className="hover:bg-slate-800/40">
                <td className="p-3 text-slate-400">
                  {new Date(dmg.createdAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="p-3 font-bold text-slate-100">{dmg.productName}</td>
                <td className="p-3 text-center font-mono text-rose-400 font-bold">
                  {dmg.quantity} {dmg.unit}
                </td>
                <td className="p-3 text-right font-mono text-slate-400">₹{dmg.purchaseRate}</td>
                <td className="p-3 text-right font-mono font-bold text-rose-400">₹{dmg.lossAmount}</td>
                <td className="p-3 text-slate-300">{dmg.reason}</td>
                <td className="p-3 text-slate-400">{dmg.reportedBy}</td>
              </tr>
            ))}
            {damages.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No damaged cracker entries recorded. Zero inventory loss!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Record Damage Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Record Damaged Cracker Write-off
            </h3>

            <form onSubmit={handleRecordDamage} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Cracker Item *</label>
                <select
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.currentStock} {p.unit} in stock - Cost: ₹{p.purchaseRate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Damaged Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={damagedQty}
                  onChange={(e) => setDamagedQty(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Damage Category</label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value as any)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                >
                  <option value="DAMP_MOISTURE">Damp / Rain Moisture Damaged</option>
                  <option value="FUSE_FAIL">Broken / Missing Fuse</option>
                  <option value="BROKEN_BOX">Transit Crushed / Broken Packaging</option>
                  <option value="MISFIRE_TEST">Sample Test Firing Discard</option>
                  <option value="OTHER">Other Defect</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Additional Notes</label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g. Unusable due to monsoon rain leak in warehouse"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
                >
                  Confirm & Write Off Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
