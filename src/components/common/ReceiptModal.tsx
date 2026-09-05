import React, { useState } from 'react';
import {
  X,
  Printer,
  Share2,
  PhoneCall,
  CheckCircle2,
  RefreshCw,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Sale, ShopProfile } from '../../types';
import { StorageService } from '../../services/storageService';
import { PrinterManager } from '../../services/printerService';
import { WhatsAppService } from '../../services/whatsappService';
import { useToast } from './Toast';

interface Props {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onNewBill?: () => void;
}

export const ReceiptModal: React.FC<Props> = ({ sale, isOpen, onClose, onNewBill }) => {
  const { success, error, info } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [customMobile, setCustomMobile] = useState('');
  const [viewMode, setViewMode] = useState<'80MM' | 'A4'>('80MM');

  if (!isOpen || !sale) return null;

  const shop: ShopProfile = StorageService.getShopProfile();
  const printerSettings = StorageService.getPrinterSettings();

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatus('Sending to printer...');
    try {
      if (printerSettings.mode === 'NO_PRINTER') {
        window.print();
        success('Browser print dialog opened');
      } else {
        const res = await PrinterManager.printSale(sale);
        if (res.success) {
          success(res.message);
          setPrintStatus('Printed successfully!');
        } else {
          error(res.message);
          setPrintStatus(`Printer error: ${res.message}`);
        }
      }
    } catch (err) {
      error(`Print failed: ${(err as Error).message}`);
      setPrintStatus(`Failed: ${(err as Error).message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleWhatsApp = () => {
    const target = customMobile.trim() || sale.customerWhatsapp || sale.customerMobile;
    WhatsAppService.sendBillViaWhatsApp(sale, target);
    info(`Opening WhatsApp for ${target}...`);
  };

  const handleNativeShare = async () => {
    const target = customMobile.trim() || sale.customerWhatsapp || sale.customerMobile;
    await WhatsAppService.shareBill(sale, target);
    success('Bill shared successfully!');
  };

  const handleBrowserDirectPrint = () => {
    window.print();
  };

  return (
    <div id="receipt-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div id="receipt-modal-container" className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">Bill Completed</h3>
                <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded">
                  {sale.billNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">Inventory updated • Transaction recorded • Zero Tax</p>
            </div>
          </div>
          <button
            id="btn-close-receipt-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs & Actions */}
        <div className="flex items-center justify-between mt-3 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-lg border border-slate-700">
            <button
              id="tab-receipt-80mm"
              onClick={() => setViewMode('80MM')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === '80MM' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              80mm Thermal Slip
            </button>
            <button
              id="tab-receipt-a4"
              onClick={() => setViewMode('A4')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'A4' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              A4 Standard Invoice
            </button>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Active Mode: <strong className="text-slate-200">{printerSettings.mode}</strong>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="flex-1 overflow-y-auto my-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          {viewMode === '80MM' ? (
            <div
              id="thermal-receipt-printable"
              className="max-w-[340px] mx-auto bg-white text-black p-5 rounded shadow-lg font-mono text-xs leading-relaxed print:w-full print:max-w-none print:shadow-none"
            >
              {/* Receipt Header */}
              <div className="text-center pb-2 border-b border-dashed border-gray-400">
                <div className="font-bold text-base tracking-tight leading-tight">{shop.shopName}</div>
                {shop.tagline && <div className="text-[10px] text-gray-700 italic">{shop.tagline}</div>}
                <div className="text-[11px] mt-0.5">{shop.address}, {shop.city}</div>
                <div className="text-[11px]">Ph: {shop.phone}</div>
                {shop.billHeader && <div className="font-semibold text-[10px] mt-1 uppercase">{shop.billHeader}</div>}
              </div>

              {/* Meta */}
              <div className="py-2 border-b border-dashed border-gray-400 text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Bill No: <strong>{sale.billNumber}</strong></span>
                  <span>{new Date(sale.invoiceDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date: {new Date(sale.invoiceDate).toLocaleDateString('en-IN')}</span>
                  <span>Cashier: {sale.cashierName}</span>
                </div>
                <div className="truncate">Customer: <strong>{sale.customerName}</strong> ({sale.customerMobile})</div>
              </div>

              {/* Items Table */}
              <div className="py-2 border-b border-dashed border-gray-400">
                <div className="grid grid-cols-12 font-bold text-[10px] pb-1 border-b border-gray-300">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                <div className="divide-y divide-gray-100 text-[11px]">
                  {sale.items.map((item, idx) => (
                    <div key={idx} className="py-1">
                      <div className="grid grid-cols-12">
                        <span className="col-span-6 font-semibold truncate">{item.productName}</span>
                        <span className="col-span-2 text-center">{item.quantity}</span>
                        <span className="col-span-2 text-right">{item.sellingRate}</span>
                        <span className="col-span-2 text-right font-bold">{item.lineTotal}</span>
                      </div>
                      {item.discountAmount > 0 && (
                        <div className="text-[9px] text-gray-600 pl-1 italic">
                          Item Disc: -₹{item.discountAmount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="py-2 border-b border-dashed border-gray-400 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal ({sale.items.length} items):</span>
                  <span>₹{sale.subtotal.toFixed(2)}</span>
                </div>
                {sale.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Total Discount:</span>
                    <span>-₹{sale.totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-400">
                  <span>GRAND TOTAL:</span>
                  <span>₹{sale.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Paid ({sale.paymentMethod}):</span>
                  <span className="font-semibold">₹{sale.paidAmount.toFixed(2)}</span>
                </div>
                {sale.dueAmount > 0 && (
                  <div className="flex justify-between font-bold text-rose-700 bg-rose-50 p-1 rounded">
                    <span>Balance Due:</span>
                    <span>₹{sale.dueAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center pt-2 text-[10px] text-gray-700 space-y-0.5">
                <div className="font-semibold text-gray-900">{shop.footerMessage || 'Thank You! Visit Again'}</div>
                <div>*** NO TAX INVOICE ***</div>
                <div className="text-[9px] text-gray-500">Software: Fireworks POS</div>
              </div>
            </div>
          ) : (
            <div
              id="a4-receipt-printable"
              className="max-w-xl mx-auto bg-white text-black p-6 rounded shadow-lg text-xs leading-relaxed"
            >
              <div className="flex justify-between items-start border-b-2 border-orange-500 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-orange-600">{shop.shopName}</h2>
                  <p className="text-gray-600">{shop.address}, {shop.city} - {shop.pincode}</p>
                  <p className="text-gray-600">Mobile: {shop.phone} | WhatsApp: {shop.whatsappNumber}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-orange-100 text-orange-800 font-bold rounded">
                    INVOICE
                  </span>
                  <p className="font-mono font-bold mt-1 text-sm">{sale.billNumber}</p>
                  <p className="text-gray-500">{new Date(sale.invoiceDate).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 my-3 p-2 bg-gray-50 rounded">
                <div>
                  <span className="text-gray-500 font-semibold uppercase text-[10px]">Bill To:</span>
                  <p className="font-bold text-sm">{sale.customerName}</p>
                  <p className="text-gray-600">Ph: {sale.customerMobile}</p>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 font-semibold uppercase text-[10px]">Payment Details:</span>
                  <p className="font-semibold">Mode: {sale.paymentMethod}</p>
                  <p className="text-emerald-700 font-bold">Paid: ₹{sale.paidAmount}</p>
                  {sale.dueAmount > 0 && <p className="text-rose-700 font-bold">Due: ₹{sale.dueAmount}</p>}
                </div>
              </div>

              <table className="w-full my-3 border-collapse text-left">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="p-2">#</th>
                    <th className="p-2">Item Description</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Disc</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sale.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-gray-500">{idx + 1}</td>
                      <td className="p-2 font-medium">{it.productName}</td>
                      <td className="p-2 text-center">{it.quantity} {it.unit}</td>
                      <td className="p-2 text-right">₹{it.sellingRate}</td>
                      <td className="p-2 text-right text-gray-600">₹{it.discountAmount}</td>
                      <td className="p-2 text-right font-bold">₹{it.lineTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end my-3">
                <div className="w-64 space-y-1 text-right">
                  <div className="flex justify-between py-1 border-t">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>₹{sale.subtotal.toFixed(2)}</span>
                  </div>
                  {sale.totalDiscount > 0 && (
                    <div className="flex justify-between py-1 text-emerald-700">
                      <span>Discount:</span>
                      <span>-₹{sale.totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 font-bold text-base border-t-2 border-gray-800">
                    <span>Grand Total:</span>
                    <span>₹{sale.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3 text-center text-gray-600 text-[11px]">
                <p className="font-semibold text-gray-900">{shop.footerMessage}</p>
                <p>Tax Free Simple Retail Invoice</p>
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp & Print Actions */}
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-3 shrink-0">
          {/* Custom WhatsApp Number input if needed */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="receipt-whatsapp-phone-input"
                type="tel"
                placeholder={sale.customerWhatsapp || sale.customerMobile || 'Enter 10-digit WhatsApp number'}
                value={customMobile}
                onChange={(e) => setCustomMobile(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
              />
            </div>
            <button
              id="btn-send-receipt-whatsapp"
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <Share2 className="w-4 h-4" />
              Send WhatsApp
            </button>
            <button
              id="btn-native-share-bill"
              onClick={handleNativeShare}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              title="Share Bill via Native Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                id="btn-print-receipt-action"
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors shadow-md shadow-orange-950"
              >
                {isPrinting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Print ({printerSettings.mode})
              </button>

              <button
                id="btn-browser-dialog-print"
                onClick={handleBrowserDirectPrint}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors"
              >
                <FileText className="w-4 h-4" />
                Browser Print / PDF
              </button>
            </div>

            <div className="flex items-center gap-2">
              {onNewBill && (
                <button
                  id="btn-receipt-new-bill"
                  onClick={() => {
                    onClose();
                    onNewBill();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors shadow-md shadow-emerald-950"
                >
                  <Sparkles className="w-4 h-4" />
                  New Bill (F9)
                </button>
              )}
              <button
                id="btn-receipt-done"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>

          {printStatus && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
              <span>{printStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
