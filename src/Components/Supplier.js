import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import api from "../api/axiosConfig";
import toast from 'react-hot-toast';
import { AiOutlineClose, AiOutlineTeam, AiOutlineGlobal } from "react-icons/ai";
import { getLocalSuppliers, addLocalSupplier, deleteLocalSupplier } from "../utils/dataStore";

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
        setSuppliers(response.data);
        return;
      }
    } catch (error) {
      console.warn("Backend suppliers fetch offline, loading local store:", error);
    }
    const local = getLocalSuppliers();
    setSuppliers(local);
  };

  const validateForm = () => {
    let newErrors = {};

    const nameRegex = /^[A-Za-z\s]+$/;
    const phoneRegex = /^[0-9]{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formValues.SupplierID || isNaN(formValues.SupplierID) || Number(formValues.SupplierID) < 1) {
      newErrors.SupplierID = "Supplier ID is required and must be a number above 0.";
    }
    if (!formValues.SupplierName.trim() || !nameRegex.test(formValues.SupplierName)) {
      newErrors.SupplierName = "Supplier name should contain only alphabets.";
    }
    if (!formValues.ContactPerson.trim() || !nameRegex.test(formValues.ContactPerson)) {
      newErrors.ContactPerson = "Contact person should contain only alphabets.";
    }
    if (!formValues.PhoneNumber.match(phoneRegex)) {
      newErrors.PhoneNumber = "Phone number must be exactly 10 digits.";
    }
    if (!formValues.EmailAddress.match(emailRegex)) {
      newErrors.EmailAddress = "Enter a valid email (gmail.com or yahoo.com).";
    }
    if (!formValues.Address.trim()) {
      newErrors.Address = "Address is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nameRegex = /^[A-Za-z\s]+$/;
    const phoneRegex = /^[0-9]{10}$/;
    const emailRegex = /^[^\s@]+@(gmail\.com|yahoo\.com)$/;

    let fieldError = "";

    if (name === "SupplierID" && (isNaN(value) || value.trim() === "" || Number(value) < 1)) {
      fieldError = "Supplier ID must be a number above 0.";
    }
    if (name === "SupplierName" && (!value.trim() || !nameRegex.test(value))) {
      fieldError = "Supplier name should contain only alphabets.";
    }
    if (name === "ContactPerson" && (!value.trim() || !nameRegex.test(value))) {
      fieldError = "Contact person should contain only alphabets.";
    }
    if (name === "PhoneNumber" && !phoneRegex.test(value)) {
      fieldError = "Phone number must be exactly 10 digits.";
    }
    if (name === "EmailAddress" && !emailRegex.test(value)) {
      fieldError = "Enter a valid email (gmail.com or yahoo.com).";
    }
    if (name === "Address" && value.trim() === "") {
      fieldError = "Address is required.";
    }

    setErrors((prevErrors) => ({ ...prevErrors, [name]: fieldError }));
    setFormValues({ ...formValues, [name]: value });
  };

  const handleAddSupplier = () => {
    setModalOpen(true);
    setEditSupplier(null);
    setFormValues({
      SupplierID: "",
      SupplierName: "",
      ContactPerson: "",
      PhoneNumber: "",
      EmailAddress: "",
      Address: "",
    });
    setErrors({});
  };

  const handleEditSupplier = (supplier) => {
    setModalOpen(true);
    setEditSupplier(supplier.SupplierID);
    setFormValues({
      SupplierID: supplier.SupplierID,
      SupplierName: supplier.SupplierName,
      ContactPerson: supplier.ContactPerson,
      PhoneNumber: supplier.PhoneNumber,
      EmailAddress: supplier.EmailAddress,
      Address: supplier.Address,
    });
    setErrors({});
  };

  const handleSaveSupplier = async () => {
    if (!validateForm()) return;

    try {
      const method = editSupplier ? "PUT" : "POST";
      const url = editSupplier ? `/suppliers/${editSupplier}` : "/suppliers";

      await api({
        method,
        url,
        data: formValues,
      });
    } catch (error) {
      console.warn("Backend save supplier unavailable, saving locally:", error);
    }

    addLocalSupplier(formValues);
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
  const uniqueLocations = new Set(suppliers.map((s) => s.Address)).size;

  const filteredSuppliers = suppliers.filter((supplier) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      supplier.SupplierName.toLowerCase().includes(searchLower) ||
      supplier.ContactPerson.toLowerCase().includes(searchLower) ||
      supplier.SupplierID.toString().includes(searchLower)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="mb-8 mt-6 py-6 bg-gradient-to-r from-primary-800 to-primary-600 text-white rounded-2xl shadow-md text-center">
        <h1 className="text-3xl font-bold tracking-wide drop-shadow-sm">Suppliers Management</h1>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 max-w-5xl mx-auto">
        <div className="flex-1 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-6 shadow-card text-white relative overflow-hidden flex flex-col justify-center transform transition-all hover:-translate-y-1 hover:shadow-card-hover">
          <AiOutlineTeam className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-[60px]" />
          <h3 className="text-base font-semibold opacity-90 mb-2 z-10">Total Suppliers</h3>
          <p className="text-3xl font-bold z-10">{totalSuppliers}</p>
        </div>
        <div className="flex-1 bg-gradient-to-br from-warning to-warning-hover rounded-xl p-6 shadow-card text-white relative overflow-hidden flex flex-col justify-center transform transition-all hover:-translate-y-1 hover:shadow-card-hover">
          <AiOutlineGlobal className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-[60px]" />
          <h3 className="text-base font-semibold opacity-90 mb-2 z-10">Regions Covered</h3>
          <p className="text-3xl font-bold z-10">{uniqueLocations}</p>
        </div>
      </div>

      {/* Toolbar (Controls & Search) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <button 
          onClick={handleAddSupplier} 
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap"
        >
          Add New Supplier
        </button>

        <div className="w-full md:w-auto flex-1 max-w-xl ml-auto relative">
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, contact, or ID..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-500 transition-all shadow-sm hover:border-slate-400" 
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Person</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone No</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Id</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Address</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  {searchQuery ? "No suppliers match your search." : "No suppliers found. Add a new supplier to get started."}
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((supplier) => (
                <tr key={supplier.SupplierID} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{supplier.SupplierID}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">{supplier.SupplierName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">{supplier.ContactPerson}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">{supplier.PhoneNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">{supplier.EmailAddress}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200 truncate max-w-xs">{supplier.Address}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <button
                      className="text-primary-600 hover:text-primary-800 font-medium mr-4 transition-colors"
                      onClick={() => handleEditSupplier(supplier)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-danger hover:text-danger-hover font-medium transition-colors"
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

      {modalOpen &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal max-w-md w-full p-8 relative">
              <button onClick={() => setModalOpen(false)} className="absolute top-6 right-6 w-10 h-10 bg-slate-100 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center hover:bg-danger-bg hover:text-danger hover:rotate-90 transition-all">
                <AiOutlineClose size={20} />
              </button>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                {editSupplier ? "Edit Supplier" : "Add Supplier"}
              </h3>
              
              <form onSubmit={(e) => { e.preventDefault(); handleSaveSupplier(); }} className="flex flex-col gap-4">
                <div>
                  <input
                    type="number"
                    name="SupplierID"
                    placeholder="Supplier ID"
                    min="1"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-700 dark:text-slate-200"
                    value={formValues.SupplierID}
                    onChange={handleInputChange}
                    disabled={!!editSupplier}
                  />
                  {errors.SupplierID && <span className="text-xs text-danger mt-1 block">{errors.SupplierID}</span>}
                </div>

                <div>
                  <input
                    type="text"
                    name="SupplierName"
                    placeholder="Supplier Name"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-700 dark:text-slate-200"
                    value={formValues.SupplierName}
                    onChange={handleInputChange}
                  />
                  {errors.SupplierName && <span className="text-xs text-danger mt-1 block">{errors.SupplierName}</span>}
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      name="ContactPerson"
                      placeholder="Contact Person"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-700 dark:text-slate-200"
                      value={formValues.ContactPerson}
                      onChange={handleInputChange}
                    />
                    {errors.ContactPerson && <span className="text-xs text-danger mt-1 block">{errors.ContactPerson}</span>}
                  </div>

                  <div className="flex-1">
                    <input
                      type="text"
                      name="PhoneNumber"
                      placeholder="Phone Number"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-700 dark:text-slate-200"
                      value={formValues.PhoneNumber}
                      onChange={handleInputChange}
                    />
                    {errors.PhoneNumber && <span className="text-xs text-danger mt-1 block">{errors.PhoneNumber}</span>}
                  </div>
                </div>

                <div>
                  <input
                    type="email"
                    name="EmailAddress"
                    placeholder="Email Address"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-700 dark:text-slate-200"
                    value={formValues.EmailAddress}
                    onChange={handleInputChange}
                  />
                  {errors.EmailAddress && <span className="text-xs text-danger mt-1 block">{errors.EmailAddress}</span>}
                </div>

                <div>
                  <textarea
                    name="Address"
                    placeholder="Address"
                    rows="2"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-700 dark:text-slate-200 resize-none"
                    value={formValues.Address}
                    onChange={handleInputChange}
                  ></textarea>
                  {errors.Address && <span className="text-xs text-danger mt-1 block">{errors.Address}</span>}
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 mt-2 rounded-xl font-bold shadow-sm hover:shadow-md transition-all"
                >
                  {editSupplier ? "Save Changes" : "Save Supplier"}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Supplier;