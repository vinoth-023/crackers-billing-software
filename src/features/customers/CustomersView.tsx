import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  IndianRupee,
  Phone,
  MessageSquare,
  FileText,
  CreditCard,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Customer, CustomerLedgerEntry } from '../../types';
import { useToast } from '../../components/common/Toast';

export const CustomersView: React.FC = () => {
  const { success, error } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledgers, setLedgers] = useState<CustomerLedgerEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustForLedger, setSelectedCustForLedger] = useState<Customer | null>(null);

  // Add Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formOpeningDue, setFormOpeningDue] = useState<number>(0);

  // Receive Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payCust, setPayCust] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [payNotes, setPayNotes] = useState('');

  const currentUser = StorageService.getCurrentUser();

  const loadData = () => {
    setCustomers(StorageService.getCustomers());
    setLedgers(StorageService.getCustomerLedgers());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.customerCode?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totalOutstandingDues = customers.reduce((acc, c) => acc + (c.currentDue > 0 ? c.currentDue : 0), 0);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMobile.trim()) {
      error('Customer Name and Mobile are required.');
      return;
    }

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      customerCode: `CUST-${String(customers.length + 1).padStart(4, '0')}`,
      name: formName.trim(),
      mobile: formMobile.trim(),
      whatsappNumber: formMobile.trim(),
      city: formCity.trim() || 'Local',
      address: formAddress.trim(),
      openingDue: formOpeningDue,
      currentDue: formOpeningDue,
      totalPurchased: 0,
      totalPaid: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveCustomer(newCust);

    if (formOpeningDue > 0) {
      StorageService.recordCustomerLedger({
        customerId: newCust.id,
        customerName: newCust.name,
        type: 'OPENING_BALANCE',
        debit: formOpeningDue,
        credit: 0,
        balance: formOpeningDue,
        description: 'Opening credit balance upon account creation',
        createdBy: currentUser.fullName,
      });
    }

    success(`Customer ${newCust.name} saved!`);
    setIsAddModalOpen(false);
    setFormName('');
    setFormMobile('');
    setFormCity('');
    setFormAddress('');
    setFormOpeningDue(0);
    loadData();
  };

  const handleOpenReceivePayment = (cust: Customer) => {
    setPayCust(cust);
    setPayAmount(cust.currentDue > 0 ? cust.currentDue : 0);
    setPayMode('CASH');
    setPayNotes('Customer dues settlement');
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCust) return;
    if (payAmount <= 0) {
      error('Payment amount must be greater than 0');
      return;
    }

    const newBalance = Math.max(0, payCust.currentDue - payAmount);
    payCust.currentDue = newBalance;
    payCust.totalPaid = (payCust.totalPaid || 0) + payAmount;
    payCust.updatedAt = new Date().toISOString();

    StorageService.saveCustomer(payCust);

    StorageService.recordCustomerLedger({
      customerId: payCust.id,
      customerName: payCust.name,
      type: 'PAYMENT_RECEIVED',
      debit: 0,
      credit: payAmount,
      balance: newBalance,
      description: `Payment received via ${payMode}. ${payNotes}`,
      createdBy: currentUser.fullName,
    });

    success(`Received ₹${payAmount} from ${payCust.name}! New Due: ₹${newBalance}`);
    setIsPaymentModalOpen(false);
    loadData();
    if (selectedCustForLedger?.id === payCust.id) {
      setSelectedCustForLedger(payCust);
    }
  };

  const custLedgerEntries = useMemo(() => {
    if (!selectedCustForLedger) return [];
    return ledgers.filter((l) => l.customerId === selectedCustForLedger.id);
  }, [ledgers, selectedCustForLedger]);

  return (
    <div id="customers-view-root" className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto overflow-y-auto h-full flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Customers & Credit Due Ledgers</h2>
              <p className="text-xs text-slate-400">
                Track customer contact profiles, credit purchases, and due payment histories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono font-bold bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-amber-400">
              Total Customer Due: ₹{totalOutstandingDues.toLocaleString('en-IN')}
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-950 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative pt-2 border-t border-slate-800">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-5 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer by name, mobile number, city, or ID code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
          />
        </div>
      </div>

      {/* Main Customers Display (Mobile Cards + Desktop Table) */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        {/* Mobile View: Customer Cards */}
        <div className="md:hidden overflow-y-auto flex-1 p-3 space-y-2.5">
          {filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-white text-sm leading-snug">{cust.name}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <Phone className="w-3 h-3 text-orange-400" />
                    <span>{cust.mobile || 'No Mobile'}</span>
                    <span>•</span>
                    <span>{cust.city || 'Tamil Nadu'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Current Due</span>
                  {cust.currentDue > 0 ? (
                    <span className="text-amber-400 font-bold font-mono text-sm">₹{cust.currentDue}</span>
                  ) : (
                    <span className="text-slate-500 font-mono text-xs">Nil (Paid)</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-800/80 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Total Purchased</span>
                  <span className="text-slate-200">₹{cust.totalPurchased || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Total Paid</span>
                  <span className="text-emerald-400 font-bold">₹{cust.totalPaid || 0}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setSelectedCustForLedger(cust)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" /> Ledger Statement
                </button>
                <button
                  onClick={() => handleOpenReceivePayment(cust)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  + Pay Due
                </button>
              </div>
            </div>
          ))}
          {filteredCustomers.length === 0 && (
            <div className="p-8 text-center text-slate-500">No customer profiles match your search.</div>
          )}
        </div>

        {/* Desktop View: Full Responsive Table */}
        <div className="hidden md:block overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
              <tr>
                <th className="p-3">Customer ID / Name</th>
                <th className="p-3">Contact Details</th>
                <th className="p-3">City / Address</th>
                <th className="p-3 text-right">Total Purchased</th>
                <th className="p-3 text-right">Total Paid</th>
                <th className="p-3 text-right">Current Due</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredCustomers.map((cust) => (
                <tr key={cust.id} className="hover:bg-slate-800/40">
                  <td className="p-3">
                    <div className="font-bold text-slate-100">{cust.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{cust.customerCode}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{cust.mobile}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-300">
                    <div>{cust.city}</div>
                    {cust.address && <div className="text-[10px] text-slate-400 truncate max-w-xs">{cust.address}</div>}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-300">₹{cust.totalPurchased || 0}</td>
                  <td className="p-3 text-right font-mono text-emerald-400">₹{cust.totalPaid || 0}</td>
                  <td className="p-3 text-right font-mono font-bold">
                    {cust.currentDue > 0 ? (
                      <span className="text-amber-400 font-black">₹{cust.currentDue}</span>
                    ) : (
                      <span className="text-slate-500">₹0</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedCustForLedger(cust)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                        title="View Full Statement Ledger"
                      >
                        <FileText className="w-3 h-3" /> Ledger
                      </button>
                      <button
                        onClick={() => handleOpenReceivePayment(cust)}
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-bold transition-colors"
                        title="Record Payment from Customer"
                      >
                        + Pay Due
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Ledger Statement Drawer / Modal */}
      {selectedCustForLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Account Statement: {selectedCustForLedger.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedCustForLedger.mobile} • {selectedCustForLedger.city}
                </p>
              </div>
              <button onClick={() => setSelectedCustForLedger(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">TOTAL PURCHASED</span>
                <strong className="text-white font-mono text-sm">₹{selectedCustForLedger.totalPurchased || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">TOTAL PAID</span>
                <strong className="text-emerald-400 font-mono text-sm">₹{selectedCustForLedger.totalPaid || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">CURRENT OUTSTANDING DUE</span>
                <strong className="text-amber-400 font-mono text-base">₹{selectedCustForLedger.currentDue || 0}</strong>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Particulars</th>
                    <th className="p-2.5 text-right">Debit (+)</th>
                    <th className="p-2.5 text-right">Credit (-)</th>
                    <th className="p-2.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {custLedgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 text-slate-400">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold">{entry.type.replace('_', ' ')}</div>
                        <div className="text-[10px] text-slate-400">{entry.description}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono text-rose-400">
                        {entry.debit > 0 ? `₹${entry.debit}` : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-400">
                        {entry.credit > 0 ? `₹${entry.credit}` : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-white">
                        ₹{entry.balance}
                      </td>
                    </tr>
                  ))}
                  {custLedgerEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        No transactions recorded in customer ledger yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setSelectedCustForLedger(null);
                  handleOpenReceivePayment(selectedCustForLedger);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Record Payment
              </button>
              <button
                onClick={() => setSelectedCustForLedger(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Add Customer Account
            </h3>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ramesh Fireworks Trader"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Mobile / WhatsApp Number *</label>
                <input
                  type="tel"
                  required
                  value={formMobile}
                  onChange={(e) => setFormMobile(e.target.value)}
                  placeholder="e.g. 9842100000"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">City / Town</label>
                <input
                  type="text"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="e.g. Sivakasi / Madurai"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Full Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Main Road, Near Market"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Opening Credit Due Balance ₹</label>
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Payment Modal */}
      {isPaymentModalOpen && payCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              Receive Due Payment: {payCust.name}
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">CURRENT OUTSTANDING DUE</span>
                <strong className="text-base font-black text-amber-400 font-mono">₹{payCust.currentDue}</strong>
              </div>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Amount Received ₹ *</label>
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
                <label className="text-slate-300 font-semibold block mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {['CASH', 'UPI', 'BANK_TRANSFER'].map((mode) => (
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
                <label className="text-slate-300 font-semibold block mb-1">Notes / Receipt Ref</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Cash received at shop counter"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Save Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
