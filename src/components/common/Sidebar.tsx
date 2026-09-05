import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  ShoppingBag,
  Package,
  Boxes,
  Truck,
  Building2,
  Users,
  FileSpreadsheet,
  Settings,
  Flame,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
  Printer,
} from 'lucide-react';
import { AppUser, NavigationTab } from '../../types';
import { StorageService } from '../../services/storageService';

interface Props {
  activeTab?: NavigationTab | string;
  onTabSelect?: (tab: NavigationTab) => void;
  currentUser?: AppUser;
  onLogout?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onTabSelect,
  currentUser: propsUser,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const shop = StorageService.getShopProfile();
  const currentUser: AppUser = propsUser || StorageService.getCurrentUser();
  const perms = currentUser?.permissions || {
    dashboard: true,
    billing: true,
    products: true,
    purchases: true,
    stock: true,
    customers: true,
    suppliers: true,
    reports: true,
    expenses: true,
    settings: true,
    users: true,
    canEditRate: true,
    canGiveDiscount: true,
    canCancelBill: true,
  };

  const selectedTab = (activeTab || 'BILLING') as NavigationTab;

  const handleSelect = (tab: NavigationTab) => {
    if (onTabSelect) {
      onTabSelect(tab);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Exactly 10 requested tabs
  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    perm?: boolean;
  }> = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, perm: perms.dashboard !== false },
    { id: 'BILLING', label: 'Billing', icon: ReceiptText, badge: 'POS', perm: perms.billing !== false },
    { id: 'SALES_HISTORY', label: 'Bill History', icon: ShoppingBag, perm: true },
    { id: 'PRODUCTS', label: 'Products', icon: Package, perm: perms.products !== false },
    { id: 'STOCK', label: 'Inventory', icon: Boxes, perm: perms.stock !== false },
    { id: 'CUSTOMERS', label: 'Customers', icon: Users, perm: perms.customers !== false },
    { id: 'PURCHASES', label: 'Purchases', icon: Truck, perm: perms.purchases !== false },
    { id: 'SUPPLIERS', label: 'Suppliers', icon: Building2, perm: perms.suppliers !== false },
    // Reports is a read-only view and must remain discoverable on desktop and mobile.
    // Keep the permission field for future granular report actions, but do not hide the tab.
    { id: 'REPORTS', label: 'Reports', icon: FileSpreadsheet, perm: true },
    { id: 'SETTINGS', label: 'Settings', icon: Settings, perm: perms.settings !== false },
    { id: 'BRANCHES', label: 'Branches', icon: Building2, perm: currentUser.role === 'ADMIN' || currentUser.role === 'OWNER' },
    { id: 'USERS', label: 'Staff', icon: Users, perm: currentUser.role === 'ADMIN' || currentUser.role === 'OWNER' },
    { id: 'EMERGENCY', label: 'Emergency', icon: Phone, perm: currentUser.role === 'ADMIN' || currentUser.role === 'OWNER' || currentUser.role === 'BILLING_STAFF' },
  ];
  const visibleNavItems = currentUser.role === 'BILLING_STAFF'
    ? navItems.filter((item) => item.id === 'BILLING' || item.id === 'PRINTER' || item.id === 'EMERGENCY')
    : navItems;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-100 select-none">
      {/* Brand Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-950 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="truncate">
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider truncate">
                {shop.shopName || 'Fireworks POS'}
              </h2>
              <p className="text-[10px] text-slate-400 truncate">{shop.city || 'Billing & Stock'}</p>
            </div>
          )}
        </div>

        {/* Desktop Collapse button */}
        {!isMobileOpen && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden md:flex"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}

        {/* Mobile Close Drawer Button */}
        {isMobileOpen && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {(currentUser.role === 'BILLING_STAFF' ? [...visibleNavItems, { id: 'PRINTER' as NavigationTab, label: 'Printer', icon: Printer, perm: true }] : visibleNavItems).map((item) => {
          if (item.perm === false) return null;
          const Icon = item.icon;
          const isActive = selectedTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => handleSelect(item.id)}
              title={isCollapsed && !isMobileOpen ? item.label : undefined}
              className={`w-full flex items-center ${
                isCollapsed && !isMobileOpen ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold transition-all group active:scale-98 ${
                isActive
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-950 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-orange-400'
                  }`}
                />
                {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.label}</span>}
              </div>
              {(!isCollapsed || isMobileOpen) && item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 bg-amber-400 text-slate-950 font-black rounded-full shadow-xs">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom User Profile */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-2.5 py-2 rounded-lg bg-slate-800/50 border border-slate-800 text-[11px]">
            <p className="font-semibold text-slate-200 truncate">{shop.shopName}</p>
            <p className="text-slate-400 text-[10px] truncate">{shop.phone ? `Ph: ${shop.phone}` : shop.city}</p>
          </div>
        )}

        <div className={`flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'justify-between'} pt-0.5`}>
          {(!isCollapsed || isMobileOpen) && (
            <div className="text-left truncate mr-2">
              <p className="text-xs font-bold text-slate-200 truncate">{currentUser?.fullName || 'Cashier'}</p>
              <p className="text-[10px] text-orange-400 font-medium truncate">
                {(currentUser?.role || 'OWNER').replace('_', ' ')}
              </p>
            </div>
          )}
          {onLogout && (
            <button
              id="sidebar-btn-logout"
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
              title="Log Out / Switch Account"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside
        id="main-app-sidebar-desktop"
        className={`hidden md:flex flex-col h-full shrink-0 transition-all duration-200 ${
          isCollapsed ? 'w-16' : 'w-60 lg:w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Slide-out Panel */}
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
