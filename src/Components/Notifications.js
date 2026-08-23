import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import { Link } from "react-router-dom";
import { FaExclamationCircle, FaExclamationTriangle, FaTimesCircle, FaBoxOpen, FaTruck, FaClock, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import { getLocalInventory, getLocalOrders } from '../utils/dataStore';

const Notifications = () => {
  const [notifications, setNotifications] = useState({
    summary: { outOfStock: 0, lowStock: 0, arrivingStock: 0, stockPercentage: 100 },
    outOfStockItems: [],
    lowStockItems: [],
    expiredItems: [],
    arrivingOrders: []
  });

  const calculateDynamicNotifications = () => {
    const inv = getLocalInventory();
    const orders = getLocalOrders();
    const today = new Date();

    const outOfStockItems = inv.filter(i => (parseInt(i.quantity, 10) || 0) === 0);
    const lowStockItems = inv.filter(i => {
      const q = parseInt(i.quantity, 10) || 0;
      const th = parseInt(i.threshold, 10) || 10;
      return q > 0 && q <= th;
    });
    const expiredItems = inv.filter(i => i.expiryDate && new Date(i.expiryDate) < today);
    const arrivingOrders = orders.filter(o => !o.Delivery_Status && o.Status !== 'Delivered');

    const total = inv.length || 1;
    const healthyCount = inv.length - (outOfStockItems.length + lowStockItems.length + expiredItems.length);
    const stockPercentage = Math.max(0, Math.min(100, Math.round((healthyCount / total) * 100)));

    return {
      summary: {
        outOfStock: outOfStockItems.length,
        lowStock: lowStockItems.length,
        arrivingStock: arrivingOrders.length,
        stockPercentage: stockPercentage
      },
      outOfStockItems,
      lowStockItems,
      expiredItems,
      arrivingOrders
    };
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get("/notifications");
        if (response.data && response.data.summary && (response.data.summary.lowStock > 0 || response.data.lowStockItems?.length > 0)) {
          setNotifications(response.data);
          return;
        }
      } catch (error) {
        console.warn("Backend notifications offline, computing from local store:", error);
      }

      const calculated = calculateDynamicNotifications();
      setNotifications(calculated);
    };

    fetchNotifications();
  }, []);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-12 px-5 md:px-8 mx-auto w-full">
      {/* Page Header */}
      <div className="mb-8 mt-6 py-6 bg-gradient-to-r from-primary-800 to-primary-600 text-white rounded-2xl shadow-md text-center">
        <h1 className="text-3xl font-bold tracking-wide drop-shadow-sm">Clinical & Inventory Alerts</h1>
        <p className="text-xs text-primary-100 mt-1">Automated monitoring for stock deficits, batch expirations, and supplier deliveries</p>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* System Status Banner */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${notifications.summary.stockPercentage > 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              <FaExclamationCircle className="text-xl" />
            </div>
            <div>
              <span className="font-bold text-base block">Pharmacy Inventory Health Status</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Continuous AI scanning of warehouse stock levels & batch shelf life</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold">
            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-xl">
              Stock Integrity: <strong className="text-primary-600 dark:text-primary-400 font-extrabold">{notifications.summary.stockPercentage}%</strong>
            </span>
            <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-700/50">
              Low Stock: <strong>{notifications.summary.lowStock} SKUs</strong>
            </span>
            <span className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-700/50">
              Expired: <strong>{notifications.expiredItems.length} SKUs</strong>
            </span>
            <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-700/50">
              In Transit: <strong>{notifications.summary.arrivingStock} Orders</strong>
            </span>
          </div>
        </div>

        {/* Top 4 KPI Alert Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* Out of Stock Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 p-6 flex flex-col relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4 z-10">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                <FaTimesCircle className="text-2xl" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Out of Stock</h3>
                <p className="text-3xl font-extrabold text-rose-600 mt-0.5">{notifications.summary.outOfStock}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-auto pt-2 border-t border-slate-100 dark:border-slate-700/60">
              {notifications.summary.outOfStock === 0 ? "✅ Zero out-of-stock items" : "Products requiring urgent procurement"}
            </p>
          </div>

          {/* Low Stock Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 p-6 flex flex-col relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4 z-10">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                <FaExclamationTriangle className="text-2xl" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Low Stock</h3>
                <p className="text-3xl font-extrabold text-amber-600 mt-0.5">{notifications.summary.lowStock}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-auto pt-2 border-t border-slate-100 dark:border-slate-700/60">
              {notifications.summary.lowStock > 0 ? "⚠️ At or below reorder threshold" : "All stock levels optimal"}
            </p>
          </div>

          {/* Expired Stock Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 p-6 flex flex-col relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4 z-10">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                <FaClock className="text-2xl" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Expired Batches</h3>
                <p className="text-3xl font-extrabold text-rose-600 mt-0.5">{notifications.expiredItems.length}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-auto pt-2 border-t border-slate-100 dark:border-slate-700/60">
              {notifications.expiredItems.length === 0 ? "✅ Zero expired formulations" : "Quarantine & disposal required"}
            </p>
          </div>

          {/* Arriving Stock Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 p-6 flex flex-col relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4 z-10">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                <FaTruck className="text-2xl" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Arriving Soon</h3>
                <p className="text-3xl font-extrabold text-blue-600 mt-0.5">{notifications.summary.arrivingStock}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-auto pt-2 border-t border-slate-100 dark:border-slate-700/60">
              Active purchase orders in transit
            </p>
          </div>

        </div>

        {/* Detailed Actionable Alert Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Low Stock Items List */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-amber-500" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Low Stock Formulations</h3>
              </div>
              <Link to="/Orders" className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                + Create PO <FaArrowRight size={10} />
              </Link>
            </div>

            {notifications.lowStockItems.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {notifications.lowStockItems.map((item, index) => (
                  <div key={item.id || index} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/40 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.category} • Supplier: {item.supplier || 'Standard'}</div>
                    </div>
                    <div className="text-right">
                      <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs px-2.5 py-1 rounded-xl font-extrabold block">
                        {item.quantity} left
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Threshold: {item.threshold || 10}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                <FaCheckCircle className="text-3xl text-emerald-500 mb-2" />
                <span>All medicines have sufficient stock above safety thresholds.</span>
              </div>
            )}
          </div>

          {/* Arriving Shipments & Purchase Orders */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div className="flex items-center gap-2">
                <FaTruck className="text-blue-500" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Incoming Supplier Shipments</h3>
              </div>
              <Link to="/Orders" className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                View All <FaArrowRight size={10} />
              </Link>
            </div>

            {notifications.arrivingOrders.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {notifications.arrivingOrders.map((order, index) => (
                  <div key={order.OrderID || index} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/40 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">PO #{order.OrderID} • Supplier #{order.SupplierID}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {Array.isArray(order.Medicines) && order.Medicines.length > 0
                          ? order.Medicines.map(m => `${m.name} (${m.quantity}u)`).join(', ')
                          : 'Bulk Pharmaceutical Stock'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs px-2.5 py-1 rounded-xl font-bold block">
                        ₹{(order.TotalPrice || order.TotalAmount || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Exp: {order.DeliveryDate ? order.DeliveryDate.split('T')[0] : 'In 3 Days'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                <FaBoxOpen className="text-3xl text-slate-300 dark:text-slate-600 mb-2" />
                <span>No purchase orders currently pending delivery.</span>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default Notifications;
