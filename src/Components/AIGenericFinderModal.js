import React, { useState } from 'react';
import { FaPills, FaSearch, FaTimes, FaCheck, FaExclamationCircle, FaExchangeAlt } from 'react-icons/fa';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { findGenericSubstitutesClientSide } from '../utils/clientAiService';
import { getLocalInventory } from '../utils/dataStore';

export default function AIGenericFinderModal({ isOpen, onClose, onSelectMedicine }) {
  const [medicineQuery, setMedicineQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleSearch = async (overrideQuery) => {
    const queryToSearch = (overrideQuery || medicineQuery || '').trim();
    if (!queryToSearch) return;
    setLoading(true);
    try {
      const res = await api.post('/ai/find-substitutes', { medicineName: queryToSearch });
      if (res.data && res.data.substitutes) {
        setResult(res.data);
        return;
      }
    } catch (error) {
      console.warn("Backend generic finder offline, analyzing locally:", error);
    }

    // Client-side generic finder
    const localInv = getLocalInventory();
    const clientResult = findGenericSubstitutesClientSide(queryToSearch, localInv);
    if (clientResult) {
      setResult(clientResult);
      toast.success(`Found active salt equivalents for ${queryToSearch}`);
    } else {
      toast.error("No generic substitutes found.");
    }
    setLoading(false);
  };

  const sampleSearches = ["Augmentin 625", "Dolo 650", "Pan 40", "Norvasc 5mg", "Limcee", "Amaryl 2mg"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              <FaExchangeAlt />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">AI Generic & Bio-Equivalent Substitute Finder</h3>
              <p className="text-xs text-teal-100">Instantly locate matched active salts and affordable alternatives</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={medicineQuery}
                onChange={(e) => setMedicineQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter branded or generic medicine name (e.g. Augmentin, Dolo, Pan 40)..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-100"
              />
              <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-sm" />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !medicineQuery.trim()}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-sm transition-all"
            >
              {loading ? 'Analyzing...' : 'Find Matches'}
            </button>
          </div>

          {/* Quick tags */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
            <span>Try:</span>
            {sampleSearches.map((s, idx) => (
              <button
                key={idx}
                onClick={() => { setMedicineQuery(s); handleSearch(s); }}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-900/30 text-slate-700 dark:text-slate-200 rounded-md border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 text-sm">
          {!result && !loading && (
            <div className="text-center py-12 text-slate-400">
              <FaPills className="text-5xl mx-auto mb-3 opacity-30" />
              <p className="font-medium">Type a medicine name to match chemical salts and bio-equivalent in-stock substitutes.</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-teal-50 dark:bg-teal-950/30 p-4 rounded-xl border border-teal-200 dark:border-teal-800 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">Target Molecule Profile</span>
                  <h4 className="font-bold text-slate-800 dark:text-white text-base">{result.searchedMedicine}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    <strong>Active Salt:</strong> {result.activeSalt} ({result.strength}) &bull; <strong>Category:</strong> {result.category}
                  </p>
                </div>
                <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-xs font-bold rounded-lg">
                  {result.substitutes?.length || 0} In-Stock Matches
                </span>
              </div>

              <div className="space-y-2.5">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Available Bio-Equivalent Alternatives
                </h5>

                {(!result.substitutes || result.substitutes.length === 0) ? (
                  <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-center text-slate-500 border border-slate-200 dark:border-slate-700">
                    <FaExclamationCircle className="text-3xl mx-auto mb-2 text-amber-500" />
                    <p className="text-xs">No direct equivalent inventory item found. Consider placing a purchase order with suppliers.</p>
                  </div>
                ) : (
                  result.substitutes.map((sub, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h6 className="font-bold text-slate-800 dark:text-white text-sm">{sub.name}</h6>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sub.matchType === 'Exact Salt Match' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                          }`}>
                            {sub.matchType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {sub.category} &bull; Supplier: {sub.supplier} &bull; Exp: {new Date(sub.expiryDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Available Stock: <span className={sub.quantity < 15 ? 'text-rose-500' : 'text-emerald-600 font-bold'}>{sub.quantity} units</span>
                        </p>
                      </div>

                      <div className="text-right flex flex-col items-end gap-2">
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">
                          ₹{parseFloat(sub.price).toFixed(2)}
                        </span>
                        {onSelectMedicine && (
                          <button
                            onClick={() => {
                              onSelectMedicine(sub);
                              toast.success(`Selected substitute: ${sub.name}`);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                          >
                            <FaCheck className="text-[10px]" /> Select Alternative
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
