import React, { useState, useEffect, useMemo } from "react";
import api from "../api/axiosConfig";
import toast from 'react-hot-toast';
import { AiOutlineClose, AiOutlineTeam, AiOutlineGlobal } from "react-icons/ai";
import { getLocalSuppliers, addLocalSupplier, deleteLocalSupplier } from "../utils/dataStore";

const normalizeSupplier = (s) => ({
  SupplierID: s.SupplierID || s.id || 1,
  SupplierName: s.SupplierName || s.name || 'Pharma Supplier',
  ContactPerson: s.ContactPerson || s.contact_person || (s.name ? s.name.split(' ')[0] : 'Manager'),
  PhoneNumber: s.PhoneNumber || s.contact || s.phone || '9876543210',
  EmailAddress: s.EmailAddress || s.email || 'supplier@pharma.com',
  Address: s.Address || s.address || 'Standard Location',
  leadTime: s.leadTime || '2 Days'
});

const Supplier = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editSupplier, setEditSupplier] = useState(null);
  const [formValues, setFormValues] = useState({
    SupplierID: "",
    SupplierName: "",
    ContactPerson: "",
    PhoneNumber: "",
    EmailAddress: "",
    Address: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get("/suppliers");
      if (Array.isArray(response.data) && response.data.length > 0) {
        setSuppliers(response.data.map(normalizeSupplier));
        return;
      }
    } catch (error) {
      console.warn("Backend suppliers fetch offline, loading local store:", error);
    }
    const local = getLocalSuppliers().map(normalizeSupplier);
    setSuppliers(local);
  };

  const validateForm = () => {
    let newErrors = {};
    const nameRegex = /^[A-Za-z\s]+$/;
    const phoneRegex = /^[0-9]{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formValues.SupplierName?.trim() || !nameRegex.test(formValues.SupplierName)) {
      newErrors.SupplierName = "Supplier name should contain alphabets.";
    }
    if (!formValues.ContactPerson?.trim()) {
      newErrors.ContactPerson = "Contact person is required.";
    }
    if (!formValues.PhoneNumber || !formValues.PhoneNumber.match(phoneRegex)) {
      newErrors.PhoneNumber = "Phone number must be exactly 10 digits.";
    }
    if (!formValues.EmailAddress || !formValues.EmailAddress.match(emailRegex)) {
      newErrors.EmailAddress = "Enter a valid email address.";
    }
    if (!formValues.Address?.trim()) {
      newErrors.Address = "Address is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
    setFormValues({ ...formValues, [name]: value });
  };

  const handleAddSupplier = () => {
    const nextId = suppliers.length > 0 ? Math.max(...suppliers.map(s => parseInt(s.SupplierID, 10) || 0)) + 1 : 1;
    setFormValues({
      SupplierID: nextId.toString(),
      SupplierName: "",
      ContactPerson: "",
      PhoneNumber: "",
      EmailAddress: "",
      Address: "",
    });
    setErrors({});
    setEditSupplier(null);
    setModalOpen(true);
  };

  const handleEditSupplier = (supplier) => {
    setEditSupplier(supplier.SupplierID);
    setFormValues({
      SupplierID: supplier.SupplierID.toString(),
      SupplierName: supplier.SupplierName || "",
      ContactPerson: supplier.ContactPerson || "",
      PhoneNumber: supplier.PhoneNumber || "",
      EmailAddress: supplier.EmailAddress || "",
      Address: supplier.Address || "",
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!validateForm()) return;

    const payload = {
      id: parseInt(formValues.SupplierID, 10) || Date.now(),
      SupplierID: parseInt(formValues.SupplierID, 10) || Date.now(),
      name: formValues.SupplierName.trim(),
      SupplierName: formValues.SupplierName.trim(),
      ContactPerson: formValues.ContactPerson.trim(),
      contact_person: formValues.ContactPerson.trim(),
      phone: formValues.PhoneNumber.trim(),
      PhoneNumber: formValues.PhoneNumber.trim(),
      contact: formValues.PhoneNumber.trim(),
      email: formValues.EmailAddress.trim(),
      EmailAddress: formValues.EmailAddress.trim(),
      address: formValues.Address.trim(),
      Address: formValues.Address.trim()
    };

    try {
      const method = editSupplier ? "PUT" : "POST";
      const url = editSupplier ? `/suppliers/${editSupplier}` : "/suppliers";
      await api({ method, url, data: payload });
    } catch (error) {
      console.warn("Backend save supplier unavailable, saving locally:", error);
    }

    addLocalSupplier(payload);
    toast.success(editSupplier ? "Supplier updated successfully" : "Supplier added successfully");
    fetchSuppliers();
    setModalOpen(false);
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;

    try {
      await api.delete(`/suppliers/${id}`);
    } catch (error) {
      console.warn("Backend delete supplier unavailable, deleting locally:", error);
    }
    deleteLocalSupplier(id);
    toast.success("Supplier deleted successfully");
    fetchSuppliers();
  };

  const totalSuppliers = suppliers.length;
  const uniqueLocations = useMemo(() => {
    return new Set(suppliers.map((s) => s.Address).filter(Boolean)).size;
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    const searchLower = (searchQuery || "").toLowerCase();
    if (!searchLower) return suppliers;
    return suppliers.filter((supplier) => {
      const name = (supplier.SupplierName || "").toLowerCase();
      const person = (supplier.ContactPerson || "").toLowerCase();
      const id = String(supplier.SupplierID || "");
      return name.includes(searchLower) || person.includes(searchLower) || id.includes(searchLower);
    });
  }, [suppliers, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="mb-8 mt-6 py-6 bg-gradient-to-r from-primary-800 to-primary-600 text-white rounded-2xl shadow-md text-center">
        <h1 className="text-3xl font-bold tracking-wide drop-shadow-sm">Suppliers Management</h1>
        <p className="text-xs text-primary-100 mt-1">Manage verified pharmaceutical distributors, contacts, and delivery networks</p>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 max-w-5xl mx-auto">
        <div className="flex-1 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 shadow-md text-white relative overflow-hidden flex flex-col justify-center transform transition-all hover:-translate-y-0.5">
          <AiOutlineTeam className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-[60px]" />
          <h3 className="text-sm font-semibold opacity-90 mb-1 z-10">Total Suppliers</h3>
          <p className="text-3xl font-extrabold z-10">{totalSuppliers}</p>
        </div>
        <div className="flex-1 bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-6 shadow-md text-white relative overflow-hidden flex flex-col justify-center transform transition-all hover:-translate-y-0.5">
          <AiOutlineGlobal className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-[60px]" />
          <h3 className="text-sm font-semibold opacity-90 mb-1 z-10">Regions Covered</h3>
          <p className="text-3xl font-extrabold z-10">{uniqueLocations}</p>
        </div>
      </div>

      {/* Toolbar (Controls & Search) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <button 
          onClick={handleAddSupplier} 
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap text-sm"
        >
          + Add New Supplier
        </button>

        <div className="w-full md:w-auto flex-1 max-w-xl ml-auto relative">
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by supplier name, contact, or ID..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all shadow-sm" 
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier Name</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Person</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone No</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Id</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  {searchQuery ? "No suppliers match your search." : "No suppliers found. Add a new supplier to get started."}
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((supplier) => (
                <tr key={supplier.SupplierID} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-3.5 whitespace-nowrap text-xs font-bold text-slate-900 dark:text-white">#{supplier.SupplierID}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-800 dark:text-slate-200">{supplier.SupplierName}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{supplier.ContactPerson}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{supplier.PhoneNumber}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{supplier.EmailAddress}</td>
                  <td className="px-6 py-3.5 text-xs text-slate-600 dark:text-slate-300 truncate max-w-xs">{supplier.Address}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-xs text-right font-medium">
                    <button
                      className="text-primary-600 hover:text-primary-800 dark:text-primary-400 font-bold mr-3 transition-colors"
                      onClick={() => handleEditSupplier(supplier)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700 dark:text-red-400 font-bold transition-colors"
                      onClick={() => handleDeleteSupplier(supplier.SupplierID)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Safe Inline Modal (Zero Portal Crashes) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setModalOpen(false)} 
              className="absolute top-5 right-5 w-8 h-8 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <AiOutlineClose size={16} />
            </button>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-3 mb-5">
              {editSupplier ? "Edit Supplier Profile" : "Add New Supplier"}
            </h3>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSaveSupplier(); }} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Supplier Name *</label>
                <input
                  type="text"
                  name="SupplierName"
                  placeholder="e.g. Sun Pharma Distributors"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-slate-800 dark:text-slate-100"
                  value={formValues.SupplierName}
                  onChange={handleInputChange}
                  required
                />
                {errors.SupplierName && <span className="text-[11px] text-red-500 mt-1 block">{errors.SupplierName}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Contact Person *</label>
                  <input
                    type="text"
                    name="ContactPerson"
                    placeholder="e.g. Rajesh Mehta"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-slate-800 dark:text-slate-100"
                    value={formValues.ContactPerson}
                    onChange={handleInputChange}
                    required
                  />
                  {errors.ContactPerson && <span className="text-[11px] text-red-500 mt-1 block">{errors.ContactPerson}</span>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Phone Number (10 Digits) *</label>
                  <input
                    type="tel"
                    name="PhoneNumber"
                    maxLength="10"
                    placeholder="e.g. 9820112345"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-slate-800 dark:text-slate-100"
                    value={formValues.PhoneNumber}
                    onChange={handleInputChange}
                    required
                  />
                  {errors.PhoneNumber && <span className="text-[11px] text-red-500 mt-1 block">{errors.PhoneNumber}</span>}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Email Address *</label>
                <input
                  type="email"
                  name="EmailAddress"
                  placeholder="e.g. orders@sunpharma.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-slate-800 dark:text-slate-100"
                  value={formValues.EmailAddress}
                  onChange={handleInputChange}
                  required
                />
                {errors.EmailAddress && <span className="text-[11px] text-red-500 mt-1 block">{errors.EmailAddress}</span>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Warehouse / Office Address *</label>
                <textarea
                  name="Address"
                  placeholder="e.g. Plot 45, MIDC Industrial Area, Andheri, Mumbai"
                  rows="2"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-slate-800 dark:text-slate-100 resize-none"
                  value={formValues.Address}
                  onChange={handleInputChange}
                  required
                ></textarea>
                {errors.Address && <span className="text-[11px] text-red-500 mt-1 block">{errors.Address}</span>}
              </div>

              <button
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 mt-1 rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-xs tracking-wide uppercase"
              >
                {editSupplier ? "Save Changes" : "Create Supplier Profile"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Supplier;
