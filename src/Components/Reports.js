import React, { useEffect, useState } from "react";
import { FaBox, FaChartLine, FaExclamationTriangle, FaTrashAlt, FaPrint } from "react-icons/fa";
import { AiOutlineClose } from "react-icons/ai";
import api from "../api/axiosConfig";
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getLocalInventory } from '../utils/dataStore';

const Reports = () => {
  const [lowStockItems, setLowStockItems] = useState([]); // Stores low stock items
  const [showLowStock, setShowLowStock] = useState(false); // Controls modal visibility
  const [stockCounts, setStockCounts] = useState({
    totalItems: 0,
    totalStock: 0,
    lowStock: 0,
    expiredItems: 0,
  });

  // Sales Analytics State
  const [salesRange, setSalesRange] = useState("today");
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    totalRevenue: 0,
    paymentBreakdown: [],
    userBreakdown: []
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    const fetchStockCounts = async () => {
      try {
        const response = await api.get("/reports/stock");
        if (response.data && response.data.totalItems !== undefined) {
          const data = response.data;
          setStockCounts({
            totalItems: data.totalItems,
            totalStock: data.totalStock,
            lowStock: data.lowStock,
            expiredItems: data.expiredItems,
          });
          return;
        }
      } catch (error) {
        console.warn("Backend reports stock offline, calculating locally:", error);
      }

      // Local store fallback
      const inv = getLocalInventory();
      const totalItems = inv.length;
      const totalStock = inv.reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 0), 0);
      const lowStock = inv.filter(i => (parseInt(i.quantity, 10) || 0) <= (parseInt(i.threshold, 10) || 10)).length;
      const expiredItems = inv.filter(i => i.expiryDate && new Date(i.expiryDate) < new Date()).length;

      setStockCounts({ totalItems, totalStock, lowStock, expiredItems });
    };

    fetchStockCounts();
  }, []);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const response = await api.get(`/sales/summary/by-user?range=${salesRange}`);
        setSalesData(response.data);
      } catch (error) {
        console.error("Error fetching sales summary:", error);
      }
    };
    fetchSalesData();
  }, [salesRange]);

  // ✅ Corrected: Now handleLowStockClick is placed properly inside the component
  const handleLowStockClick = async () => {
    try {
      const response = await api.get("/reports/low-stock-items");
      const data = response.data;

      console.log("Low Stock Data:", data); // Debugging log

      if (Array.isArray(data) && data.length > 0) {
        setLowStockItems(data);
      } else {
        setLowStockItems([]);
      }

      setShowLowStock(true); // Show modal
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      toast.error("Error fetching low stock items");
    }
  };

  // Print Report Function
  const handlePrint = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  
    // Open a new print window
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MedStock Inventory Report</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script> 
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #f0f8ff; color: #0d47a1; text-align: center; }
          .report-container { max-width: 600px; margin: auto; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2); }
          h2 { color: #1565c0; margin-bottom: 10px; }
          h3 { color: #0d47a1; margin-bottom: 10px; }
          .date-time { font-size: 16px; font-weight: bold; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
          th { background: #0d47a1; color: white; }
          td { font-size: 14px; font-weight: bold; }
          .chart-container { display: flex; justify-content: center; margin-top: 15px; }
          canvas { width: 220px !important; height: 220px !important; } /* Reduce Chart Size */
        </style>
      </head>
      <body>
        <div class="report-container">
          <h2>📄 MedStock Inventory Report</h2>
          <h3 class="date-time">${formattedDate} - ${formattedTime}</h3>
          <table>
            <tr>
              <th>Metric</th>
              <th>Count</th>
            </tr>
            <tr>
              <td>Total Items</td>
              <td>${stockCounts.totalItems}</td>
            </tr>
            <tr>
              <td>Current Stock</td>
              <td>${stockCounts.totalStock}</td>
            </tr>
            <tr>
              <td>Low Stock Alerts</td>
              <td>${stockCounts.lowStock}</td>
            </tr>
            <tr>
              <td>Expired Items</td>
              <td>${stockCounts.expiredItems}</td>
            </tr>
          </table>
  
          <!-- Smaller Doughnut Chart -->
          <div class="chart-container">
            <canvas id="stockChart"></canvas>
          </div>
        </div>
  
        <script>
          document.addEventListener("DOMContentLoaded", function () {
            const ctx = document.getElementById("stockChart").getContext("2d");
            new Chart(ctx, {
              type: "doughnut",
              data: {
                labels: ["Total Items", "Current Stock", "Low Stock", "Expired Items"],
                datasets: [{
                  data: [${stockCounts.totalItems}, ${stockCounts.totalStock}, ${stockCounts.lowStock}, ${stockCounts.expiredItems}],
                  backgroundColor: ["#1976D2", "#4CAF50", "#FFC107", "#D32F2F"],
                  hoverOffset: 8
                }]
              },
              options: {
                responsive: false, /* Disable auto-resizing */
                maintainAspectRatio: false,
                plugins: { 
                  legend: { position: "bottom" }, 
                  datalabels: { 
                    color: "white", 
                    font: { weight: "bold" },
                    formatter: (value, ctx) => {
                      let total = ctx.chart.data.datasets[0].data.reduce((acc, cur) => acc + cur, 0);
                      let percentage = ((value / total) * 100).toFixed(1) + "%";
                      return value > 0 ? percentage : ""; // Hide labels for 0 values
                    }
                  }
                }
              },
              plugins: [ChartDataLabels]
            });
  
            setTimeout(() => window.print(), 800); // Wait for chart to render before printing
          });
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-10 px-5 md:px-8 mx-auto w-full">
      {/* Page Header */}
      <div className="mb-8 mt-6 py-6 bg-gradient-to-r from-primary-800 to-primary-600 text-white rounded-2xl shadow-md text-center">
        <h1 className="text-3xl font-bold tracking-wide drop-shadow-sm">Reports Overview</h1>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 max-w-7xl mx-auto">
        <div className="flex-1 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-6 shadow-card text-white relative overflow-hidden flex flex-col justify-center transform transition-all hover:-translate-y-1 hover:shadow-card-hover">
          <FaBox className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-[60px]" />
          <h3 className="text-base font-semibold opacity-90 mb-2 z-10">Total Items</h3>
          <p className="text-3xl font-bold z-10">{stockCounts.totalItems}</p>
        </div>
        <div className="flex-1 bg-gradient-to-br from-success to-success-hover rounded-xl p-6 shadow-card text-white relative overflow-hidden flex flex-col justify-center transform transition-all hover:-translate-y-1 hover:shadow-card-hover">
          <FaChartLine className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-[60px]" />
          <h3 className="text-base font-semibold opacity-90 mb-2 z-10">Current Stock</h3>
          <p className="text-3xl font-bold z-10">{stockCounts.totalStock}</p>
        </div>
        <div 
          className="flex-1 bg-gradient-to-br from-warning to-warning-hover rounded-xl p-6 shadow-card text-white relative overflow-hidden flex flex-col justify-center transform transition-all hover:-translate-y-1 hover:shadow-card-hover cursor-pointer border border-transparent hover:border-white/50"
          onClick={handleLowStockClick}
        > 
          <FaExclamationTriangle className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-[60px]" />
          <h3 className="text-base font-semibold opacity-90 mb-2 z-10">Low Stock (Click to View)</h3>
          <p className="text-3xl font-bold z-10">{stockCounts.lowStock}</p>
        </div>
        <div className="flex-1 bg-gradient-to-br from-danger to-danger-hover rounded-xl p-6 shadow-card text-white relative overflow-hidden flex flex-col justify-center transform transition-all hover:-translate-y-1 hover:shadow-card-hover">
          <FaTrashAlt className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-[60px]" />
          <h3 className="text-base font-semibold opacity-90 mb-2 z-10">Expired Items</h3>
          <p className="text-3xl font-bold z-10">{stockCounts.expiredItems}</p>
        </div>
      </div>

      {/* Print Button */}
      <div className="flex justify-center mb-12 max-w-7xl mx-auto">
        <button 
          className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transform transition-all hover:-translate-y-0.5 flex items-center gap-2" 
          onClick={handlePrint}
        >
          <FaPrint className="w-5 h-5" /> PRINT REPORT
        </button>
      </div>
      
      {/* Benefits of Smart Inventory Reports */}
      <div className="max-w-7xl mx-auto mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center mb-8">🚀 Why Use Smart Inventory Reports?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center text-center transform transition-all hover:-translate-y-1 hover:shadow-card-hover">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">📦 Accurate Tracking</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Monitor stock levels with precision, reducing waste and shortages.</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center text-center transform transition-all hover:-translate-y-1 hover:shadow-card-hover">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">📡 Real-Time Updates</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Get instant alerts on low stock, ensuring timely restocking.</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center text-center transform transition-all hover:-translate-y-1 hover:shadow-card-hover">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">📊 Data-Driven Decisions</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Analyze trends and optimize inventory management for better efficiency.</p>
          </div>
        </div>
      </div>

      {/* Sales Analytics Section */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">📈 Sales Analytics</h2>
          <select
            value={salesRange}
            onChange={(e) => setSalesRange(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-700 p-6 flex flex-col justify-center text-center">
            <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">Total Orders</h3>
            <p className="text-4xl font-bold text-primary-600 dark:text-primary-400">{salesData.totalSales}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-700 p-6 flex flex-col justify-center text-center">
            <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">Total Revenue</h3>
            <p className="text-4xl font-bold text-success-600 dark:text-success-400">₹{Number(salesData.totalRevenue).toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">Payment Methods Breakdown</h3>
            {salesData.paymentBreakdown.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesData.paymentBreakdown}
                      dataKey="amount"
                      nameKey="payment_method"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {salesData.paymentBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">No data available</div>
            )}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">Revenue by User</h3>
            {salesData.userBreakdown && salesData.userBreakdown.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData.userBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="user_email" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="totalRevenue" fill="#8884d8" name="Revenue (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Items Modal */}
      {showLowStock && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal max-w-xl w-full max-h-[85vh] overflow-y-auto p-8 relative">
            <button 
              className="absolute top-6 right-6 w-10 h-10 bg-slate-100 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center hover:bg-danger-bg hover:text-danger hover:rotate-90 transition-all" 
              onClick={() => setShowLowStock(false)}
            >
              <AiOutlineClose size={20} />
            </button>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Low Stock Items</h3>
            
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <ul className="divide-y divide-slate-200">
                {lowStockItems.length > 0 ? (
                  lowStockItems.map((item, index) => (
                    <li key={index} className="px-6 py-4 flex justify-between items-center hover:bg-slate-100 transition-colors">
                      <span className="text-slate-700 dark:text-slate-200 font-medium">{item.name}</span>
                      <span className="bg-warning-bg text-warning px-3 py-1 rounded-full text-sm font-bold border border-warning/20">
                        {item.stock} left
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 font-medium">No low stock items.</li>
                )}
              </ul>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button 
                className="bg-slate-200 text-slate-700 dark:text-slate-200 hover:bg-slate-300 px-6 py-2.5 rounded-xl font-bold transition-colors" 
                onClick={() => setShowLowStock(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
