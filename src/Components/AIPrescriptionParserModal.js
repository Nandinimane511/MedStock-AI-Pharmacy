import React, { useState } from 'react';
import { FaFilePrescription, FaTimes, FaMagic, FaCheck } from 'react-icons/fa';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';

export default function AIPrescriptionParserModal({ isOpen, onClose, onApplyItems }) {
  const [prescriptionText, setPrescriptionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);

  if (!isOpen) return null;

  const samplePrescriptions = [
    "Rx:\n1. Augmentin 625 Duo 1-0-1 x 5 days\n2. Paracetamol 650mg 1-1-1 x 3 days\n3. Pan 40 OD before food x 5 days",
    "Prescription:\n- Amoxicillin 500mg (10 tabs) BD\n- Limcee Vitamin C (20 tabs)\n- Levocetirizine 5mg (5 tabs) HS",
    "1. Norvasc 5mg x 30 tabs\n2. Glycomet 500mg x 60 tabs\n3. Telma 40 x 30 tabs"
  ];

  const handleParse = async () => {
    if (!prescriptionText.trim()) {
      toast.error("Please paste or enter prescription text");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/ai/parse-prescription', { prescriptionText });
      setParsedResult(res.data);
      if (res.data.parsedItems?.length > 0) {
        toast.success(`Successfully mapped ${res.data.parsedItems.length} prescription items!`);
      } else {
        toast.error("No exact matching medicines identified in current stock.");
      }
    } catch (error) {
      toast.error("Failed to parse prescription");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!parsedResult || !parsedResult.parsedItems || parsedResult.parsedItems.length === 0) return;
    const formattedForCart = parsedResult.parsedItems.map(item => ({
      name: item.name,
      quantity: item.prescribedQuantity,
      price: item.price
    }));
    onApplyItems(formattedForCart);
    toast.success("Applied items to billing cart!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              <FaFilePrescription />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">AI Prescription Parser & Smart Cart Auto-Fill</h3>
              <p className="text-xs text-blue-100">Automatically translate doctor slips & dosage notes into bill line-items</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Prescription Input */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Paste Prescription Text or Doctor Notes:
          </label>
          <textarea
            rows={4}
            value={prescriptionText}
            onChange={(e) => setPrescriptionText(e.target.value)}
            placeholder="e.g.&#10;1. Augmentin 625 Duo 1-0-1 x 5 days&#10;2. Paracetamol 650mg 1-1-1 x 3 days"
            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
              <span>Samples:</span>
              {samplePrescriptions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrescriptionText(s)}
                  className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 text-[11px]"
                >
                  Sample #{idx + 1}
                </button>
              ))}
            </div>

            <button
              onClick={handleParse}
              disabled={loading || !prescriptionText.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-sm transition-all flex items-center gap-1.5 text-xs"
            >
              <FaMagic /> {loading ? 'Extracting...' : 'Parse Prescription'}
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3 text-sm">
          {!parsedResult && (
            <div className="text-center py-8 text-slate-400 text-xs">
              Paste or select a sample prescription above and click <strong>Parse Prescription</strong>.
            </div>
          )}

          {parsedResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Extracted Medications ({parsedResult.parsedItems?.length || 0})
                </h5>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Est. Subtotal: ₹{parsedResult.estimatedTotal?.toFixed(2)}
                </span>
              </div>

              {parsedResult.parsedItems?.map((item, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <h6 className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</h6>
                    <p className="text-xs text-slate-500">
                      Dosage: <span className="font-semibold text-primary-600 dark:text-primary-400">{item.dosageFrequency}</span> &bull; Stock Available: {item.availableStock}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md">
                      Qty: {item.prescribedQuantity}
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">
                      ₹{item.subtotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}

              {parsedResult.unmapped?.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                  <strong>Unmapped Lines:</strong>
                  {parsedResult.unmapped.map((u, i) => (
                    <div key={i}>&bull; {u.rawText}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {parsedResult && parsedResult.parsedItems?.length > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <FaCheck /> Add All to Billing Cart
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
