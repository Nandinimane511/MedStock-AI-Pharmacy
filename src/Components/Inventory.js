import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { AiOutlineClose } from "react-icons/ai";
import { FaRobot, FaBoxes, FaTags, FaExchangeAlt, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import toast from 'react-hot-toast';
import AIGenericFinderModal from './AIGenericFinderModal';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [systemDefaultThreshold, setSystemDefaultThreshold] = useState(10);
  
  // AI Forecast state
  const [aiReorderData, setAiReorderData] = useState(null);
  const [aiExpiryData, setAiExpiryData] = useState(null);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [isGenericFinderOpen, setIsGenericFinderOpen] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    quantity: '',
    price: '',
    expiryDate: '',
    supplier: '',
    threshold: '',
  });

  const [selectedItem, setSelectedItem] = useState(null);

  const fetchInventoryData = () => {
    api.get('/inventory')
      .then(response => {
        setInventory(response.data);
        setFilteredInventory(response.data);
      })
      .catch(error => {
        console.error('Error fetching inventory:', error);
      });
  };

  const fetchAiInsights = () => {
    api.get('/ai/forecast-reorder')
      .then(res => setAiReorderData(res.data))
      .catch(err => console.error("Error fetching AI forecast:", err));

    api.get('/ai/expiry-optimizer')
      .then(res => setAiExpiryData(res.data))
      .catch(err => console.error("Error fetching AI expiry optimizer:", err));
  };

  useEffect(() => {
    fetchInventoryData();
    fetchAiInsights();

    api.get('/settings')
      .then(response => {
        if (response.data && response.data.default_threshold) {
          setSystemDefaultThreshold(response.data.default_threshold);
        }
      })
      .catch(err => console.error('Error fetching settings:', err));
  }, []);

  const handleAddItem = () => {
    setNewItem({
      name: '',
      category: '',
      quantity: '',
      price: '',
      expiryDate: '',
      supplier: '',
      threshold: systemDefaultThreshold.toString()
    });
    setShowAddModal(true);
  };
  const closeAddModal = () => setShowAddModal(false);

  const handleRemoveItem = () => setShowRemoveModal(true);
  const closeRemoveModal = () => setShowRemoveModal(false);

  const handleUpdateItem = () => {
    if (!selectedItem) {
      toast.error("Please select an item in the table to update!");
      return;
    }
    const itemToUpdate = inventory.find(item => item.id === selectedItem);
    if (!itemToUpdate) {
      toast.error("Selected item not found!");
      return;
    }
    setNewItem({ ...itemToUpdate });
    setShowUpdateModal(true);
  };

  const closeUpdateModal = () => setShowUpdateModal(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    applyFilter(query, selectedCategory);
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategory(category);
    applyFilter(searchQuery, category);
  };

  const applyFilter = (query, category) => {
    let filtered = inventory;
    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }
    if (query) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.supplier.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }
    setFilteredInventory(filtered);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    api.post('/inventory', newItem)
      .then(() => {
        fetchInventoryData();
        fetchAiInsights();
        closeAddModal();
        toast.success("Medicine added successfully!");
      })
      .catch(error => {
        console.error('Error adding item:', error);
        toast.error("Failed to add medicine");
      });
  };

  const handleRemoveSelectedItem = () => {
    if (!selectedItem) {
      toast.error("Please select an item to remove");
      return;
    }
    api.delete(`/inventory/${selectedItem}`)
      .then(() => {
        fetchInventoryData();
        fetchAiInsights();
        closeRemoveModal();
        setSelectedItem(null);
        toast.success("Medicine removed successfully");
      })
      .catch(error => {
        console.error('Error removing item:', error);
        toast.error("Failed to remove item");
      });
  };

  const handleUpdateItemDetails = (e) => {
    e.preventDefault();
    api.put(`/inventory/${newItem.id}`, newItem)
      .then(() => {
        fetchInventoryData();
        fetchAiInsights();
        closeUpdateModal();
        toast.success("Medicine updated successfully");
      })
      .catch(error => {
        console.error('Error updating item:', error);
        toast.error("Failed to update item");
      });
  };

  // Dynamic Chart calculations
  const categoriesMap = {};
  let lowStockCount = 0;
  let expiredCount = 0;
  const now = new Date();

  inventory.forEach(item => {
    categoriesMap[item.category] = (categoriesMap[item.category] || 0) + item.quantity;
    if (item.quantity <= item.threshold) lowStockCount++;
    if (item.expiryDate && new Date(item.expiryDate) < now) expiredCount++;
  });

  const categoryData = Object.keys(categoriesMap).slice(0, 5).map(cat => ({
    name: cat,
    value: categoriesMap[cat]
  }));

  const COLORS = ["#2563eb", "#0d9488", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-12 px-5 md:px-8 font-sans mx-auto w-full">
      
      {/* Page Header */}
      <div className="mb-6 mt-6 py-6 px-8 bg-gradient-to-r from-primary-800 via-primary-700 to-teal-700 text-white rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Pharmaceutical Inventory</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-900 text-xs font-bold uppercase tracking-wider">Smart Stock</span>
          </div>
          <p className="text-xs md:text-sm text-primary-100">
            Real-time stock ledger, predictive reorder automation, and dynamic clearance optimization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGenericFinderOpen(true)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl backdrop-blur-sm border border-white/30 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FaExchangeAlt /> Generic Finder
          </button>
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="px-4 py-2 bg-white text-slate-900 text-xs font-bold rounded-xl shadow-md hover:bg-slate-100 transition-all flex items-center gap-1.5"
          >
            <FaRobot className="text-primary-600" /> {showAiPanel ? 'Hide AI Hub' : 'Show AI Hub'}
          </button>
        </div>
      </div>

      {/* AI Automation & Forecasting Banner */}
      {showAiPanel && (
        <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          
          {/* AI Reorder Forecast Card */}
          <div className="bg-gradient-to-br from-amber-500/10 to-primary-500/10 dark:from-amber-950/30 dark:to-primary-950/30 border border-amber-300 dark:border-amber-700 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg">
                  <FaBoxes />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">AI Predictive Reorder Engine</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Demand velocity & stockout prevention</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-lg">
                {aiReorderData?.urgentReorderCount || 0} Critical Reorders
              </span>
            </div>

            <div className="space-y-2">
              {aiReorderData?.recommendations?.slice(0, 3).map((rec, idx) => (
                <div key={idx} className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-white">{rec.name}</h5>
                    <p className="text-slate-500 dark:text-slate-400">
                      Current: <strong>{rec.currentStock}</strong> &bull; Threshold: {rec.threshold} &bull; Days Left: <strong className="text-amber-600">{rec.daysRemaining} days</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded">
                      Order +{rec.suggestedReorderQty}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Est: ₹{rec.estimatedCost}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Expiry Markdown Optimizer Card */}
          <div className="bg-gradient-to-br from-rose-500/10 to-teal-500/10 dark:from-rose-950/30 dark:to-teal-950/30 border border-rose-300 dark:border-rose-700 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center text-lg">
                  <FaTags />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">AI Dynamic Expiry Risk & Markdown Optimizer</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Automatic markdown suggestions to avoid write-offs</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-lg">
                ₹{aiExpiryData?.totalValueAtRisk || 0} Value at Risk
              </span>
            </div>

            <div className="space-y-2">
              {aiExpiryData?.riskTiers?.critical30Days?.concat(aiExpiryData?.riskTiers?.warning60Days || [])?.slice(0, 3).map((exp, idx) => (
                <div key={idx} className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-rose-200 dark:border-rose-800/60 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-white">{exp.name}</h5>
                    <p className="text-slate-500 dark:text-slate-400">
                      Qty: {exp.quantity} &bull; Exp: <strong>{new Date(exp.expiryDate).toLocaleDateString()}</strong> ({exp.daysToExpiry} days left)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded">
                      Apply {exp.discountPercent}% Off
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Clearance Bundle</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Dynamic Visual Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-6 flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 text-center mb-2 uppercase tracking-wider">Category Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData.length > 0 ? categoryData : [{ name: "Medicines", value: 100 }]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-6 flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 text-center mb-2 uppercase tracking-wider">Low Stock Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={[
                { name: "Low Stock", value: lowStockCount || 1 },
                { name: "Healthy Stock", value: Math.max(inventory.length - lowStockCount, 1) }
              ]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                <Cell fill="#f59e0b" />
                <Cell fill="#10b981" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-6 flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 text-center mb-2 uppercase tracking-wider">Expiry Timeline Health</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={[
                { name: "Near Expiry / Expired", value: expiredCount || (aiExpiryData?.totalExpiringBatches || 1) },
                { name: "Valid Batches", value: Math.max(inventory.length - (expiredCount || 1), 1) }
              ]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                <Cell fill="#ef4444" />
                <Cell fill="#0ea5e9" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={handleAddItem}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
          >
            <FaPlus /> Add Medicine
          </button>
          <button 
            onClick={handleUpdateItem}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <FaEdit /> Edit Selected
          </button>
          <button 
            onClick={handleRemoveItem}
            className="bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <FaTrash /> Remove Medicine
          </button>
        </div>
        
        <div className="w-full md:w-auto flex-1 max-w-xl ml-auto flex gap-3">
          <select 
            value={selectedCategory} 
            onChange={handleCategoryChange}
            className="w-1/3 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-semibold"
          >
            <option value="">All Categories</option>
            {[...new Set(inventory.map(item => item.category))].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input 
            value={searchQuery}
            onChange={handleSearch} 
            placeholder="Search medicine name, supplier, category..." 
            className="w-2/3 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" 
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="max-w-7xl mx-auto overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-card bg-white dark:bg-slate-800 mb-10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="px-5 py-3.5">Medicine Name</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5 text-center">Stock</th>
              <th className="px-4 py-3.5 text-right">Unit Price</th>
              <th className="px-4 py-3.5 text-right">Total Val</th>
              <th className="px-4 py-3.5">Expiry Date</th>
              <th className="px-4 py-3.5">Supplier</th>
              <th className="px-3 py-3.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredInventory.map((item) => {
              const isExpired = item.expiryDate ? new Date(item.expiryDate) < now : false;
              const isLowStock = item.quantity <= item.threshold;
              const isSelected = item.id === selectedItem;

              return (
                <tr
                  key={item.id}
                  onClick={() => setSelectedItem(item.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-primary-50 dark:bg-primary-950/40 border-l-4 border-l-primary-600' 
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-850'
                  }`}
                >
                  <td className="px-5 py-3.5 text-xs font-bold text-slate-900 dark:text-white">
                    {item.name}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                    {item.category}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-center font-extrabold text-slate-900 dark:text-white">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-right font-semibold text-slate-700 dark:text-slate-300">
                    ₹{parseFloat(item.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-right font-extrabold text-slate-900 dark:text-white">
                    ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                    {item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : 'N/A'}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                    {item.supplier}
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    {isExpired ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                        Expired
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        Healthy
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal max-w-md w-full p-6 relative">
            <button onClick={closeAddModal} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
              <AiOutlineClose size={18} />
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">Add Medicine Item</h3>
            <form onSubmit={handleSaveItem} className="flex flex-col gap-3">
              <input type="text" name="name" placeholder="Item Name (e.g. Amoxicillin 500mg)" value={newItem.name} onChange={handleInputChange} required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
              <input type="text" name="category" placeholder="Category (e.g. Antibiotic, Analgesic)" value={newItem.category} onChange={handleInputChange} required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
              <div className="flex gap-3">
                <input type="number" name="quantity" placeholder="Quantity" value={newItem.quantity} onChange={handleInputChange} required className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
                <input type="number" step="0.01" name="price" placeholder="Price (₹)" value={newItem.price} onChange={handleInputChange} required className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
              </div>
              <div className="flex gap-3">
                <input type="date" name="expiryDate" value={newItem.expiryDate} onChange={handleInputChange} required className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
                <input type="number" name="threshold" placeholder="Threshold (e.g. 20)" value={newItem.threshold} onChange={handleInputChange} required className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
              </div>
              <input type="text" name="supplier" placeholder="Supplier Name" value={newItem.supplier} onChange={handleInputChange} required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
              <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 mt-2 rounded-xl font-bold text-xs shadow-sm">Save Medicine</button>
            </form>
          </div>
        </div>
      )}

      {/* Remove Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal max-w-md w-full p-6 relative">
            <button onClick={closeRemoveModal} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
              <AiOutlineClose size={18} />
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">Remove Medicine</h3>
            <select onChange={(e) => setSelectedItem(Number(e.target.value))} value={selectedItem || ""} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs mb-4">
              <option value="">Select Item to Delete</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <button onClick={handleRemoveSelectedItem} className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm">
              Confirm Delete
            </button>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal max-w-md w-full p-6 relative">
            <button onClick={closeUpdateModal} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
              <AiOutlineClose size={18} />
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">Edit Medicine</h3>
            <form onSubmit={handleUpdateItemDetails} className="flex flex-col gap-3">
              <input type="text" name="name" value={newItem.name} onChange={handleInputChange} required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
              <input type="text" name="category" value={newItem.category} onChange={handleInputChange} required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
              <div className="flex gap-3">
                <input type="number" name="quantity" value={newItem.quantity} onChange={handleInputChange} required className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
                <input type="number" step="0.01" name="price" value={newItem.price} onChange={handleInputChange} required className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
              </div>
              <div className="flex gap-3">
                <input type="date" name="expiryDate" value={newItem.expiryDate ? new Date(newItem.expiryDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} required className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
                <input type="number" name="threshold" value={newItem.threshold} onChange={handleInputChange} required className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
              </div>
              <input type="text" name="supplier" value={newItem.supplier} onChange={handleInputChange} required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs" />
              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 mt-2 rounded-xl font-bold text-xs shadow-sm">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      <AIGenericFinderModal 
        isOpen={isGenericFinderOpen} 
        onClose={() => setIsGenericFinderOpen(false)} 
        onSelectMedicine={(sub) => {
          setSearchQuery(sub.name);
          applyFilter(sub.name, '');
        }}
      />

    </div>
  );
}
