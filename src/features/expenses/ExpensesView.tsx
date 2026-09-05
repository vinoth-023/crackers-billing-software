import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, IndianRupee, Calendar, Filter, PieChart as PieIcon } from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Expense } from '../../types';
import { useToast } from '../../components/common/Toast';

export const ExpensesView: React.FC = () => {
  const { success, error } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formCategory, setFormCategory] = useState<string>('RENT');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formPaymentMode, setFormPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  const currentUser = StorageService.getCurrentUser();

  const loadExpenses = () => {
    setExpenses(StorageService.getExpenses());
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const totalExpense = expenses.reduce((acc, e) => acc + e.amount, 0);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      error('Expense title is required');
      return;
    }
    if (formAmount <= 0) {
      error('Amount must be greater than 0');
      return;
    }

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory as any,
      amount: formAmount,
      date: new Date(formDate).toISOString(),
      paymentMethod: formPaymentMode,
      notes: formNotes.trim(),
      createdBy: currentUser.fullName,
      createdAt: new Date().toISOString(),
    };

    StorageService.saveExpense(newExp);
    success(`Expense of ₹${formAmount} recorded!`);
    setIsModalOpen(false);
    setFormTitle('');
    setFormAmount(0);
    setFormNotes('');
    loadExpenses();
  };

  const handleDeleteExpense = (id: string) => {
    const confirm = window.confirm('Are you sure you want to delete this expense record?');
    if (!confirm) return;
    StorageService.deleteExpense(id);
    success('Expense deleted.');
    loadExpenses();
  };

  return (
    <div id="expenses-view-root" className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Shop Operating Expenses</h2>
            <p className="text-xs text-slate-400">
              Track cracker shop rent, transport, electricity, seasonal staff wages, and license fees
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-bold bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-amber-400">
            Total Expenses: ₹{totalExpense.toLocaleString('en-IN')}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-950 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Expense Title</th>
              <th className="p-3">Category</th>
              <th className="p-3">Payment Mode</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Recorded By</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {expenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-slate-800/40">
                <td className="p-3 text-slate-400">
                  {new Date(exp.date).toLocaleDateString('en-IN')}
                </td>
                <td className="p-3">
                  <div className="font-bold text-slate-100">{exp.title}</div>
                  {exp.notes && <div className="text-[10px] text-slate-400">{exp.notes}</div>}
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-amber-400 border border-slate-700">
                    {exp.category}
                  </span>
                </td>
                <td className="p-3 font-semibold">{exp.paymentMethod}</td>
                <td className="p-3 text-right font-mono font-bold text-white">₹{exp.amount}</td>
                <td className="p-3 text-slate-400">{exp.createdBy}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="p-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No shop expenses recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              Record Shop Operating Expense
            </h3>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Temporary Fireworks Stall Rental (Diwali Week)"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="RENT">Shop / Stall Rent</option>
                    <option value="ELECTRICITY">Electricity / Generator Fuel</option>
                    <option value="SALARY">Staff Daily Wages</option>
                    <option value="TRANSPORT">Lorry / Tempo Transport</option>
                    <option value="PACKING">Carton & Packing Materials</option>
                    <option value="FOOD_TEA">Staff Food & Tea</option>
                    <option value="LICENSE_FEES">Fire Safety / License Fees</option>
                    <option value="MAINTENANCE">Shop Maintenance</option>
                    <option value="OTHER">Other Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Amount ₹ *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm font-bold text-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {['CASH', 'UPI', 'BANK_TRANSFER'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormPaymentMode(m as any)}
                      className={`p-2 rounded-xl border font-bold text-[10px] ${
                        formPaymentMode === m
                          ? 'bg-amber-600 border-amber-500 text-white'
                          : 'bg-slate-950 border-slate-700 text-slate-400'
                      }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Notes / Voucher Reference</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Paid to electricity board or lorry driver"
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
