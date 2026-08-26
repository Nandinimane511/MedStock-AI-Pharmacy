import React, { useState } from 'react';
import { FaRobot, FaTimes, FaPaperPlane, FaExclamationTriangle, FaBoxes } from 'react-icons/fa';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { answerAiAssistantQueryClientSide } from '../utils/clientAiService';
import { getLocalInventory, getLocalBills } from '../utils/dataStore';

export default function AIAssistantModal({ isOpen, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "👋 Hello! I am your **MedStock AI Pharmacy Assistant**.\n\nI can analyze expiring medicines, predict low-stock reorders, provide drug-drug safety insights, and summarize revenue. How can I help you today?",
      data: null
    }
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    { label: "⏳ Expiring Stock", query: "Which medicines are expiring soon?" },
    { label: "📦 Low Stock Reorders", query: "Forecast low-stock medicines that need reordering" },
    { label: "💰 Revenue Insights", query: "What is our current sales and revenue performance?" },
    { label: "⚠️ Drug Safety Check", query: "Explain why Warfarin and Aspirin should not be dispensed together" }
  ];

  const handleSend = async (queryText) => {
    const textToSend = queryText || prompt;
    if (!textToSend.trim()) return;

    const userMsg = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    let aiData = null;

    try {
      const res = await api.post('/ai/assistant', { prompt: textToSend });
      if (res.data && (res.data.summary || res.data.answer)) {
        aiData = res.data;
      }
    } catch (error) {
      console.warn("Backend AI assistant offline, processing on client AI engine:", error);
    }

    if (!aiData) {
      const localInv = getLocalInventory();
      const localBills = getLocalBills();
      aiData = answerAiAssistantQueryClientSide(textToSend, localInv, localBills);
    }

    let formattedText = aiData.summary || aiData.answer || "Here is what I found:";
    if (aiData.suggestion) {
      formattedText += `\n\n💡 **Recommendation:** ${aiData.suggestion}`;
    }

    setMessages(prev => [...prev, {
      sender: 'ai',
      text: formattedText,
      data: aiData.data,
      type: aiData.type
    }]);

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col h-[640px] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-primary-600 via-primary-700 to-teal-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              <FaRobot className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg leading-tight">MedStock AI Assistant</h3>
                <span className="bg-teal-400 text-slate-900 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Clinical Copilot</span>
              </div>
              <p className="text-xs text-primary-100">Smart Pharmacy Intelligence & Clinical Safety</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Quick Prompts Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex gap-2 overflow-x-auto text-xs">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp.query)}
              className="px-3 py-1.5 whitespace-nowrap bg-white dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center gap-1.5"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Chat Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-sm">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-primary-600 text-white rounded-br-none' 
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/50 dark:border-slate-700'
              }`}>
                <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>

                {/* Structured Payload Cards if available */}
                {msg.data && msg.type === 'EXPIRY_INSIGHT' && msg.data.riskTiers && (
                  <div className="mt-3 pt-3 border-t border-slate-300/40 dark:border-slate-600 space-y-2 text-xs">
                    <div className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <FaExclamationTriangle /> Critical (&le; 30 Days): {msg.data.riskTiers.critical30Days.length} items
                    </div>
                    {msg.data.riskTiers.critical30Days.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 flex justify-between">
                        <span className="font-medium">{item.name} ({item.quantity} units)</span>
                        <span className="font-bold">Expires: {new Date(item.expiryDate).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.data && msg.type === 'REORDER_INSIGHT' && msg.data.recommendations && (
                  <div className="mt-3 pt-3 border-t border-slate-300/40 dark:border-slate-600 space-y-2 text-xs">
                    <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <FaBoxes /> Priority Reorders ({msg.data.recommendations.length} items):
                    </div>
                    {msg.data.recommendations.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 flex justify-between">
                        <span><strong>{item.name}</strong> - Stock: {item.currentStock} (Th: {item.threshold})</span>
                        <span className="font-bold text-amber-700 dark:text-amber-300">Order +{item.suggestedReorderQty}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-2xl rounded-bl-none flex items-center gap-2 text-slate-500">
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce [animation-delay:0.4s]"></div>
                <span className="text-xs font-medium ml-1">Analyzing medical database...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Footer */}
        <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about expiring medicines, reorders, clinical safety..."
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !prompt.trim()}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-sm transition-all flex items-center gap-2"
          >
            <FaPaperPlane className="text-xs" />
            <span>Ask AI</span>
          </button>
        </div>

      </div>
    </div>
  );
}
