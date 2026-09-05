import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { ToastProvider } from './components/common/Toast';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';

// Features
import { DashboardView } from './features/dashboard/DashboardView';
import { BillingView } from './features/billing/BillingView';
import { SalesHistoryView } from './features/sales/SalesHistoryView';
import { ProductsView } from './features/products/ProductsView';
import { PurchasesView } from './features/purchases/PurchasesView';
import { StockManagementView } from './features/stock/StockManagementView';
import { CustomersView } from './features/customers/CustomersView';
import { SuppliersView } from './features/suppliers/SuppliersView';
import { ReportsView } from './features/reports/ReportsView';
import { SettingsView } from './features/settings/SettingsView';

import { StorageService } from './services/storageService';
import { FirestoreSync } from './services/firestoreSyncService';
import { NavigationTab, User, Sale } from './types';
import { ReceiptModal } from './components/common/ReceiptModal';
import { auth, signOutUser } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getAuthorizedUser, initializeBillCounters, migrateLegacyStaffRecords } from './services/authService';
import { Login } from './components/Login';
import { AdminManagementView } from './features/admin/AdminManagementView';
import { PrinterConnectionView } from './features/settings/PrinterConnectionView';
import { EmergencyCallView } from './features/admin/EmergencyCallView';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('BILLING');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Initialize Firebase Firestore synchronization on app launch
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        const authorized = firebaseUser ? await getAuthorizedUser(firebaseUser.uid) : null;
        setCurrentUser(authorized);
        if (authorized) { StorageService.setCurrentUser(authorized); if (authorized.role === 'ADMIN') { await migrateLegacyStaffRecords(); await initializeBillCounters(); } await FirestoreSync.initSync(); }
      } catch (error) { console.warn('Firebase authorization/sync failed:', error); setCurrentUser(null); }
      finally { setAuthReady(true); }
    });
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => { unsubscribe(); window.removeEventListener('beforeinstallprompt', handleInstallPrompt); };
  }, []);

  useEffect(() => {
    if (currentUser) setActiveTab(currentUser.role === 'BILLING_STAFF' ? 'BILLING' : 'DASHBOARD');
  }, [currentUser]);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setShowInstallBanner(false);
  };

  // Global Keyboard Navigation (F1, F2, F3, F4, F8)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      const isInput = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT';

      if (e.key === 'F1') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('BILLING');
      } else if (e.key === 'F3' && !isInput) {
        e.preventDefault();
        setActiveTab('SALES_HISTORY');
      } else if (e.key === 'F4' && !isInput) {
        e.preventDefault();
        setActiveTab('PRODUCTS');
      } else if (e.key === 'F8' && !isInput) {
        e.preventDefault();
        setActiveTab('STOCK');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUserChange = (u: User) => {
    StorageService.setCurrentUser(u);
    setCurrentUser(u);
  };

  if (!authReady) return <div className="min-h-screen bg-slate-950" />;
  if (!currentUser) return <Login onLogin={() => undefined} />;

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'DASHBOARD':
        return <DashboardView onNavigate={handleTabChange} onOpenReceipt={setReceiptSale} />;
      case 'BILLING':
        return (
          <BillingView
            onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
            onSaleCompleted={(sale) => setReceiptSale(sale)}
          />
        );
      case 'SALES_HISTORY':
        return <SalesHistoryView onOpenReceipt={setReceiptSale} />;
      case 'PRODUCTS':
        return <ProductsView />;
      case 'STOCK':
        return <StockManagementView />;
      case 'CUSTOMERS':
        return <CustomersView />;
      case 'PURCHASES':
        return <PurchasesView />;
      case 'SUPPLIERS':
        return <SuppliersView />;
      case 'REPORTS':
        return <ReportsView />;
      case 'SETTINGS':
        return <SettingsView />;
      case 'BRANCHES': return <AdminManagementView tab="BRANCHES" />;
      case 'USERS': return <AdminManagementView tab="STAFF" />;
      case 'EMERGENCY': return currentUser.role === 'BILLING_STAFF' ? <EmergencyCallView /> : <AdminManagementView tab="EMERGENCY" />;
      case 'PRINTER': return <PrinterConnectionView />;
      default:
        return <BillingView onOpenShortcuts={() => setIsShortcutsModalOpen(true)} />;
    }
  };

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden antialiased select-none">
        {showInstallBanner && installPrompt && (
          <div className="fixed bottom-20 md:bottom-4 left-3 right-3 md:left-auto md:right-4 md:w-96 z-[60] flex items-center gap-3 rounded-2xl border border-orange-500/40 bg-slate-900 p-3 shadow-2xl shadow-black/40">
            <div className="rounded-xl bg-orange-500/15 p-2 text-orange-400"><Download className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><p className="text-sm font-bold text-white">Install Fireworks POS</p><p className="text-[11px] text-slate-400">Use billing faster like a mobile app.</p></div>
            <button onClick={handleInstallApp} className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white">Install</button>
            <button onClick={() => setShowInstallBanner(false)} className="p-1 text-slate-400 hover:text-white" aria-label="Dismiss install prompt"><X className="h-4 w-4" /></button>
          </div>
        )}
        {/* Sidebar Navigation (Desktop + Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          onTabSelect={handleTabChange}
          currentUser={currentUser}
          onLogout={() => { signOutUser(); setCurrentUser(null); }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Header
            activeTab={activeTab}
            currentUser={currentUser}
            onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
            onUserChange={handleUserChange}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
            onTabSelect={handleTabChange}
          />

          {/* Main View Area with Mobile Bottom Nav Padding */}
          <main className="flex-1 overflow-hidden relative bg-slate-950/60 pb-0 md:pb-0">
            {renderActiveView()}
          </main>

          {/* Mobile Bottom Navigation Bar (Visible only on < md) */}
          <MobileBottomNav
            activeTab={activeTab}
            onTabSelect={handleTabChange}
            onToggleMenu={() => setIsMobileMenuOpen(true)}
            currentUser={currentUser}
          />
        </div>

        {/* Global Thermal Receipt Modal */}
        <ReceiptModal
          sale={receiptSale}
          isOpen={Boolean(receiptSale)}
          onClose={() => setReceiptSale(null)}
        />

        {/* Keyboard Shortcuts Helper */}
        {isShortcutsModalOpen && (
          <KeyboardShortcutsModal onClose={() => setIsShortcutsModalOpen(false)} />
        )}
      </div>
    </ToastProvider>
  );
}
