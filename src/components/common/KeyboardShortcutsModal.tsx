import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F2', label: 'Search Fireworks Catalog', desc: 'Focus the product search box or barcode input' },
    { key: 'F4', label: 'Select Customer', desc: 'Open customer selector and mobile input' },
    { key: 'F8', label: 'Switch Payment Mode', desc: 'Toggle between Cash, UPI, Card, Credit, Mixed' },
    { key: 'F9', label: 'Complete Bill', desc: 'Finalize sale, deduct stock, and print/share receipt' },
    { key: 'Ctrl + Enter', label: 'Quick Bill Complete', desc: 'Instantly save and process invoice' },
    { key: 'Esc', label: 'Close / Cancel', desc: 'Dismiss active dialogs or clear focused selection' },
  ];

  return (
    <div id="shortcuts-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div id="shortcuts-modal-card" className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">POS Keyboard Shortcuts</h3>
              <p className="text-xs text-slate-400">High-speed hotkeys optimized for busy festival seasons</p>
            </div>
          </div>
          <button
            id="close-shortcuts-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
              <div>
                <span className="text-sm font-semibold text-slate-200">{sc.label}</span>
                <p className="text-xs text-slate-400">{sc.desc}</p>
              </div>
              <kbd className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-950 text-orange-400 border border-orange-500/30 rounded shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            id="btn-close-shortcuts-dialog"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
