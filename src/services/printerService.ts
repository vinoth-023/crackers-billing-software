import { Sale, ShopProfile, PrinterSettings, PrintReceiptResult, PrinterMode } from '../types';
import { StorageService } from './storageService';

export interface PairedDeviceStatus {
  isConnected: boolean;
  deviceName?: string;
  baudRate?: number;
  mode: PrinterMode;
  error?: string;
}

export interface IPrinterService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<{ isConnected: boolean; message: string; deviceName?: string }>;
  printReceipt(sale: Sale, shop: ShopProfile, isDuplicate?: boolean): Promise<PrintReceiptResult>;
  testPrint(shop: ShopProfile): Promise<PrintReceiptResult>;
}

// 1. Connector App Service (Mode 1: Android / Localhost Printer Bridge)
export class ConnectorPrinterService implements IPrinterService {
  private getBaseUrl(): string {
    const configured = StorageService.getPrinterSettings().connectorUrl;
    const isDeepLink = configured === 'cloth-print://' || configured.startsWith('cloth-print://');
    const isLegacyLocal = configured === 'http://localhost' || configured === 'http://localhost:8080';
    const base = isDeepLink || isLegacyLocal || !configured
      ? (typeof window !== 'undefined' ? window.location.origin : '')
      : configured;
    return base.replace(/\/$/, '');
  }

  private openLink(link: string): void {
    if (typeof window === 'undefined') throw new Error('Printer connector is available only in a browser.');
    window.location.href = link;
  }

  private deepLink(host: 'connect' | 'test' | 'print', params: Record<string, string>): string {
    const query = new URLSearchParams(params);
    return `cloth-print://${host}?${query.toString()}`;
  }

  async connect(): Promise<void> {
    const token = crypto.randomUUID();
    this.openLink(this.deepLink('connect', {
      baseUrl: this.getBaseUrl(),
      pairingToken: token,
      returnUrl: typeof window !== 'undefined' ? window.location.href : '',
    }));
  }

  async disconnect(): Promise<void> {}

  async getStatus(): Promise<{ isConnected: boolean; message: string; deviceName?: string }> {
    const settings = StorageService.getPrinterSettings();
    return settings.connectorStatus === 'CONNECTED'
      ? { isConnected: true, message: 'Cloth Printer Connector paired.', deviceName: 'Android Bluetooth SPP connector' }
      : { isConnected: false, message: 'Connect the Android Cloth Printer Connector first.' };
  }

  async printReceipt(sale: Sale, shop: ShopProfile, isDuplicate = false): Promise<PrintReceiptResult> {
    const settings = StorageService.getPrinterSettings();
    const payload = {
      type: 'FIREWORKS_RECEIPT_80MM',
      isDuplicate,
      shop: {
        name: shop.shopName,
        address: shop.address,
        city: shop.city,
        phone: shop.phone,
        footer: shop.footerMessage,
      },
      invoice: {
        billNumber: sale.billNumber,
        date: new Date(sale.invoiceDate).toLocaleString('en-IN'),
        customerName: sale.customerName,
        customerMobile: sale.customerMobile,
        paymentMethod: sale.paymentMethod,
        subtotal: sale.subtotal,
        discount: sale.totalDiscount,
        grandTotal: sale.grandTotal,
        paid: sale.paidAmount,
        due: sale.dueAmount,
        items: sale.items.map((i) => ({
          name: i.productName,
          qty: i.quantity,
          rate: i.sellingRate,
          discount: i.discountAmount,
          total: i.lineTotal,
        })),
      },
      options: {
        width: settings.printerWidth || '80mm',
        cutPaper: true,
        openDrawer: true,
      },
    };

    const link = this.deepLink('print', {
      baseUrl: this.getBaseUrl(), billId: sale.id, shopId: 'local-shop',
      requestToken: crypto.randomUUID(), returnUrl: window.location.href,
    });
    this.openLink(link);
    return { success: true, message: `Bill ${sale.billNumber} sent to Android printer connector.`, printerMode: 'CONNECTOR' };
  }

  async testPrint(shop: ShopProfile): Promise<PrintReceiptResult> {
    this.openLink(this.deepLink('test', { baseUrl: this.getBaseUrl(), returnUrl: window.location.href }));
    return { success: true, message: `Test print opened in Android connector for ${shop.shopName}.`, printerMode: 'CONNECTOR' };
  }
}

// 2. Serial Thermal Printer Service (Mode 2: Web Serial ESC/POS)
export class SerialPrinterService implements IPrinterService {
  private port: any = null;
  private writer: any = null;
  private pairedDeviceName: string = 'Thermal POS Printer (Web Serial)';

  async scanAndPair(baudRate = 9600): Promise<{ success: boolean; message: string; deviceName?: string }> {
    if (!('serial' in navigator)) {
      return {
        success: false,
        message: 'Web Serial API is not supported in this browser. Please use Google Chrome or Edge.',
      };
    }

    try {
      // Disconnect prior if open
      await this.disconnect();

      // Request user to select port
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate });
      this.writer = this.port.writable.getWriter();

      const info = this.port.getInfo ? this.port.getInfo() : {};
      const devName = info.usbVendorId
        ? `USB POS Printer (VID: ${info.usbVendorId.toString(16)}, PID: ${info.usbProductId?.toString(16)})`
        : `Serial COM Port (${baudRate} bps)`;
      
      this.pairedDeviceName = devName;

      return {
        success: true,
        message: `Paired successfully to ${devName}`,
        deviceName: devName,
      };
    } catch (err) {
      const errMsg = (err as Error).message || '';
      if (errMsg.includes('disallowed by permissions policy') || errMsg.includes('Permissions-Policy')) {
        return {
          success: false,
          message:
            'Browser iframe restricted Web Serial. Please open the app in a new browser tab/window for direct hardware USB/Serial port access.',
        };
      }
      return {
        success: false,
        message: `Serial connection failed: ${errMsg}`,
      };
    }
  }

  async connect(): Promise<void> {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API is not supported in this browser. Use Chrome or Browser Print Mode.');
    }

    if (this.port && this.writer) {
      return;
    }

    const settings = StorageService.getPrinterSettings();
    const result = await this.scanAndPair(settings.serialBaudRate || 9600);
    if (!result.success) {
      throw new Error(result.message);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.writer) {
        await this.writer.releaseLock();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (err) {
      console.warn('Error during serial disconnect:', err);
    }
  }

  async getStatus(): Promise<{ isConnected: boolean; message: string; deviceName?: string }> {
    if (!('serial' in navigator)) {
      return { isConnected: false, message: 'Web Serial not supported in this browser environment' };
    }
    if (this.port && this.writer) {
      return { isConnected: true, message: 'Serial printer port open & ready', deviceName: this.pairedDeviceName };
    }
    return { isConnected: false, message: 'No Serial printer paired. Click "Scan & Pair" to connect.' };
  }

  private encodeEscPosText(text: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(text);
  }

  async printReceipt(sale: Sale, shop: ShopProfile, isDuplicate = false): Promise<PrintReceiptResult> {
    try {
      if (!this.writer) {
        await this.connect();
      }

      const ESC = '\x1B';
      const GS = '\x1D';

      let data = `${ESC}@`; // Initialize
      data += `${ESC}a\x01`; // Center align
      data += `${ESC}E\x01${shop.shopName}\n${ESC}E\x00`; // Bold shop name
      data += `${shop.address}, ${shop.city}\n`;
      data += `Phone: ${shop.phone}\n`;
      data += `--------------------------------\n`;
      if (isDuplicate) {
        data += `*** DUPLICATE COPY ***\n`;
      }
      data += `Bill No: ${sale.billNumber}\n`;
      data += `Date: ${new Date(sale.invoiceDate).toLocaleString('en-IN')}\n`;
      data += `Customer: ${sale.customerName}\n`;
      data += `${ESC}a\x00`; // Left align
      data += `--------------------------------\n`;
      data += `Item            Qty  Rate  Total\n`;
      data += `--------------------------------\n`;

      for (const item of sale.items) {
        const name = (item.productName || '').substring(0, 14).padEnd(14, ' ');
        const qty = String(item.quantity).padStart(3, ' ');
        const rate = String(Math.round(item.sellingRate)).padStart(5, ' ');
        const total = String(Math.round(item.lineTotal)).padStart(6, ' ');
        data += `${name} ${qty} ${rate} ${total}\n`;
      }

      data += `--------------------------------\n`;
      data += `${ESC}a\x02`; // Right align
      data += `Subtotal: Rs.${sale.subtotal.toFixed(2)}\n`;
      if (sale.totalDiscount > 0) {
        data += `Discount: Rs.${sale.totalDiscount.toFixed(2)}\n`;
      }
      data += `${ESC}E\x01Grand Total: Rs.${sale.grandTotal.toFixed(2)}${ESC}E\x00\n`;
      data += `Paid (${sale.paymentMethod}): Rs.${sale.paidAmount.toFixed(2)}\n`;
      if (sale.dueAmount > 0) {
        data += `Balance Due: Rs.${sale.dueAmount.toFixed(2)}\n`;
      }

      data += `${ESC}a\x01`; // Center align
      data += `--------------------------------\n`;
      data += `${shop.footerMessage || 'Thank You! Happy & Safe Diwali!'}\n`;
      data += `*** NO TAX INVOICE ***\n\n\n`;
      data += `${GS}V\x41\x03`; // Cut paper

      const bytes = this.encodeEscPosText(data);
      await this.writer.write(bytes);

      return {
        success: true,
        message: 'Printed successfully to Serial 80mm Printer!',
        printerMode: 'SERIAL',
      };
    } catch (err) {
      return {
        success: false,
        message: `Serial print failed: ${(err as Error).message}. Sale saved safely!`,
        printerMode: 'SERIAL',
        error: (err as Error).message,
      };
    }
  }

  async testPrint(shop: ShopProfile): Promise<PrintReceiptResult> {
    try {
      if (!this.writer) {
        await this.connect();
      }
      const ESC = '\x1B';
      const GS = '\x1D';
      let data = `${ESC}@${ESC}a\x01`;
      data += `${ESC}E\x01${shop.shopName}${ESC}E\x00\n`;
      data += `SERIAL PRINTER TEST OK\n`;
      data += `Date: ${new Date().toLocaleString('en-IN')}\n`;
      data += `80mm Thermal Mode Active\n\n\n`;
      data += `${GS}V\x41\x03`;

      const bytes = this.encodeEscPosText(data);
      await this.writer.write(bytes);

      return { success: true, message: 'Serial test print sent successfully!', printerMode: 'SERIAL' };
    } catch (err) {
      return {
        success: false,
        message: `Serial test print error: ${(err as Error).message}`,
        printerMode: 'SERIAL',
        error: (err as Error).message,
      };
    }
  }
}

// 3. Browser Print / Native PDF / WhatsApp Mode (Universal Fallback & Default)
export class NoPrinterService implements IPrinterService {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async getStatus(): Promise<{ isConnected: boolean; message: string; deviceName?: string }> {
    return {
      isConnected: true,
      message: 'Browser Print & PDF Ready (Zero Drivers Required)',
      deviceName: 'System Browser Print Dialog / PDF / WhatsApp',
    };
  }

  async printReceipt(sale: Sale, _shop: ShopProfile, _isDuplicate?: boolean): Promise<PrintReceiptResult> {
    // Triggers standard window print
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.print();
      }, 100);
    }
    return {
      success: true,
      message: `Bill #${sale.billNumber} opened for printing / PDF saving.`,
      printerMode: 'NO_PRINTER',
    };
  }

  async testPrint(shop: ShopProfile): Promise<PrintReceiptResult> {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.print();
      }, 100);
    }
    return {
      success: true,
      message: `Browser Print test triggered for ${shop.shopName}.`,
      printerMode: 'NO_PRINTER',
    };
  }
}

// Printer Factory & Dispatcher
export class PrinterManager {
  private static connectorService = new ConnectorPrinterService();
  public static serialService = new SerialPrinterService();
  private static noPrinterService = new NoPrinterService();

  static getActiveService(mode?: PrinterMode): IPrinterService {
    const currentMode = mode || StorageService.getPrinterSettings().mode;
    switch (currentMode) {
      case 'CONNECTOR':
        return this.connectorService;
      case 'SERIAL':
        return this.serialService;
      case 'NO_PRINTER':
      default:
        return this.noPrinterService;
    }
  }

  static async scanAndPairSerial(baudRate = 9600): Promise<{ success: boolean; message: string; deviceName?: string }> {
    return this.serialService.scanAndPair(baudRate);
  }

  static async disconnectSerial(): Promise<void> {
    return this.serialService.disconnect();
  }

  static async getDeviceStatus(mode?: PrinterMode): Promise<{ isConnected: boolean; message: string; deviceName?: string }> {
    const service = this.getActiveService(mode);
    return service.getStatus();
  }

  static async printSale(sale: Sale, isDuplicate = false): Promise<PrintReceiptResult> {
    const settings = StorageService.getPrinterSettings();
    const shop = StorageService.getShopProfile();

    const service = this.getActiveService(settings.mode);
    return service.printReceipt(sale, shop, isDuplicate);
  }

  static async testPrint(customConfig?: any): Promise<PrintReceiptResult> {
    const settings = StorageService.getPrinterSettings();
    const shop = StorageService.getShopProfile();
    const mode = customConfig?.mode || settings.mode;
    const service = this.getActiveService(mode);
    return service.testPrint(shop);
  }
}
