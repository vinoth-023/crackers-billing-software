import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  IndianRupee,
  Phone,
  FileText,
  CreditCard,
  CheckCircle2,
  XCircle,
  Truck,
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Supplier, SupplierLedgerEntry } from '../../types';
import { useToast } from '../../components/common/Toast';

export const SuppliersView: React.FC = () => {
  const { success, error } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ledgers, setLedgers] = useState<SupplierLedgerEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSupForLedger, setSelectedSupForLedger] = useState<Supplier | null>(null);

  // Add Supplier Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formCity, setFormCity] = useState('Sivakasi');
  const [formAddress, setFormAddress] = useState('');
  const [formGstNumber, setFormGstNumber] = useState('');
  const [formOpeningDue, setFormOpeningDue] = useState<number>(0);

  // Pay Supplier Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paySup, setPaySup] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'BANK_TRANSFER' | 'UPI' | 'CASH' | 'CHEQUE'>('BANK_TRANSFER');
  const [payRef, setPayRef] = useState('');

  const currentUser = StorageService.getCurrentUser();

  const loadData = () => {
    setSuppliers(StorageService.getSuppliers());
    setLedgers(StorageService.getSupplierLedgers());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.mobile.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.contactPerson?.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const totalPayableToSuppliers = suppliers.reduce((acc, s) => acc + (s.currentDue > 0 ? s.currentDue : 0), 0);

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMobile.trim()) {
      error('Supplier name and mobile are required.');
      return;
    }

    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      supplierCode: `SUP-${String(suppliers.length + 1).padStart(3, '0')}`,
      name: formName.trim(),
      contactPerson: formContactPerson.trim(),
      mobile: formMobile.trim(),
      city: formCity.trim() || 'Sivakasi',
      address: formAddress.trim(),
      gstNumber: formGstNumber.trim(),
      openingDue: formOpeningDue,
      currentDue: formOpeningDue,
      totalPurchased: 0,
      totalPaid: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveSupplier(newSup);

    if (formOpeningDue > 0) {
      StorageService.recordSupplierLedger({
        supplierId: newSup.id,
        supplierName: newSup.name,
        type: 'OPENING_BALANCE',
        debit: 0,
        credit: formOpeningDue,
        balance: formOpeningDue,
        description: 'Opening payable balance upon supplier registration',
        createdBy: currentUser.fullName,
      });
    }

    success(`Supplier "${newSup.name}" saved!`);
    setIsAddModalOpen(false);
    setFormName('');
    setFormContactPerson('');
    setFormMobile('');
    setFormAddress('');
    setFormOpeningDue(0);
    loadData();
  };

  const handleOpenPaySupplier = (sup: Supplier) => {
    setPaySup(sup);
    setPayAmount(sup.currentDue > 0 ? sup.currentDue : 0);
    setPayMode('BANK_TRANSFER');
    setPayRef('RTGS/NEFT payment to Sivakasi factory');
    setIsPayModalOpen(true);
  };

  const handleSaveSupplierPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySup) return;
    if (payAmount <= 0) {
      error('Payment amount must be greater than 0');
      return;
    }

    const newBalance = Math.max(0, paySup.currentDue - payAmount);
    paySup.currentDue = newBalance;
    paySup.totalPaid = (paySup.totalPaid || 0) + payAmount;
    paySup.updatedAt = new Date().toISOString();

    StorageService.saveSupplier(paySup);

    StorageService.recordSupplierLedger({
      supplierId: paySup.id,
      supplierName: paySup.name,
      type: 'PAYMENT_MADE',
      debit: payAmount,
      credit: 0,
      balance: newBalance,
      description: `Payment made via ${payMode}. Ref: ${payRef}`,
      createdBy: currentUser.fullName,
    });

    success(`Paid ₹${payAmount} to ${paySup.name}! Remaining Due: ₹${newBalance}`);
    setIsPayModalOpen(false);
    loadData();
    if (selectedSupForLedger?.id === paySup.id) {
      setSelectedSupForLedger(paySup);
    }
  };

  const supLedgerEntries = useMemo(() => {
    if (!selectedSupForLedger) return [];
    return ledgers.filter((l) => l.supplierId === selectedSupForLedger.id);
  }, [ledgers, selectedSupForLedger]);

  return (
    <div id="suppliers-view-root" className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto overflow-y-auto h-full flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Sivakasi Manufacturers & Suppliers</h2>
              <p className="text-xs text-slate-400">
                Manage fireworks vendors, purchase credit balances, and payment ledgers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono font-bold bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-rose-400">
              Total Payable to Suppliers: ₹{totalPayableToSuppliers.toLocaleString('en-IN')}
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Supplier
            </button>
          </div>
        </div>

        <div className="relative pt-2 border-t border-slate-800">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-5 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search suppliers by factory name, contact person, mobile, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
          />
        </div>
      </div>

      {/* Main Suppliers Display (Mobile Cards + Desktop Table) */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        {/* Mobile View: Supplier Cards */}
        <div className="md:hidden overflow-y-auto flex-1 p-3 space-y-2.5">
          {filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-white text-sm leading-snug">{sup.name}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>{sup.mobile || 'No Mobile'}</span>
                    <span>•</span>
                    <span>{sup.city || 'Sivakasi'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Payable Due</span>
                  {sup.currentDue > 0 ? (
                    <span className="text-rose-400 font-bold font-mono text-sm">₹{sup.currentDue}</span>
                  ) : (
                    <span className="text-emerald-400 font-mono text-xs">Nil (Settled)</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-800/80 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Total Invoiced</span>
                  <span className="text-slate-200">₹{sup.totalPurchased || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Total Paid</span>
                  <span className="text-emerald-400 font-bold">₹{sup.totalPaid || 0}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setSelectedSupForLedger(sup)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" /> Ledger Statement
                </button>
                <button
                  onClick={() => handleOpenPaySupplier(sup)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  Pay Supplier
                </button>
              </div>
            </div>
          ))}
          {filteredSuppliers.length === 0 && (
            <div className="p-8 text-center text-slate-500">No supplier profiles found.</div>
          )}
        </div>

        {/* Desktop View: Full Responsive Table */}
        <div className="hidden md:block overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
              <tr>
                <th className="p-3">Supplier Name / Code</th>
                <th className="p-3">Contact Person & Phone</th>
                <th className="p-3">Location / GST</th>
                <th className="p-3 text-right">Total Purchased</th>
                <th className="p-3 text-right">Total Paid</th>
                <th className="p-3 text-right">Payable Balance</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredSuppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-800/40">
                  <td className="p-3">
                    <div className="font-bold text-slate-100">{sup.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{sup.supplierCode}</div>
                  </td>
                  <td className="p-3">
                    <div className="text-slate-200">{sup.contactPerson || 'Sales Desk'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{sup.mobile}</div>
                  </td>
                  <td className="p-3 text-slate-300">
                    <div>{sup.city}</div>
                    {sup.gstNumber && <div className="text-[10px] text-slate-400 font-mono">GST: {sup.gstNumber}</div>}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-300">₹{sup.totalPurchased || 0}</td>
                  <td className="p-3 text-right font-mono text-emerald-400">₹{sup.totalPaid || 0}</td>
                  <td className="p-3 text-right font-mono font-bold">
                    {sup.currentDue > 0 ? (
                      <span className="text-rose-400 font-black">₹{sup.currentDue}</span>
                    ) : (
                      <span className="text-emerald-400">Settled (₹0)</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedSupForLedger(sup)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" /> Ledger
                      </button>
                      <button
                        onClick={() => handleOpenPaySupplier(sup)}
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Pay Supplier
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Ledger Modal */}
      {selectedSupForLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  Supplier Ledger: {selectedSupForLedger.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedSupForLedger.city} • Ph: {selectedSupForLedger.mobile}
                </p>
              </div>
              <button onClick={() => setSelectedSupForLedger(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">TOTAL PURCHASES</span>
                <strong className="text-white font-mono text-sm">₹{selectedSupForLedger.totalPurchased || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">TOTAL PAID</span>
                <strong className="text-emerald-400 font-mono text-sm">₹{selectedSupForLedger.totalPaid || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">CURRENT PAYABLE DUE</span>
                <strong className="text-rose-400 font-mono text-base">₹{selectedSupForLedger.currentDue || 0}</strong>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Particulars</th>
                    <th className="p-2.5 text-right">Debit / Paid (-)</th>
                    <th className="p-2.5 text-right">Credit / Bill (+)</th>
                    <th className="p-2.5 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {supLedgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 text-slate-400">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold">{entry.type.replace('_', ' ')}</div>
                        <div className="text-[10px] text-slate-400">{entry.description}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-400">
                        {entry.debit > 0 ? `₹${entry.debit}` : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-rose-400">
                        {entry.credit > 0 ? `₹${entry.credit}` : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-white">
                        ₹{entry.balance}
                      </td>
                    </tr>
                  ))}
                  {supLedgerEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        No transactions recorded in supplier ledger yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setSelectedSupForLedger(null);
                  handleOpenPaySupplier(selectedSupForLedger);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Pay Supplier
              </button>
              <button
                onClick={() => setSelectedSupForLedger(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Add Fireworks Manufacturer / Supplier
            </h3>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Company / Factory Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Standard Fireworks Ltd"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={formContactPerson}
                  onChange={(e) => setFormContactPerson(e.target.value)}
                  placeholder="e.g. Shanmugam (Manager)"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Mobile / Phone *</label>
                <input
                  type="tel"
                  required
                  value={formMobile}
                  onChange={(e) => setFormMobile(e.target.value)}
                  placeholder="e.g. 04562-220011"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">City / Region</label>
                <input
                  type="text"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="e.g. Sivakasi"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">GSTIN Number (Optional)</label>
                <input
                  type="text"
                  value={formGstNumber}
                  onChange={(e) => setFormGstNumber(e.target.value)}
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Opening Payable Due Balance ₹</label>
                <input
                  type="number"
                  min="0"
                  value={formOpeningDue}
                  onChange={(e) => setFormOpeningDue(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {isPayModalOpen && paySup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              Make Payment to Supplier: {paySup.name}
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">CURRENT PAYABLE BALANCE</span>
                <strong className="text-base font-black text-rose-400 font-mono">₹{paySup.currentDue}</strong>
              </div>
            </div>

            <form onSubmit={handleSaveSupplierPayment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Payment Amount ₹ *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm font-bold text-emerald-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Payment Mode</label>
                <div className="grid grid-cols-4 gap-1">
                  {['BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPayMode(mode as any)}
                      className={`p-2 rounded-xl border font-bold text-[10px] ${
                        payMode === mode
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-700 text-slate-400'
                      }`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Transaction Ref / Notes</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. UTR / Cheque No / RTGS Ref"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Confirm Supplier Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
