import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Printer,
  MessageSquare,
  Database,
  ShieldAlert,
  Save,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  Sliders,
  FileText,
  Flame,
  Cloud,
  AlertTriangle,
  Server,
  Activity,
  Usb,
  ExternalLink,
  Search,
  Unplug,
  Check,
  Zap,
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { PrinterManager } from '../../services/printerService';
import { FirestoreSync, FirebaseStats } from '../../services/firestoreSyncService';
import { ShopSettings, AuditLog } from '../../types';
import { useToast } from '../../components/common/Toast';

export const SettingsView: React.FC<{ initialTab?: 'FIREBASE'|'SHOP'|'PRINTER'|'WHATSAPP'|'BACKUP'|'AUDIT'; printerOnly?: boolean }> = ({ initialTab = 'FIREBASE', printerOnly = false }) => {
  const { success, error, info, warning } = useToast();

  const [settings, setSettings] = useState<ShopSettings>(StorageService.getSettings());
  const [activeTab, setActiveTab] = useState<'FIREBASE' | 'SHOP' | 'PRINTER' | 'WHATSAPP' | 'BACKUP' | 'AUDIT'>(initialTab);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(StorageService.getAuditLogs());
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [isScanningSerial, setIsScanningSerial] = useState(false);
  const [pairedDeviceStatus, setPairedDeviceStatus] = useState<{ isConnected: boolean; message: string; deviceName?: string }>({
    isConnected: false,
    message: 'No printer paired yet',
  });
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [fbStats, setFbStats] = useState<FirebaseStats>(FirestoreSync.getStats());
  const [billingConfig, setBillingConfig] = useState(StorageService.getBillingConfig());

  useEffect(() => {
    setSettings(StorageService.getSettings());
    setBillingConfig(StorageService.getBillingConfig());
    setAuditLogs(StorageService.getAuditLogs());

    // Check device status
    PrinterManager.getDeviceStatus().then((st) => setPairedDeviceStatus(st));

    const unsub = FirestoreSync.onStatsChange((stats) => {
      setFbStats(stats);
    });

    return () => unsub();
  }, []);

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    StorageService.saveSettings(settings);
    StorageService.updateBillingConfig(billingConfig);
    FirestoreSync.syncBillingConfig(billingConfig).catch((err) => error(err?.message || 'Invoice settings sync failed'));
    success('Shop settings updated and synchronized successfully!');
  };

  const handleResetInvoiceCounter = async () => {
    const user = StorageService.getCurrentUser();
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') { error('Only an admin can reset the global invoice series.'); return; }
    const next = Math.max(1, Number(billingConfig.startingNumber) || 1);
    await FirestoreSync.resetGlobalInvoiceCounter(next);
    success(`Global invoice series reset. Next bill: ${billingConfig.billPrefix}${String(next).padStart(6, '0')}`);
  };

  const handleScanPairSerial = async () => {
    setIsScanningSerial(true);
    info('Opening browser USB/Serial device selector...');
    try {
      const baud = settings.printer.baudRate || 9600;
      const res = await PrinterManager.scanAndPairSerial(baud);
      if (res.success) {
        success(res.message);
        setPairedDeviceStatus({ isConnected: true, message: res.message, deviceName: res.deviceName });
        // Set mode to SERIAL if paired
        const updated = {
          ...settings,
          printer: { ...settings.printer, mode: 'SERIAL' as const },
        };
        setSettings(updated);
        StorageService.saveSettings(updated);
      } else {
        error(res.message);
        setPairedDeviceStatus({ isConnected: false, message: res.message });
      }
    } catch (err: any) {
      error(`Pairing failed: ${err.message || err}`);
    } finally {
      setIsScanningSerial(false);
    }
  };

  const handleDisconnectSerial = async () => {
    await PrinterManager.disconnectSerial();
    setPairedDeviceStatus({ isConnected: false, message: 'Printer disconnected' });
    info('Serial printer disconnected.');
  };

  const handleOpenInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  };

  const handleTestPrint = async (customMode?: any) => {
    setIsTestingPrinter(true);
    try {
      const mode = customMode || settings.printer.mode;
      const res = await PrinterManager.testPrint({ mode });
      if (res.success) {
        success(res.message);
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err?.message || 'Printer test failed');
    } finally {
      setIsTestingPrinter(false);
    }
  };

  const handleConnectPrinter = async () => {
    const updated = { ...settings, printer: { ...settings.printer, mode: 'CONNECTOR' as const, connectorUrl: window.location.origin } };
    setSettings(updated);
    StorageService.saveSettings(updated);
    await PrinterManager.getActiveService('CONNECTOR').connect();
  };

  const handlePushToFirebase = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await FirestoreSync.pushAllToFirestore();
      if (res.success) {
        success(res.message);
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err?.message || 'Failed to push to Firebase');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handlePullFromFirebase = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await FirestoreSync.pullAllFromFirestore();
      if (res.success) {
        success(res.message);
        setSettings(StorageService.getSettings());
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err?.message || 'Failed to pull from Firebase');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleExportBackup = () => {
    const jsonStr = StorageService.exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fireworks_pos_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    success('Database backup exported!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const res = StorageService.importBackupJson(content);
        if (res.success) {
          success('Database restored successfully! Refreshing...');
          setTimeout(() => {
            window.location.reload();
          }, 800);
        } else {
          error(res.error || 'Failed to restore database.');
        }
      } catch (err: any) {
        error('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetSampleData = () => {
    const confirm = window.confirm(
      'Are you sure you want to reset all local data to Sivakasi Fireworks defaults?'
    );
    if (!confirm) return;

    localStorage.clear();
    success('Database cleared. Reloading standard cracker inventory...');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div id="settings-view-root" className="p-3 sm:p-6 space-y-4 max-w-6xl mx-auto overflow-y-auto h-full flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20 shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                System Settings & Configurations
              </h2>
              <p className="text-xs text-slate-400">
                Firebase live database, shop profile, thermal printer, and WhatsApp integrations
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-950 transition-colors w-full sm:w-auto"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>

        {/* Tab Navigation - Responsive horizontal scrollable tabs */}
        <div className="flex gap-2 pt-2 border-t border-slate-800 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
          {[
            { id: 'FIREBASE', label: 'Firebase Cloud DB', icon: Flame, badge: fbStats.status === 'CONNECTED' ? 'Live' : undefined },
            { id: 'SHOP', label: 'Shop Profile & Rules', icon: Store },
            { id: 'PRINTER', label: 'Thermal Printer', icon: Printer },
            { id: 'WHATSAPP', label: 'WhatsApp Sharing', icon: MessageSquare },
            { id: 'AUDIT', label: 'Audit Logs', icon: FileText },
          ].filter((tab) => !printerOnly || tab.id === 'PRINTER').map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all shrink-0 ${
                  isSel
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSel ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        {/* FIREBASE CLOUD DATABASE TAB */}
        {activeTab === 'FIREBASE' && (
          <div className="space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  Firebase Firestore Cloud Synchronization
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Connected to Project ID: <span className="font-mono text-orange-400 font-bold">college-136ff</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                    fbStats.status === 'CONNECTED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : fbStats.status === 'SYNCING'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                  <span>
                    {fbStats.status === 'CONNECTED'
                      ? 'Live Cloud Sync Active'
                      : fbStats.status === 'SYNCING'
                      ? 'Synchronizing...'
                      : 'Offline / Reconnecting'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-500/30 bg-orange-950/20 p-4 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-orange-300">Global Invoice Series</h4>
                <p className="text-[11px] text-slate-400 mt-1">Shared by admin, every branch, and all staff. Duplicate numbers are prevented by Firebase transactions.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="text-slate-300">Invoice prefix<input value={billingConfig.billPrefix} onChange={e=>setBillingConfig({...billingConfig,billPrefix:e.target.value})} className="mt-1 w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono" placeholder="INV-" /></label>
                <label className="text-slate-300">Reset start number<input type="number" min="1" value={billingConfig.startingNumber} onChange={e=>setBillingConfig({...billingConfig,startingNumber:Number(e.target.value)})} className="mt-1 w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white" /></label>
                <div className="flex items-end"><button type="button" onClick={handleResetInvoiceCounter} className="w-full p-2 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-xl">Reset global series</button></div>
              </div>
              <p className="text-[10px] text-amber-300">Admin only: save prefix/start number first, then reset after removing dummy bills.</p>
            </div>

            {/* Cloud Stats Bento Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl">
                <span className="text-[11px] text-slate-400 block font-medium">Products in DB</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">
                  {fbStats.productsCount} Items
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl">
                <span className="text-[11px] text-slate-400 block font-medium">Customers Logged</span>
                <span className="text-xl font-bold font-mono text-sky-400 mt-1 block">
                  {fbStats.customersCount} Accounts
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl">
                <span className="text-[11px] text-slate-400 block font-medium">Sales Invoices</span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                  {fbStats.salesCount} Bills
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl">
                <span className="text-[11px] text-slate-400 block font-medium">Last Cloud Sync</span>
                <span className="text-xs font-bold font-mono text-amber-400 mt-2 block">
                  {fbStats.lastSyncTime}
                </span>
              </div>
            </div>

            {/* Sync Action Buttons */}
            <div className="bg-slate-950 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                Cloud Database Control Actions
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handlePushToFirebase}
                  disabled={isSyncingCloud}
                  className="flex items-center justify-center gap-2 p-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-orange-950 text-xs"
                >
                  <Upload className="w-4 h-4" />
                  {isSyncingCloud ? 'Uploading to Firestore...' : 'Push Current Products & Inventory to Firebase'}
                </button>

                <button
                  type="button"
                  onClick={handlePullFromFirebase}
                  disabled={isSyncingCloud}
                  className="flex items-center justify-center gap-2 p-3.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 font-bold rounded-xl transition-all border border-slate-700 text-xs"
                >
                  <Download className="w-4 h-4" />
                  {isSyncingCloud ? 'Downloading from Firestore...' : 'Pull Latest Records from Firebase'}
                </button>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <p className="font-semibold text-orange-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Automatic Live Two-Way Replication
                </p>
                <p className="text-slate-400">
                  Firebase Firestore is the only persistent database. Records are loaded from the configured Firebase project and are not cached in browser local storage.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SHOP PROFILE */}
        {activeTab === 'SHOP' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Store className="w-4 h-4 text-orange-400" />
              Store Identity & Thermal Invoice Headers
            </h3>

            <div className="rounded-2xl border border-orange-500/30 bg-orange-950/20 p-4 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-orange-300">Global Invoice Number Series</h4>
                <p className="text-[11px] text-slate-400 mt-1">One shared series for admin, every branch, and all staff. Firebase transactions prevent duplicate numbers.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="text-slate-300">Invoice prefix<input value={billingConfig.billPrefix} onChange={e=>setBillingConfig({...billingConfig,billPrefix:e.target.value})} className="mt-1 w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono" placeholder="INV-" /></label>
                <label className="text-slate-300">Reset start number<input type="number" min="1" value={billingConfig.startingNumber} onChange={e=>setBillingConfig({...billingConfig,startingNumber:Number(e.target.value)})} className="mt-1 w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white" /></label>
                <div className="flex items-end"><button type="button" onClick={handleResetInvoiceCounter} className="w-full p-2 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-xl">Reset global series</button></div>
              </div>
              <p className="text-[10px] text-amber-300">Admin only: use reset after removing dummy bills. Existing invoice numbers will not be changed.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Fireworks Shop Name *</label>
                <input
                  type="text"
                  required
                  value={settings.shopName}
                  onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Tagline / Slogan</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">WhatsApp Support Number</label>
                <input
                  type="tel"
                  value={settings.whatsappNumber}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-300 font-semibold block mb-1">Shop Address</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">City / Town</label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">State & Pincode</label>
                <input
                  type="text"
                  value={`${settings.state} - ${settings.pincode}`}
                  onChange={(e) => {
                    const parts = e.target.value.split('-');
                    setSettings({
                      ...settings,
                      state: parts[0]?.trim() || settings.state,
                      pincode: parts[1]?.trim() || settings.pincode,
                    });
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-300 font-semibold block mb-1">Thermal Receipt Footer Message</label>
                <input
                  type="text"
                  value={settings.footerMessage}
                  onChange={(e) => setSettings({ ...settings, footerMessage: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  placeholder="Thank You! Happy & Safe Diwali!"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase">POS Rules & Restrictions</h4>

              <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowNegativeStock}
                  onChange={(e) => setSettings({ ...settings, allowNegativeStock: e.target.checked })}
                  className="rounded border-slate-700 text-orange-600 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-white block">Allow Negative Stock Billing</span>
                  <span className="text-[11px] text-slate-400">
                    If enabled, billing staff can sell crackers even before physical purchase stock is logged.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer pt-2 border-t border-slate-800">
                <input
                  type="checkbox"
                  checked={settings.allowDiscounts}
                  onChange={(e) => setSettings({ ...settings, allowDiscounts: e.target.checked })}
                  className="rounded border-slate-700 text-orange-600 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-white block">Allow Bill-Level & Item-Level Discounts</span>
                  <span className="text-[11px] text-slate-400">Enable festival discount percentages and rupee deductions in POS.</span>
                </div>
              </label>
            </div>
          </form>
        )}

        {/* PRINTER SETTINGS (3 MODES) */}
        {activeTab === 'PRINTER' && (
          <div className="space-y-5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Printer className="w-4 h-4 text-orange-400" />
                  Thermal Receipt Printer & POS Hardware Setup
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Connect 58mm / 80mm ESC/POS Thermal Printers via Web Serial USB, Connector Service, or Browser PDF.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTestPrint()}
                  disabled={isTestingPrinter}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isTestingPrinter ? 'Sending Test...' : 'Run Test Print'}
                </button>
                <button
                  onClick={handleConnectPrinter}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-950 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Connect Android App
                </button>
              </div>
            </div>

            {/* Hardware Scanner & Pairing Hub (For Web Serial) */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                    <Usb className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                      <span>Web Serial USB / COM Port Connection</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          pairedDeviceStatus.isConnected
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {pairedDeviceStatus.isConnected ? '🟢 Device Connected' : '⚪ Not Connected'}
                      </span>
                    </h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {pairedDeviceStatus.deviceName || pairedDeviceStatus.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleScanPairSerial}
                    disabled={isScanningSerial}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-sky-950 transition-all active:scale-95"
                  >
                    <Search className="w-3.5 h-3.5" />
                    {isScanningSerial ? 'Scanning Ports...' : '🔍 Scan & Pair Thermal Printer'}
                  </button>

                  {pairedDeviceStatus.isConnected && (
                    <button
                      onClick={handleDisconnectSerial}
                      className="px-3 py-2 bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  )}

                  <button
                    onClick={handleOpenInNewTab}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5"
                    title="Open app in direct new tab for unrestricted USB hardware access"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
                    Open in Full Tab
                  </button>
                </div>
              </div>

              {/* Iframe Notice & Permission Helper */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-slate-300 text-[11px] space-y-1.5">
                <p className="flex items-center gap-1.5 font-semibold text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Note for Hardware Web Serial:
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Web Serial direct port pairing requires direct top-level browser access. If your browser restricts port selection inside an iframe, simply click <strong className="text-white">"Open in Full Tab"</strong> or choose <strong className="text-orange-400">"Mode 3: PDF / Browser Print"</strong> which requires zero drivers and prints on any phone, tablet, or PC!
                </p>
              </div>
            </div>

            {/* Mode Picker Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Mode 1: Connector */}
              <div
                onClick={() => {
                  const upd = { ...settings, printer: { ...settings.printer, mode: 'CONNECTOR' as const } };
                  setSettings(upd);
                  StorageService.saveSettings(upd);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  settings.printer.mode === 'CONNECTOR'
                    ? 'bg-orange-950/20 border-orange-500 ring-1 ring-orange-500'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">Mode 1: Connector App</span>
                  {settings.printer.mode === 'CONNECTOR' && <CheckCircle2 className="w-4 h-4 text-orange-400" />}
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Opens the Android Cloth Printer Connector using the <code>cloth-print://</code> bridge flow. It prints 80mm ESC/POS over Bluetooth Classic SPP.
                </p>
                <div className="mt-3 text-[10px] font-mono text-orange-300 bg-orange-950/50 p-1.5 rounded-md border border-orange-900/50 truncate">
                  Target: {settings.printer.connectorUrl}
                </div>
              </div>

              {/* Mode 2: Web Serial API */}
              <div
                onClick={() => {
                  const upd = { ...settings, printer: { ...settings.printer, mode: 'SERIAL' as const } };
                  setSettings(upd);
                  StorageService.saveSettings(upd);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  settings.printer.mode === 'SERIAL'
                    ? 'bg-orange-950/20 border-orange-500 ring-1 ring-orange-500'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">Mode 2: Web Serial (USB)</span>
                  {settings.printer.mode === 'SERIAL' && <CheckCircle2 className="w-4 h-4 text-orange-400" />}
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Direct browser USB/COM port connection using Chrome Web Serial API. Sends raw ESC/POS binary commands.
                </p>
                <div className="mt-3 text-[10px] font-mono text-sky-300 bg-sky-950/50 p-1.5 rounded-md border border-sky-900/50">
                  Baud: {settings.printer.baudRate || 9600} bps
                </div>
              </div>

              {/* Mode 3: No-Printer / Browser Native */}
              <div
                onClick={() => {
                  const upd = { ...settings, printer: { ...settings.printer, mode: 'NO_PRINTER' as const } };
                  setSettings(upd);
                  StorageService.saveSettings(upd);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  settings.printer.mode === 'NO_PRINTER'
                    ? 'bg-orange-950/20 border-orange-500 ring-1 ring-orange-500'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">Mode 3: PDF / WhatsApp</span>
                  {settings.printer.mode === 'NO_PRINTER' && <CheckCircle2 className="w-4 h-4 text-orange-400" />}
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Standard Browser Print Dialog (Save as PDF) + 1-Tap WhatsApp bill dispatch. No hardware needed.
                </p>
                <div className="mt-3 text-[10px] font-mono text-emerald-300 bg-emerald-950/50 p-1.5 rounded-md border border-emerald-900/50">
                  Paper: {settings.printer.paperWidth}
                </div>
              </div>
            </div>

            {/* Mode-Specific Hardware Options */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase">Hardware Parameters</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Paper Roll Width</label>
                  <select
                    value={settings.printer.paperWidth}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        printer: { ...settings.printer, paperWidth: e.target.value as any },
                      })
                    }
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="58mm">58mm (2-inch Thermal - 32 chars/line)</option>
                    <option value="80mm">80mm (3-inch Thermal - 48 chars/line)</option>
                  </select>
                </div>

                {settings.printer.mode === 'CONNECTOR' && (
                  <div className="sm:col-span-2">
                    <label className="text-slate-400 block mb-1">Bridge API Base URL</label>
                    <input
                      type="url"
                      value={settings.printer.connectorUrl}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          printer: { ...settings.printer, connectorUrl: e.target.value },
                        })
                      }
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs"
                      placeholder="https://your-billing-domain.example"
                    />
                  </div>
                )}

                {settings.printer.mode === 'SERIAL' && (
                  <div className="sm:col-span-2">
                    <label className="text-slate-400 block mb-1">Serial Baud Rate</label>
                    <select
                      value={settings.printer.baudRate || 9600}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          printer: { ...settings.printer, baudRate: Number(e.target.value) },
                        })
                      }
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    >
                      <option value={9600}>9600 bps (Standard POS Thermal)</option>
                      <option value={19200}>19200 bps</option>
                      <option value={38400}>38400 bps</option>
                      <option value={115200}>115200 bps (High Speed USB)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-wrap gap-4 text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.printer.autoPrintOnSave}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        printer: { ...settings.printer, autoPrintOnSave: e.target.checked },
                      })
                    }
                    className="rounded border-slate-700 text-orange-600 w-4 h-4"
                  />
                  <span>Auto-print receipt immediately upon Bill Save / F9</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.printer.openCashDrawer}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        printer: { ...settings.printer, openCashDrawer: e.target.checked },
                      })
                    }
                    className="rounded border-slate-700 text-orange-600 w-4 h-4"
                  />
                  <span>Send ESC/POS Cash Drawer Kick pulse</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* WHATSAPP */}
        {activeTab === 'WHATSAPP' && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              WhatsApp Instant Receipt Dispatch Configuration
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Default Message Header Text</label>
                <textarea
                  rows={4}
                  value={settings.whatsapp.messageHeader}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsapp: { ...settings.whatsapp, messageHeader: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs leading-relaxed"
                  placeholder="Greeting text displayed at the top of the WhatsApp message"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-200 block mb-1">WhatsApp Share Preview:</span>
                <p className="italic">
                  "Hello [Customer Name]! Thank you for purchasing crackers from [Shop Name]. Here is your Bill #[Bill No] total of ₹[Total]. Wishing you a safe & prosperous festival!"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BACKUP & RESTORE */}
        {activeTab === 'BACKUP' && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Database className="w-4 h-4 text-orange-400" />
              Local Database Backup & Restore Utility
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-400" /> Export JSON Backup
                  </h4>
                  <p className="text-slate-400 text-xs mt-1">
                    Download a full snapshot of all products, stock, sales history, and customer ledgers to a JSON file.
                  </p>
                </div>
                <button
                  onClick={handleExportBackup}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Backup File
                </button>
              </div>

              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4 text-sky-400" /> Restore from JSON Backup
                  </h4>
                  <p className="text-slate-400 text-xs mt-1">
                    Upload a previously exported JSON backup file to overwrite and restore complete store records.
                  </p>
                </div>
                <label className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer text-center">
                  <Upload className="w-4 h-4" /> Choose Backup File (.json)
                  <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                </label>
              </div>
            </div>

            <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-rose-400 text-sm block">Reset to Sivakasi Defaults</span>
                <span className="text-slate-400 text-xs">
                  Clears local cache and reloads default fireworks catalog.
                </span>
              </div>
              <button
                onClick={handleResetSampleData}
                className="px-4 py-2 bg-rose-900 hover:bg-rose-800 text-rose-100 font-bold rounded-xl transition-colors self-start sm:self-auto"
              >
                Reset Database
              </button>
            </div>
          </div>
        )}

        {/* AUDIT LOGS */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <FileText className="w-4 h-4 text-orange-400" />
              System Audit Trail & Security Log
            </h3>

            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No audit logs recorded yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-200">{log.action}</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">{log.details}</p>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono text-left sm:text-right shrink-0">
                      <div>{log.userName}</div>
                      <div>{log.date} {log.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
