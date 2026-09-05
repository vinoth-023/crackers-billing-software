import React, { useState, useEffect } from 'react';
import { UserCog, Plus, Shield, CheckCircle2, XCircle, Trash2, KeyRound } from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { User, UserRole } from '../../types';
import { useToast } from '../../components/common/Toast';

export const UsersView: React.FC = () => {
  const { success, error, warning } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('BILLING_STAFF');
  const [pin, setPin] = useState('1234');
  const [allowRateEdit, setAllowRateEdit] = useState(false);
  const [allowDiscount, setAllowDiscount] = useState(false);
  const [allowBillCancel, setAllowBillCancel] = useState(false);

  const currentUser = StorageService.getCurrentUser();

  const loadUsers = () => {
    setUsers(StorageService.getUsers());
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRolePreset = (r: UserRole) => {
    setRole(r);
    if (r === 'OWNER' || r === 'ADMIN') {
      setAllowRateEdit(true);
      setAllowDiscount(true);
      setAllowBillCancel(true);
    } else if (r === 'BILLING_STAFF') {
      setAllowRateEdit(false);
      setAllowDiscount(true);
      setAllowBillCancel(false);
    } else {
      setAllowRateEdit(false);
      setAllowDiscount(false);
      setAllowBillCancel(false);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim()) {
      error('Username and Full Name are required.');
      return;
    }

    const newUser: User = {
      id: editingUser ? editingUser.id : `usr-${Date.now()}`,
      username: username.trim().toLowerCase(),
      fullName: fullName.trim(),
      role,
      pin: pin.trim() || '1234',
      isActive: true,
      permissions: {
        dashboard: true,
        billing: role === 'OWNER' || role === 'ADMIN' || role === 'BILLING_STAFF',
        products: role === 'OWNER' || role === 'ADMIN' || role === 'STOCK_STAFF',
        purchases: role === 'OWNER' || role === 'ADMIN' || role === 'STOCK_STAFF',
        stock: role === 'OWNER' || role === 'ADMIN' || role === 'STOCK_STAFF',
        customers: true,
        suppliers: role === 'OWNER' || role === 'ADMIN' || role === 'STOCK_STAFF',
        reports: role === 'OWNER' || role === 'ADMIN',
        expenses: role === 'OWNER' || role === 'ADMIN',
        settings: role === 'OWNER' || role === 'ADMIN',
        users: role === 'OWNER',
        canEditRate: allowRateEdit,
        canGiveDiscount: allowDiscount,
        canCancelBill: allowBillCancel,
        canViewReports: role === 'OWNER' || role === 'ADMIN',
        canManageStock: role === 'OWNER' || role === 'ADMIN' || role === 'STOCK_STAFF',
        canManageUsers: role === 'OWNER',
      },
    };

    StorageService.saveUser(newUser);
    success(`User account "${newUser.fullName}" saved!`);
    setIsModalOpen(false);
    loadUsers();
  };

  const handleDeleteUser = (u: User) => {
    if (u.id === currentUser.id) {
      error('You cannot delete your own active logged-in account.');
      return;
    }
    const confirm = window.confirm(`Delete user account "${u.fullName}"?`);
    if (!confirm) return;
    StorageService.deleteUser(u.id);
    success('User deleted.');
    loadUsers();
  };

  return (
    <div id="users-view-root" className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Staff Users & Role-Based Permissions (RBAC)</h2>
            <p className="text-xs text-slate-400">
              Manage billing counter staff, stock managers, and access permissions for rate/discount editing
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingUser(null);
            setUsername('');
            setFullName('');
            setPin('1234');
            handleRolePreset('BILLING_STAFF');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => {
          const isMe = u.id === currentUser.id;
          return (
            <div
              key={u.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {u.fullName} {isMe && <span className="text-[10px] text-emerald-400 font-normal">(You)</span>}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">@{u.username}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {u.role.replace('_', ' ')}
                </span>
              </div>

              {/* Permission Pills */}
              <div className="space-y-1 text-[11px] pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Edit Cracker Rate:</span>
                  {u.permissions.canEditRate ? (
                    <span className="text-emerald-400 font-semibold">Allowed</span>
                  ) : (
                    <span className="text-slate-500">Locked</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Discount Authority:</span>
                  {u.permissions.canGiveDiscount ? (
                    <span className="text-emerald-400 font-semibold">Allowed</span>
                  ) : (
                    <span className="text-slate-500">Locked</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Cancel Invoices:</span>
                  {u.permissions.canCancelBill ? (
                    <span className="text-emerald-400 font-semibold">Allowed</span>
                  ) : (
                    <span className="text-slate-500">Locked</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-[10px] font-mono text-slate-500">PIN: {u.pin}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingUser(u);
                      setUsername(u.username);
                      setFullName(u.fullName);
                      setRole(u.role);
                      setPin(u.pin || '1234');
                      setAllowRateEdit(u.permissions.canEditRate);
                      setAllowDiscount(u.permissions.canGiveDiscount);
                      setAllowBillCancel(u.permissions.canCancelBill);
                      setIsModalOpen(true);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Edit
                  </button>
                  {!isMe && (
                    <button
                      onClick={() => handleDeleteUser(u)}
                      className="text-rose-400 hover:text-rose-300 font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              {editingUser ? 'Edit Staff Account' : 'Add New Staff Member'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Senthil Kumar"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. senthil"
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">4-Digit Login PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="e.g. 1234"
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-center tracking-widest font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Role Preset</label>
                <select
                  value={role}
                  onChange={(e) => handleRolePreset(e.target.value as any)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                >
                  <option value="BILLING_STAFF">Counter Billing Staff (Fast POS)</option>
                  <option value="STOCK_STAFF">Godown / Stock Keeper</option>
                  <option value="ADMIN">Shop Manager (Full Access)</option>
                  <option value="OWNER">Store Owner (Super Admin)</option>
                </select>
              </div>

              {/* Custom Permission Checkboxes */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="text-slate-400 font-bold block text-[10px] uppercase">
                  Counter POS Permission Controls
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRateEdit}
                    onChange={(e) => setAllowRateEdit(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600"
                  />
                  <span>Can change/override selling rate on counter</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDiscount}
                    onChange={(e) => setAllowDiscount(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600"
                  />
                  <span>Can apply bill discounts & free gifts</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowBillCancel}
                    onChange={(e) => setAllowBillCancel(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600"
                  />
                  <span>Can cancel / void completed invoices</span>
                </label>
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
