import React from 'react';
import { FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';

export default function AIDrugSafetyAlert({ interactionResult }) {
  if (!interactionResult) return null;

  const { safe, interactionsFound, alerts, message } = interactionResult;

  if (safe) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
            <FaShieldAlt />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              AI Clinical Safety Check <FaCheckCircle className="text-emerald-500 text-xs" />
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              {message || "No adverse drug-drug interactions detected for this prescription."}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-md">
          Safe to Dispense
        </span>
      </div>
    );
  }

  return (
    <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-700 rounded-xl p-4 shadow-md space-y-3 animate-shake">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center text-lg shadow-sm">
            <FaExclamationTriangle className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-rose-900 dark:text-rose-200">
                🚨 AI Clinical Drug Hazard Warning ({interactionsFound} Detected)
              </h4>
              <span className="bg-rose-600 text-white text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full">
                Action Required
              </span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              Potential contraindication or drug-drug interaction found in the current cart.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        {alerts && alerts.map((alt, idx) => (
          <div key={idx} className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-lg border border-rose-200 dark:border-rose-900/60 text-xs text-slate-800 dark:text-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-700 dark:text-rose-400 text-sm">{alt.title}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                alt.severity === 'HIGH' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200' : 'bg-amber-100 text-amber-800'
              }`}>
                {alt.severity} SEVERITY
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{alt.description}</p>
            <div className="flex items-start gap-1 text-slate-700 dark:text-slate-200 pt-1 font-medium">
              <FaInfoCircle className="text-primary-500 mt-0.5 flex-shrink-0" />
              <span><strong>Pharmacist Recommendation:</strong> {alt.recommendation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
