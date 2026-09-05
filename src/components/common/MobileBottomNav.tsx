import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  ShoppingBag,
  Boxes,
  Menu,
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { AppUser } from '../../types';

interface Props {
  activeTab: NavigationTab | string;
  onTabSelect: (tab: NavigationTab) => void;
  onToggleMenu: () => void;
  currentUser?: AppUser | null;
}

export const MobileBottomNav: React.FC<Props> = ({
  activeTab,
  onTabSelect,
  onToggleMenu,
  currentUser,
}) => {
  const staff = currentUser?.role === 'BILLING_STAFF';
  if (staff) return <div className="md:hidden h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around safe-area-bottom"><button onClick={()=>onTabSelect('BILLING')} className="flex flex-col items-center text-[10px] text-orange-500"><ReceiptText className="w-5 h-5"/><span>Billing</span></button><button onClick={()=>onTabSelect('PRINTER')} className="flex flex-col items-center text-[10px] text-slate-400"><Boxes className="w-5 h-5"/><span>Printer</span></button><button onClick={onToggleMenu} className="flex flex-col items-center text-[10px] text-slate-400"><Menu className="w-5 h-5"/><span>More</span></button></div>;
  return (
    <div className="md:hidden h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 z-30 shrink-0 select-none safe-area-bottom">
      {/* Dashboard */}
      <button
        onClick={() => onTabSelect('DASHBOARD')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          activeTab === 'DASHBOARD' ? 'text-orange-500 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] mt-1">Dashboard</span>
      </button>

      {/* Bill History */}
      <button
        onClick={() => onTabSelect('SALES_HISTORY')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          activeTab === 'SALES_HISTORY' ? 'text-orange-500 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <ShoppingBag className="w-5 h-5" />
        <span className="text-[10px] mt-1">Bills</span>
      </button>

      {/* Central Big POS Billing Button */}
      <div className="flex-1 flex justify-center -mt-5">
        <button
          onClick={() => onTabSelect('BILLING')}
          className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
            activeTab === 'BILLING'
              ? 'bg-gradient-to-tr from-orange-600 to-amber-500 ring-4 ring-orange-500/20 shadow-orange-950'
              : 'bg-orange-600 hover:bg-orange-500 shadow-orange-950/80'
          }`}
          title="POS Billing"
        >
          <ReceiptText className="w-6 h-6" />
        </button>
      </div>

      {/* Inventory */}
      <button
        onClick={() => onTabSelect('STOCK')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          activeTab === 'STOCK' ? 'text-orange-500 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Boxes className="w-5 h-5" />
        <span className="text-[10px] mt-1">Inventory</span>
      </button>

      {/* Menu Drawer */}
      <button
        onClick={onToggleMenu}
        className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200 transition-colors"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] mt-1">More</span>
      </button>
    </div>
  );
};
