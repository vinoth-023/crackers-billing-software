import { Sale, ShopProfile } from '../types';
import { StorageService } from './storageService';

export class WhatsAppService {
  /**
   * Cleans and normalizes phone number for WhatsApp deep-linking.
   */
  static normalizePhoneNumber(phone: string): string {
    let clean = (phone || '').replace(/[^0-9]/g, '');
    if (clean.length === 10) {
      clean = '91' + clean; // Default to India country code for 10-digit mobile
    }
    return clean;
  }

  /**
   * Generates a clean, professional, festival-ready WhatsApp text invoice.
   */
  static generateBillMessage(sale: Sale, shopProfile?: ShopProfile): string {
    const shop = shopProfile || StorageService.getShopProfile();
    const config = StorageService.getWhatsAppConfig();

    const dateStr = new Date(sale.invoiceDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let itemsText = '';
    if (config.includeItemDetails) {
      itemsText = '📋 *ITEMS PURCHASED:*\n';
      sale.items.forEach((item, index) => {
        const itemLine = `${index + 1}. *${item.productName}*\n   ${item.quantity} ${item.unit} × ₹${item.sellingRate} = ₹${item.lineTotal}`;
        const disc = item.discountAmount > 0 ? ` _(Disc ₹${item.discountAmount})_` : '';
        itemsText += `${itemLine}${disc}\n`;
      });
      itemsText += '--------------------------------\n';
    }

    const paymentStatus =
      sale.dueAmount > 0
        ? `⚠️ *Balance Due: ₹${sale.dueAmount}*`
        : `✅ *Fully Paid (₹${sale.paidAmount})*`;

    let msg = `🎆 *${shop.shopName.toUpperCase()}* 🎆\n`;
    if (shop.tagline) msg += `_${shop.tagline}_\n`;
    msg += `📍 ${shop.address}, ${shop.city}\n`;
    msg += `📞 Ph: ${shop.phone}\n`;
    msg += `================================\n`;
    msg += `🧾 *INVOICE: ${sale.billNumber}*\n`;
    msg += `📅 Date: ${dateStr}\n`;
    msg += `👤 Customer: *${sale.customerName}*\n`;
    msg += `================================\n`;
    if (itemsText) msg += `${itemsText}`;
    msg += `*Subtotal:* ₹${sale.subtotal}\n`;
    if (sale.totalDiscount > 0) {
      msg += `*Discount:* -₹${sale.totalDiscount}\n`;
    }
    msg += `💰 *GRAND TOTAL: ₹${sale.grandTotal}*\n`;
    msg += `💳 *Payment Mode:* ${sale.paymentMethod}\n`;
    msg += `${paymentStatus}\n`;
    msg += `================================\n`;
    msg += `✨ _${shop.footerMessage || 'Wishing you a Happy and Safe Diwali! Thank You, Visit Again!'}_\n`;

    return msg;
  }

  /**
   * Generates WhatsApp deep link URL.
   */
  static getWhatsAppUrl(phone: string, message: string): string {
    const cleanPhone = this.normalizePhoneNumber(phone);
    const encoded = encodeURIComponent(message);
    if (!cleanPhone || cleanPhone === '919999999999') {
      return `https://wa.me/?text=${encoded}`;
    }
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  /**
   * Opens WhatsApp directly in new tab or native app.
   */
  static sendBillViaWhatsApp(sale: Sale, targetPhone?: string): void {
    const phone = targetPhone || sale.customerWhatsapp || sale.customerMobile;
    const message = this.generateBillMessage(sale);
    const url = this.getWhatsAppUrl(phone, message);
    window.open(url, '_blank');
  }

  /**
   * Uses Web Share API (mobile/PWA native share sheet) with fallback to WhatsApp.
   */
  static async shareBill(sale: Sale, targetPhone?: string): Promise<boolean> {
    const message = this.generateBillMessage(sale);
    const shop = StorageService.getShopProfile();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${shop.shopName} - Bill ${sale.billNumber}`,
          text: message,
        });
        return true;
      } catch {
        // User cancelled or fallback
      }
    }

    this.sendBillViaWhatsApp(sale, targetPhone);
    return true;
  }
}
