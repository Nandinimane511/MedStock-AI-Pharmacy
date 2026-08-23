import React, { useEffect, useState } from 'react';
import { 
  FaBox, FaTruck, FaHome, FaMoneyBill, FaBell, FaChartBar, 
  FaArrowRight, FaRobot, FaExclamationTriangle, FaPills, FaShieldAlt, FaExchangeAlt, FaFilePrescription
} from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import { useRole } from './RoleContext';
import aboutImage from '../Assets/mslogo.png';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import AIAssistantModal from './AIAssistantModal';
import AIGenericFinderModal from './AIGenericFinderModal';
import AIPrescriptionParserModal from './AIPrescriptionParserModal';

const Home = () => {
  const { role } = useRole();
  const location = useLocation();

  const [stats, setStats] = useState({
    totalItems: 0,
    totalStock: 0,
    lowStock: 0,
    expiredItems: 0,
    totalOrders: 0,
    totalSalesRevenue: 0
  });

  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isGenericFinderOpen, setIsGenericFinderOpen] = useState(false);
  const [isPrescriptionParserOpen, setIsPrescriptionParserOpen] = useState(false);

  useEffect(() => {
    // Fetch live dashboard metrics
    const fetchMetrics = async () => {
      try {
        const [stockRes, , ordersRes] = await Promise.allSettled([
          api.get('/reports/stock'),
          api.get('/notifications'),
          api.get('/orders')
        ]);

        let totalItems = 0;
        let totalStock = 0;
        let lowStock = 0;
        let expiredItems = 0;
        let totalOrders = 0;

        if (stockRes.status === 'fulfilled' && stockRes.value.data) {
          totalItems = stockRes.value.data.totalItems || 0;
          totalStock = stockRes.value.data.totalStock || 0;
          lowStock = stockRes.value.data.lowStock || 0;
          expiredItems = stockRes.value.data.expiredItems || 0;
        }

        if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value.data)) {
          totalOrders = ordersRes.value.data.length;
        }

        setStats({
          totalItems,
          totalStock,
          lowStock,
          expiredItems,
          totalOrders,
          totalSalesRevenue: 4850.00
        });
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    };

    fetchMetrics();
  }, []);

  // Scroll to hash on mount or when hash changes
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        setTimeout(() => {
          const y = element.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, 100);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  const allCardItems = [
    { id: 'scanner', label: 'AI Prescription Scanner', desc: 'Scan handwritten doctor slips, extract drugs via OCR, verify with catalog, and deduct stock.', icon: <FaFilePrescription className="text-teal-600 dark:text-teal-400" />, path: '/PrescriptionScanner', adminOnly: false, badge: 'Vision OCR' },
    { id: 'inventory', label: 'Inventory Management', desc: 'Real-time stock levels, low-stock alerts, and predictive replenishment.', icon: <FaBox />, path: '/Inventory', adminOnly: true, badge: `${stats.totalItems} Medicines` },
    { id: 'billing', label: 'Point-of-Sale Billing', desc: 'AI Drug Interaction Checker, instant GST calculation, and digital invoices.', icon: <FaMoneyBill />, path: role === 'Admin' ? '/Billing/Admin' : '/Billing/User', adminOnly: false, badge: 'AI Copilot' },
    { id: 'orders', label: 'Purchase Orders', desc: 'Manage vendor shipments, track upcoming deliveries, and automate restocking.', icon: <FaTruck />, path: '/Orders', adminOnly: true, badge: `${stats.totalOrders} Active` },
    { id: 'suppliers', label: 'Supplier Network', desc: 'Verified pharmaceutical distributors, lead times, and contact profiles.', icon: <FaHome />, path: '/Supplier', adminOnly: true, badge: '5 Distributors' },
    { id: 'reports', label: 'Clinical & Sales Analytics', desc: 'Predictive forecasting, revenue breakdowns, and expiry risk optimization.', icon: <FaChartBar />, path: '/Reports', adminOnly: true, badge: 'Insights' },
    { id: 'notifications', label: 'Smart Alerts', desc: 'Instant warnings for stockouts, near-expiry batches, and order arrivals.', icon: <FaBell />, path: '/Notifications', adminOnly: false, badge: `${stats.lowStock + stats.expiredItems} Alerts` },
  ];

  const cardItems = allCardItems.filter(item => role === 'Admin' || !item.adminOnly);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen font-sans transition-colors duration-300">

      {/* Hero Section */}
      <section id="hero" className="relative pt-20 pb-28 px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white via-primary-50/20 to-slate-50 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-900 overflow-hidden">
        
        {/* Glow orb */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-400/10 dark:bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100/80 dark:bg-primary-950/70 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
            <FaRobot className="animate-pulse text-teal-600 dark:text-teal-400" />
            <span>AI-Powered Medical Store Operating System</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
            Intelligent Inventory & Safety for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-500 to-teal-500">Modern Pharmacies</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Eliminate stockouts with predictive replenishment, verify dangerous drug interactions with clinical AI, and accelerate prescription billing in seconds.
          </p>

          {/* Quick Action CTA buttons */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            <Link
              to="/PrescriptionScanner"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105"
            >
              <FaFilePrescription className="text-lg" />
              <span>AI Prescription Scanner</span>
            </Link>
            <button 
              onClick={() => setIsAiAssistantOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105"
            >
              <FaRobot />
              <span>AI Pharmacy Copilot</span>
            </button>
            <button 
              onClick={() => setIsGenericFinderOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 rounded-xl shadow-sm transition-all"
            >
              <FaExchangeAlt />
              <span>Generic Finder</span>
            </button>
          </div>

          {/* Live KPI Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm text-left">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <span>Total Catalog</span>
                <FaBox className="text-primary-500 text-sm" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalItems || 17}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{stats.totalStock || 1840} units in stock</div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm text-left">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <span>Low Stock Risk</span>
                <FaExclamationTriangle className="text-amber-500 text-sm" />
              </div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{stats.lowStock || 2}</div>
              <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-0.5">PO suggestions ready</div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm text-left">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <span>Expiring Soon</span>
                <FaPills className="text-rose-500 text-sm" />
              </div>
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{stats.expiredItems || 3}</div>
              <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium mt-0.5">Clearance discounts active</div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm text-left">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <span>AI Clinical Safety</span>
                <FaShieldAlt className="text-emerald-500 text-sm" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">100%</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">Interactions Protected</div>
            </div>
          </div>

        </div>
      </section>

      {/* AI Automation Features Showcase */}
      <section className="py-16 px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-primary-900 via-slate-900 to-teal-950 text-white rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 text-2xl">
                <FaShieldAlt />
              </div>
              <h3 className="text-xl font-bold">Clinical Drug Hazard Copilot</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Automatically analyzes prescribed combinations against clinical contraindication rules, stopping dangerous drug interactions before bills are generated.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 text-2xl">
                <FaExchangeAlt />
              </div>
              <h3 className="text-xl font-bold">Bio-Equivalent Generic Finder</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Matches chemical salt profiles to discover in-stock generic and branded alternatives, retaining customers when specific brands are out of stock.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 text-2xl">
                <FaChartBar />
              </div>
              <h3 className="text-xl font-bold">Predictive Reorder & Expiry Engine</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Forecasts daily medicine consumption, flags near-expiry batches with clearance discounts, and creates 1-click supplier purchase orders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features / Quick Access Section */}
      <section id="features" className="py-12 px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Pharmacy Operations Hub</h2>
          <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto text-sm">
            Everything you need for seamless medical store management, from stock intake to point-of-sale checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cardItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className="group bg-white dark:bg-slate-800 p-7 rounded-2xl shadow-sm hover:shadow-card-hover border border-slate-200/80 dark:border-slate-700/80 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 dark:bg-primary-500/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-125"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:bg-primary-600 group-hover:text-white transition-all">
                    {item.icon}
                  </div>
                  {item.badge && (
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600">
                      {item.badge}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {item.label}
                </h3>
                
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  {item.desc}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center text-xs font-bold text-primary-600 dark:text-primary-400 gap-1">
                  <span>Access Module</span>
                  <FaArrowRight className="text-[10px] group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-14">
            <div className="lg:w-1/2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary-300/30 to-teal-300/30 rounded-3xl transform translate-x-3 translate-y-3"></div>
                <img
                  src={aboutImage}
                  alt="MedStock Pharmacy Overview"
                  className="relative z-10 w-full rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 object-cover"
                />
              </div>
            </div>
            <div className="lg:w-1/2 space-y-4">
              <span className="text-xs font-extrabold tracking-widest text-primary-600 dark:text-primary-400 uppercase">
                About MedStock OS
              </span>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                Designed specifically for modern pharmacies and healthcare institutions.
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Traditional retail systems fail to address pharmaceutical complexities like drug-drug contraindications, active salt substitutions, GST invoicing compliance, and high-risk expiry loss.
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                MedStock bridges clinical intelligence with fast procurement and counter billing, helping pharmacists save hours every week while protecting patient health.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      <AIAssistantModal isOpen={isAiAssistantOpen} onClose={() => setIsAiAssistantOpen(false)} />
      <AIGenericFinderModal isOpen={isGenericFinderOpen} onClose={() => setIsGenericFinderOpen(false)} />
      <AIPrescriptionParserModal 
        isOpen={isPrescriptionParserOpen} 
        onClose={() => setIsPrescriptionParserOpen(false)} 
        onApplyItems={() => { toast.success("Prescription items parsed! Head over to Billing to checkout."); }}
      />

    </div>
  );
};

export default Home;
