import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axiosConfig';
import { AiOutlineShoppingCart, AiOutlineCheckCircle, AiOutlinePercentage, AiOutlineClose } from 'react-icons/ai';
import toast from 'react-hot-toast';
import { getLocalOrders, addLocalOrder, updateLocalOrderStatus, deleteLocalOrder, getLocalInventory } from '../utils/dataStore';

const normalizeOrder = (o) => {
  const meds = Array.isArray(o.Medicines) && o.Medicines.length > 0
    ? o.Medicines
    : (Array.isArray(o.medicines) && o.medicines.length > 0 ? o.medicines : []);
  
  const calcTotal = meds.reduce((sum, m) => sum + ((parseFloat(m.price) || 0) * (parseInt(m.quantity, 10) || 1)), 0);
  const total = parseFloat(o.TotalPrice) || parseFloat(o.TotalAmount) || calcTotal || 0;

  return {
    OrderID: o.OrderID || o.id || 101,
    id: o.OrderID || o.id || 101,
    SupplierID: o.SupplierID || o.supplier_id || 1,
    SupplierName: o.SupplierName || `Supplier #${o.SupplierID || 1}`,
    DeliveryDate: o.DeliveryDate || o.delivery_date || new Date().toISOString().split('T')[0],
    Delivery_Status: Boolean(o.Delivery_Status || o.delivery_status || o.Status === 'Delivered'),
    TotalPrice: total,
    TotalAmount: total,
    Medicines: meds.map(m => ({
      id: m.id || Date.now(),
      name: m.name || m.medicine_name || 'Medicine',
      category: m.category || 'General',
      quantity: parseInt(m.quantity, 10) || 1,
      price: parseFloat(m.price) || parseFloat(m.unit_price) || 0
    })),
    medicines: meds.map(m => ({
      id: m.id || Date.now(),
      name: m.name || m.medicine_name || 'Medicine',
      category: m.category || 'General',
      quantity: parseInt(m.quantity, 10) || 1,
      price: parseFloat(m.price) || parseFloat(m.unit_price) || 0
    }))
  };
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [inventoryMedicines, setInventoryMedicines] = useState([]);
  const [newOrder, setNewOrder] = useState({
    OrderID: "",
    SupplierID: "1",
    DeliveryDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    medicines: [{ id: 1, name: "Amoxicillin 500mg", category: "Antibiotic", quantity: 20, price: 85.00 }],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const fetchOrders = async () => {
    try {
      const response = await api.get("/orders");
      if (Array.isArray(response.data) && response.data.length > 0) {
        setOrders(response.data.map(normalizeOrder));
        return;
      }
    } catch (error) {
      console.warn("Backend orders fetch offline, loading local store:", error);
    }
    const local = getLocalOrders().map(normalizeOrder);
    setOrders(local);
  };

  const fetchInventoryMedicines = async () => {
    try {
      const response = await api.get("/inventory/names");
      if (Array.isArray(response.data) && response.data.length > 0) {
        setInventoryMedicines(response.data);
        return;
      }
    } catch (err) {
      console.warn("Using local inventory medicine list");
    }
    const localInv = getLocalInventory();
    setInventoryMedicines(localInv.map(i => ({ id: i.id, name: i.name, category: i.category, price: i.price })));
  };

  useEffect(() => {
    fetchOrders();
    fetchInventoryMedicines();
  }, []);

  const handleOpenAddModal = () => {
    const nextOrderId = orders.length > 0 
      ? Math.max(...orders.map(o => parseInt(o.OrderID, 10) || 0)) + 1 
      : 104;

    const sampleMed = inventoryMedicines.length > 0 
      ? inventoryMedicines[0] 
      : { id: 1, name: 'Amoxicillin 500mg', category: 'Antibiotic', price: 85 };

    setNewOrder({
      OrderID: nextOrderId.toString(),
      SupplierID: "1",
      DeliveryDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      medicines: [
        {
          id: Date.now(),
          name: sampleMed.name,
          category: sampleMed.category || 'General',
          quantity: 25,
          price: sampleMed.price || 50
        }
      ]
    });
    setIsAddModalOpen(true);
  };

  const handleNewOrderChange = (e) => {
    setNewOrder({ ...newOrder, [e.target.name]: e.target.value });
  };

  const updateMedicine = (id, field, value) => {
    setNewOrder((prevOrder) => ({
      ...prevOrder,
      medicines: prevOrder.medicines.map((med) => {
        if (med.id === id) {
          const updated = { ...med, [field]: value };
          // If name selected from inventory list, auto-fill category and price
          if (field === 'name') {
            const found = inventoryMedicines.find(i => i.name.toLowerCase() === value.toLowerCase());
            if (found) {
              if (found.category) updated.category = found.category;
              if (found.price) updated.price = found.price;
            }
          }
          return updated;
        }
        return med;
      })
    }));
  };

  const removeMedicine = (id) => {
    if (newOrder.medicines.length <= 1) {
      toast.error("Order must contain at least one medicine.");
      return;
    }
    setNewOrder((prevOrder) => ({
      ...prevOrder,
      medicines: prevOrder.medicines.filter((medicine) => medicine.id !== id),
    }));
  };

  const addMedicine = () => {
    const uniqueId = Date.now();
    setNewOrder((prevOrder) => ({
      ...prevOrder,
      medicines: [
        ...prevOrder.medicines,
        { id: uniqueId, name: "", category: "General", quantity: 10, price: 50 },
      ],
    }));
  };

  const calculateTotal = () => {
    return newOrder.medicines.reduce(
      (total, medicine) => total + ((parseFloat(medicine.quantity) || 0) * (parseFloat(medicine.price) || 0)),
      0
    );
  };

  const addOrder = async () => {
    const { OrderID, SupplierID, DeliveryDate, medicines } = newOrder;
    const resolvedId = OrderID && OrderID.trim() ? OrderID.trim() : `ORD-${Date.now().toString().slice(-4)}`;
    const resolvedDate = DeliveryDate && DeliveryDate.trim() ? DeliveryDate : new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

    if (!medicines || medicines.length === 0) {
      toast.error("Please add at least one medicine.");
      return;
    }

    const cleanMeds = medicines.map(({ id, name, category, quantity, price }) => ({
      id: id || Date.now(),
      name: name && name.trim() ? name.trim() : 'Medicine Item',
      category: category && category.trim() ? category.trim() : 'General',
      quantity: parseInt(quantity, 10) || 1,
      price: parseFloat(price) || 10
    }));

    const totalAmt = cleanMeds.reduce((sum, m) => sum + (m.price * m.quantity), 0);

    const payload = {
      OrderID: resolvedId,
      id: resolvedId,
      SupplierID: parseInt(SupplierID, 10) || 1,
      DeliveryDate: resolvedDate,
      TotalPrice: totalAmt,
      TotalAmount: totalAmt,
      medicines: cleanMeds,
      Medicines: cleanMeds
    };

    try {
      await api.post("/orders", {
        OrderID: resolvedId,
        SupplierID: parseInt(SupplierID, 10) || 1,
        DeliveryDate: resolvedDate,
        TotalPrice: totalAmt,
        medicines: cleanMeds
      });
    } catch (error) {
      console.warn("Backend order save unavailable, saving locally:", error);
    }

    addLocalOrder(payload);
    fetchOrders();
    setIsAddModalOpen(false);
    toast.success(`Purchase order #${resolvedId} created successfully!`);
  };
    
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;

    try {
      await api.delete(`/orders/${orderId}`);
    } catch (error) {
      console.warn("Backend delete order unavailable, deleting locally:", error);
    }

    deleteLocalOrder(orderId);
    setOrders((prevOrders) => prevOrders.filter((order) => order.OrderID !== orderId && order.id !== orderId));
    toast.success("Order removed successfully!");
  };

  const handleCheckboxChange = async (orderId, delivered) => {
    try {
      await api.put(`/orders/${orderId}/deliver`, { delivered });
    } catch (error) {
      console.warn("Backend deliver status update offline, updating locally");
    }

    updateLocalOrderStatus(orderId, delivered);
    setOrders(prevOrders =>
      prevOrders.map(order =>
        (order.OrderID === orderId || order.id === orderId)
          ? { ...order, Delivery_Status: delivered, Status: delivered ? 'Delivered' : 'Pending' }
          : order
      )
    );

    if (delivered) {
      toast.success(`Order #${orderId} marked as DELIVERED!`);
    } else {
      toast.success(`Order #${orderId} marked as PENDING`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return dateString.split("T")[0];
  };

  const deliveredOrders = useMemo(() => orders.filter((order) => order.Delivery_Status), [orders]);
  const totalOrders = orders.length;
  const deliveredPercentage = totalOrders === 0 ? "0.00" : ((deliveredOrders.length / totalOrders) * 100).toFixed(2);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filterStatus === "Delivered" && !order.Delivery_Status) return false;
      if (filterStatus === "Pending" && order.Delivery_Status) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const orderIdMatch = String(order.OrderID).toLowerCase().includes(query);
        const supplierIdMatch = String(order.SupplierID).toLowerCase().includes(query);
        const medicinesMatch = Array.isArray(order.Medicines) && order.Medicines.some(med => 
          (med.name || '').toLowerCase().includes(query) || 
          (med.category || '').toLowerCase().includes(query)
        );
        return orderIdMatch || supplierIdMatch || medicinesMatch;
      }
      return true;
    });
  }, [orders, filterStatus, searchQuery]);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-10 px-5 md:px-8 mx-auto w-full">
      {/* Page Header */}
      <div className="mb-8 mt-6 py-6 bg-gradient-to-r from-primary-800 to-primary-600 text-white rounded-2xl shadow-md text-center">
        <h1 className="text-3xl font-bold tracking-wide drop-shadow-sm">Procurement & Orders</h1>
        <p className="text-xs text-primary-100 mt-1">Manage purchase orders, bulk supplies, delivery status, and restocking history</p>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 max-w-7xl mx-auto">
        <div className="flex-1 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 shadow-md text-white relative overflow-hidden flex flex-col justify-center transform transition-all hover:-translate-y-0.5">
          <AiOutlineShoppingCart className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-[60px]" />
          <h3 className="text-sm font-semibold opacity-90 mb-1 z-10">Total Orders</h3>
          <p className="text-3xl font-extrabold z-10">{totalOrders}</p>
        </div>
        <div className="flex-1 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 shadow-md text-white relative overflow-hidden flex flex-col justify-center transform transition-all hover:-translate-y-0.5">
          <AiOutlineCheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-[60px]" />
          <h3 className="text-sm font-semibold opacity-90 mb-1 z-10">Delivered Orders</h3>
          <p className="text-3xl font-extrabold z-10">{deliveredOrders.length}</p>
        </div>
        <div className="flex-1 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 shadow-md text-white relative overflow-hidden flex flex-col justify-center transform transition-all hover:-translate-y-0.5">
          <AiOutlinePercentage className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-[60px]" />
          <h3 className="text-sm font-semibold opacity-90 mb-1 z-10">Delivery Fulfilled</h3>
          <p className="text-3xl font-extrabold z-10">{deliveredPercentage}%</p>
        </div>
      </div>

      {/* Actions and Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap gap-3">
          <button 
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 text-xs uppercase tracking-wide" 
            onClick={() => setIsHistoryModalOpen(true)}
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Order History ({deliveredOrders.length})
          </button>
          <button 
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-xs uppercase tracking-wide" 
            onClick={handleOpenAddModal}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            + Create New Order
          </button>
        </div>

        <div className="w-full md:w-auto flex-1 max-w-xl ml-auto mt-2 md:mt-0 flex gap-3">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-1/3 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-slate-800 dark:text-slate-100 shadow-sm cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Delivered">Delivered</option>
            <option value="Pending">Pending</option>
          </select>
          <div className="relative w-2/3">
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders, medicines, suppliers..." 
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 shadow-sm" 
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
      </div>

      {/* Main Orders Table */}
      <div className="max-w-7xl mx-auto overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Medicines & Qty</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier ID</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Price</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Delivery Date</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Delivered</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr key={order.OrderID} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-900 dark:text-white">
                    #{order.OrderID}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-700 dark:text-slate-200 max-w-sm">
                    {Array.isArray(order.Medicines) && order.Medicines.length > 0 ? (
                      <div className="space-y-1">
                        {order.Medicines.map((med, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">{med.name}</span>
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px]">{med.category || 'General'}</span>
                            <span className="text-slate-500">× {med.quantity} units</span>
                            <span className="text-slate-400 text-[10px]">(₹{med.price}/u)</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <em className="text-slate-400 text-xs">Standard Bulk Batch</em>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300">
                    Supplier #{order.SupplierID}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-900 dark:text-white">
                    ₹{order.TotalPrice ? order.TotalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                    {formatDate(order.DeliveryDate)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer accent-emerald-600 rounded"
                      checked={Boolean(order.Delivery_Status)}
                      onChange={(e) => handleCheckboxChange(order.OrderID, e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      className="text-red-500 hover:text-red-700 dark:text-red-400 text-xs font-bold transition-colors" 
                      onClick={() => handleDeleteOrder(order.OrderID)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                  {searchQuery || filterStatus !== "All" ? "No purchase orders match your criteria." : "No orders found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Order Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 relative border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
            <button 
              className="absolute top-5 right-5 w-8 h-8 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all" 
              onClick={() => setIsAddModalOpen(false)}
            >
              <AiOutlineClose size={16} />
            </button>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-3 mb-5">
              Create New Purchase Order
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Order ID *</label>
                <input 
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-slate-800 dark:text-slate-100 font-mono" 
                  type="text" 
                  name="OrderID" 
                  value={newOrder.OrderID} 
                  onChange={handleNewOrderChange} 
                  required 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Supplier ID *</label>
                <input 
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-slate-800 dark:text-slate-100" 
                  type="number" 
                  min="1"
                  name="SupplierID" 
                  value={newOrder.SupplierID} 
                  onChange={handleNewOrderChange} 
                  required 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Delivery Date *</label>
                <input 
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-slate-800 dark:text-slate-100" 
                  type="date" 
                  name="DeliveryDate" 
                  value={newOrder.DeliveryDate} 
                  onChange={handleNewOrderChange} 
                  required 
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Medicines & Quantities</h4>
              <button 
                type="button"
                className="text-xs font-bold text-primary-600 hover:text-primary-700" 
                onClick={addMedicine}
              >
                + Add Another Drug
              </button>
            </div>

            <div className="space-y-3 mb-5 max-h-60 overflow-y-auto pr-1">
              {newOrder.medicines.map((medicine, idx) => (
                <div key={medicine.id || idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-700/30">
                  <div className="flex-1 min-w-[140px]">
                    <input 
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs" 
                      type="text" 
                      list="medicineOptions" 
                      placeholder="Medicine Name" 
                      value={medicine.name} 
                      onChange={(e) => updateMedicine(medicine.id, "name", e.target.value)} 
                      required 
                    />
                    <datalist id="medicineOptions">
                      {inventoryMedicines.map((med, i) => (
                        <option key={med.id || i} value={med.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="w-28">
                    <input 
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs" 
                      type="text" 
                      placeholder="Category" 
                      value={medicine.category} 
                      onChange={(e) => updateMedicine(medicine.id, "category", e.target.value)} 
                    />
                  </div>
                  <div className="w-20">
                    <input 
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs" 
                      type="number" 
                      min="1"
                      placeholder="Qty" 
                      value={medicine.quantity} 
                      onChange={(e) => updateMedicine(medicine.id, "quantity", e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="w-24">
                    <input 
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs" 
                      type="number" 
                      min="1"
                      placeholder="Price (₹)" 
                      value={medicine.price} 
                      onChange={(e) => updateMedicine(medicine.id, "price", e.target.value)} 
                      required 
                    />
                  </div>
                  <button 
                    type="button"
                    className="w-7 h-7 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center font-bold text-xs" 
                    onClick={() => removeMedicine(medicine.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl mb-5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Estimated Total:</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <button 
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all" 
              onClick={addOrder}
            >
              Save & Dispatch Purchase Order
            </button>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 relative border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
            <button 
              className="absolute top-5 right-5 w-8 h-8 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all" 
              onClick={() => setIsHistoryModalOpen(false)}
            >
              <AiOutlineClose size={16} />
            </button>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-3 mb-5 text-center">
              Delivered Purchase Orders History
            </h3>
            {deliveredOrders.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                      <th className="px-6 py-3.5">Order ID</th>
                      <th className="px-6 py-3.5">Delivered Medicines</th>
                      <th className="px-6 py-3.5">Supplier ID</th>
                      <th className="px-6 py-3.5">Total Amount</th>
                      <th className="px-6 py-3.5">Date Delivered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {deliveredOrders.map((order) => (
                      <tr key={order.OrderID} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white">#{order.OrderID}</td>
                        <td className="px-6 py-4 text-xs text-slate-700 dark:text-slate-200">
                          {Array.isArray(order.Medicines) && order.Medicines.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-1">
                              {order.Medicines.map((med, index) => (
                                <li key={index}>
                                  {med.name} ({med.category}) - {med.quantity} units - ₹{med.price}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <em className="text-slate-400">Standard Bulk Batch</em>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-700 dark:text-slate-300">Supplier #{order.SupplierID}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white">₹{order.TotalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">{formatDate(order.DeliveryDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">No orders delivered yet. Check the checkbox on the main page when an order arrives.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
