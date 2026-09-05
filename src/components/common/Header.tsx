import React, { useState, useEffect } from 'react';
import {
  Flame,
  Wifi,
  WifiOff,
  User,
  Keyboard,
  Maximize2,
  Minimize2,
  Sparkles,
  Menu,
  Check,
  X,
  Shield,
  Cloud,
} from 'lucide-react';
import { AppUser, ShopProfile, NavigationTab } from '../../types';
import { StorageService } from '../../services/storageService';
import { FirestoreSync, FirebaseStats } from '../../services/firestoreSyncService';

interface Props {
  activeTab?: NavigationTab | string;
  onTabSelect?: (tab: NavigationTab) => void;
  onOpenShortcuts?: () => void;
  onToggleMobileMenu?: () => void;
  currentUser?: AppUser;
  onUserChange?: (user: AppUser) => void;
}

export const Header: React.FC<Props> = ({
  activeTab,
  onTabSelect,
  onOpenShortcuts,
  onToggleMobileMenu,
  currentUser: propsUser,
  onUserChange,
}) => {
  const [time, setTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [fbStats, setFbStats] = useState<FirebaseStats>(FirestoreSync.getStats());

  const currentUser: AppUser = propsUser || StorageService.getCurrentUser();
  const isStaffUser = currentUser?.role === 'BILLING_STAFF' || (currentUser?.role as string) === 'STAFF' || (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'OWNER' && currentUser?.email !== 'admin@kannan.com');
  const shop: ShopProfile = StorageService.getShopProfile();
  const allUsers = StorageService.getUsers();

  useEffect(() => {
    const unsub = FirestoreSync.onStatsChange((stats) => {
      setFbStats(stats);
    });

    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSelectUser = (u: AppUser) => {
    StorageService.setCurrentUser(u);
    if (onUserChange) onUserChange(u);
    setIsUserModalOpen(false);
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'BILLING_STAFF':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'STOCK_STAFF':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <header
      id="main-app-header"
      className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between z-30 shrink-0 select-none shadow-xs"
    >
      {/* Left: Mobile Drawer Button + Brand Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg md:hidden transition-colors"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-orange-950 shrink-0">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-xs sm:text-sm text-white tracking-tight leading-tight flex items-center gap-1.5 truncate">
              <span className="truncate">{shop.shopName || 'Fireworks Shop'}</span>
              <span className="hidden xs:inline-block text-[9px] font-bold px-1.5 py-0.2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded uppercase">
                POS
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">
              {shop.city ? `${shop.city} • ` : ''}Fast Retail & Stock
            </p>
          </div>
        </div>
      </div>

      {/* Middle: Desktop Quick Bill Launchpad */}
      <div className="hidden lg:flex items-center gap-2">
        {currentUser?.role !== 'BILLING_STAFF' && <button
          id="hdr-btn-new-bill"
          onClick={() => onTabSelect && onTabSelect('BILLING')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'BILLING'
              ? 'bg-orange-600 text-white shadow-sm shadow-orange-900'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          New Bill (F2)
        </button>}
      </div>

      {/* Right Actions: Clock, Status, Shortcuts, User */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Clock (Desktop) */}
        <div className="hidden sm:flex items-center text-slate-300 text-xs font-mono font-medium px-2 py-1 bg-slate-950/60 rounded-md border border-slate-800/80">
          <span>{time}</span>
        </div>

        {/* Firebase Live Cloud DB Badge */}
        {!isStaffUser && <div
          onClick={() => onTabSelect && onTabSelect('SETTINGS')}
          className={`cursor-pointer flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold border transition-all ${
            fbStats.status === 'CONNECTED'
              ? 'bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25'
              : fbStats.status === 'SYNCING'
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
          title={`Firebase Cloud DB (college-136ff): ${fbStats.status} - Click to configure`}
        >
          <Flame className="w-3 h-3 text-orange-400 shrink-0" />
          <span className="hidden sm:inline">
            {fbStats.status === 'CONNECTED' ? 'Firebase Live' : fbStats.status === 'SYNCING' ? 'Syncing...' : 'Firebase DB'}
          </span>
        </div>}

        {/* Online / Offline Indicator */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold border ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse'
          }`}
          title={isOnline ? 'Network Online' : 'Offline Mode'}
        >
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Keyboard Shortcuts Button (Desktop) */}
        {onOpenShortcuts && (
          <button
            id="hdr-btn-shortcuts"
            onClick={onOpenShortcuts}
            className="hidden md:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Keyboard Shortcuts (F1)"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}

        {/* Fullscreen Toggle */}
        {!isStaffUser && <button
          onClick={toggleFullscreen}
          className="hidden sm:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>}

        {/* User Pill / Switcher */}
        {!isStaffUser && <button
          id="hdr-btn-user-switch"
          onClick={() => setIsUserModalOpen(true)}
          className="flex items-center gap-1.5 pl-1.5 sm:pl-2 pr-2 sm:pr-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition-colors"
          title="Click to Switch User"
        >
          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
          <span className="font-semibold text-slate-200 truncate max-w-[70px] sm:max-w-[100px] text-[11px] sm:text-xs">
            {currentUser?.fullName || 'Cashier'}
          </span>
          <span
            className={`hidden xs:inline-block text-[9px] px-1 py-0.2 rounded border uppercase font-mono ${getRoleBadge(
              currentUser?.role
            )}`}
          >
            {(currentUser?.role || 'OWNER').replace('_', ' ')}
          </span>
        </button>}
      </div>

      {/* Switch User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm text-slate-100">Switch Cashier / Role</h3>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {allUsers.map((u) => {
                const isCurrent = u.id === currentUser?.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? 'bg-orange-500/15 border-orange-500 text-slate-100'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">{u.fullName}</p>
                      <p className="text-[10px] text-slate-400">{u.role.replace('_', ' ')}</p>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-orange-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
