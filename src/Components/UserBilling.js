import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { 
  FaCashRegister, 
  FaSearch, 
  FaBarcode, 
  FaPlus, 
  FaMinus, 
  FaTrashAlt, 
  FaFilePrescription, 
  FaExchangeAlt, 
  FaCheckCircle, 
  FaTimes, 
  FaDownload, 
  FaHistory, 
  FaMoneyBillWave, 
  FaQrcode, 
  FaCreditCard, 
  FaUserCheck, 
  FaShieldAlt, 
  FaReceipt
} from 'react-icons/fa';
import AIDrugSafetyAlert from './AIDrugSafetyAlert';
import AIGenericFinderModal from './AIGenericFinderModal';
import AIPrescriptionParserModal from './AIPrescriptionParserModal';

const UserBilling = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("pos");
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);

  const [billItems, setBillItems] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxRate, setTaxRate] = useState(18);

  const [isWalkIn, setIsWalkIn] = useState(true);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [doctorName, setDoctorName] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [upiStatus, setUpiStatus] = useState("idle");
  const [upiRefId, setUpiRefId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedBill, setCompletedBill] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [storeSettings, setStoreSettings] = useState({
    business_name: "MedStock Pharmacy & Healthcare",
    business_address: "124, Healthcare Boulevard, Medical Enclave",
    business_gstin: "27AABCU9603R1ZM",
    business_contact: "+91 98765 43210",
    tax_rate: 18.00
  });

  const [todaySales, setTodaySales] = useState({ totalSales: 0, totalRevenue: 0, paymentBreakdown: [] });
  const [billingHistory, setBillingHistory] = useState([]);
  const [historyFilterRange, setHistoryFilterRange] = useState("today");
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState("all");
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryBill, setSelectedHistoryBill] = useState(null);

  const [drugSafetyResult, setDrugSafetyResult] = useState(null);
  const [isGenericFinderOpen, setIsGenericFinderOpen] = useState(false);
  const [isPrescriptionParserOpen, setIsPrescriptionParserOpen] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchStoreSettings();
    fetchTodaySales();
    fetchBillingHistory();
  }, []);

  useEffect(() => {
    if (location.state?.importedPrescription) {
      const { medicines, patientName, doctorName: docName } = location.state.importedPrescription;
      if (Array.isArray(medicines) && medicines.length > 0) {
        const formattedItems = medicines.map(m => ({
          name: m.medicineName || m.name,
          category: m.category || "General",
          quantity: m.quantity || 1,
          price: parseFloat(m.unitPrice || m.price || 0),
          discount: 0,
          inventoryId: m.inventoryId || null
        }));
        
        setBillItems(formattedItems);
        if (patientName) {
          setCustomerName(patientName);
          setIsWalkIn(false);
        }
        if (docName) {
          setDoctorName(docName);
        }
      }
    }
  }, [location.state]);

  useEffect(() => {
    const checkSafety = async () => {
      if (billItems.length >= 2) {
        try {
          const medNames = billItems.map(item => item.name);
          const res = await api.post('/ai/check-interactions', { medicines: medNames });
          setDrugSafetyResult(res.data);
        } catch (err) {
          console.error("AI safety check error:", err);
        }
      } else if (billItems.length === 1) {
        setDrugSafetyResult({
          safe: true,
          interactionsFound: 0,
          alerts: [],
          message: "Single drug regimen. No interaction conflicts identified."
        });
      } else {
        setDrugSafetyResult(null);
      }
    };
    checkSafety();
  }, [billItems]);

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      setInventory(response.data || []);
    } catch (error) {
      toast.error("Failed to load live inventory.");
    }
  };

  const fetchStoreSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data && response.data.business_name) {
        setStoreSettings(response.data);
        if (response.data.tax_rate) {
          setTaxRate(parseFloat(response.data.tax_rate) || 18);
        }
      }
    } catch (error) {
      console.log("Using default store settings");
    }
  };

  const fetchTodaySales = async () => {
    try {
      const response = await api.get("/sales/summary?range=today");
      setTodaySales(response.data || { totalSales: 0, totalRevenue: 0, paymentBreakdown: [] });
    } catch (error) {
      console.error("Error fetching today sales:", error);
    }
  };

  const fetchBillingHistory = async () => {
    try {
      const response = await api.get("/get-bills");
      setBillingHistory(response.data || []);
    } catch (error) {
      console.error("Error fetching billing history:", error);
    }
  };

  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return inventory.filter(item => {
      const nameMatch = item.name && item.name.toLowerCase().includes(query);
      const catMatch = item.category && item.category.toLowerCase().includes(query);
      const categoryFilterMatch = categoryFilter === "All" || item.category === categoryFilter;
      return (nameMatch || catMatch) && categoryFilterMatch;
    }).slice(0, 8);
  }, [inventory, searchQuery, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set(inventory.map(i => i.category).filter(Boolean));
    return ["All", ...Array.from(cats)];
  }, [inventory]);

  const handleAddItemToCart = (item) => {
    if (!item) return;
    if (item.quantity <= 0) {
      toast.error(`"${item.name}" is OUT OF STOCK.`);
      return;
    }
    const existingIndex = billItems.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase());
    if (existingIndex > -1) {
      const currentCartQty = billItems[existingIndex].quantity;
      if (currentCartQty + 1 > item.quantity) {
        toast.error(`Cannot add more. Only ${item.quantity} units available in stock.`);
        return;
      }
      const updated = [...billItems];
      updated[existingIndex].quantity += 1;
      setBillItems(updated);
    } else {
      setBillItems(prev => [
        ...prev,
        {
          name: item.name,
          category: item.category || "General",
          quantity: 1,
          price: parseFloat(item.price) || 0,
          discount: 0,
          inventoryId: item.id
        }
      ]);
    }
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  const handleUpdateQuantity = (index, delta) => {
    const item = billItems[index];
    const invItem = inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase());
    const availableStock = invItem ? invItem.quantity : 999;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    if (newQty > availableStock) {
      toast.error(`Stock limit reached! Only ${availableStock} units available.`);
      return;
    }
    const updated = [...billItems];
    updated[index].quantity = newQty;
    setBillItems(updated);
  };

  const handleDirectQuantityChange = (index, val) => {
    const qty = parseInt(val, 10) || 1;
    const item = billItems[index];
    const invItem = inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase());
    const availableStock = invItem ? invItem.quantity : 999;
    if (qty > availableStock) {
      toast.error(`Only ${availableStock} units in stock.`);
      const updated = [...billItems];
      updated[index].quantity = availableStock;
      setBillItems(updated);
      return;
    }
    const updated = [...billItems];
    updated[index].quantity = Math.max(1, qty);
    setBillItems(updated);
  };

  const handleRemoveItem = (index) => {
    setBillItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    if (window.confirm("Clear cart?")) {
      setBillItems([]);
      setDiscountPercent(0);
      setCashReceived("");
      setUpiStatus("idle");
    }
  };

  const calculations = useMemo(() => {
    const subtotal = billItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const itemDiscounts = billItems.reduce((sum, item) => sum + ((item.quantity * item.price) * (item.discount || 0) / 100), 0);
    const billDiscountAmt = (subtotal - itemDiscounts) * (discountPercent / 100);
    const totalDiscount = itemDiscounts + billDiscountAmt;
    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const totalTax = taxableAmount * (taxRate / 100);
    const rawGrandTotal = taxableAmount + totalTax;
    const roundOff = Math.round(rawGrandTotal) - rawGrandTotal;
    const grandTotal = Math.round(rawGrandTotal);
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      taxableAmount: parseFloat(taxableAmount.toFixed(2)),
      totalTax: parseFloat(totalTax.toFixed(2)),
      roundOff: parseFloat(roundOff.toFixed(2)),
      grandTotal: Math.max(0, grandTotal)
    };
  }, [billItems, discountPercent, taxRate]);

  const cashChange = useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    return received - calculations.grandTotal;
  }, [cashReceived, calculations.grandTotal]);

  const handleToggleWalkIn = () => {
    if (!isWalkIn) {
      setIsWalkIn(true);
      setCustomerName("Walk-in Customer");
      setCustomerPhone("");
      setCustomerEmail("");
    } else {
      setIsWalkIn(false);
      setCustomerName("");
    }
  };

  const handleQuickCash = (amount) => {
    if (amount === 'exact') {
      setCashReceived(calculations.grandTotal.toString());
    } else {
      setCashReceived(amount.toString());
    }
  };

  const handleVerifyUPI = () => {
    if (calculations.grandTotal <= 0) return;
    setUpiStatus("verifying");
    setTimeout(() => {
      setUpiStatus("verified");
      setUpiRefId(`UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`);
      toast.success("UPI Verified!");
    }, 1500);
  };

  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
      setCardExpiry(`${val.substring(0, 2)}/${val.substring(2)}`);
    } else {
      setCardExpiry(val);
    }
  };

  const handleCompleteSale = async () => {
    if (billItems.length === 0) {
      toast.error("Cart is empty.");
      return;
    }
    if (paymentMethod === "CASH" && (parseFloat(cashReceived) || 0) < calculations.grandTotal) {
      toast.error("Insufficient cash.");
      return;
    }
    if (paymentMethod === "UPI" && upiStatus !== "verified") {
      toast.error("Verify UPI first.");
      return;
    }
    setIsProcessing(true);
    try {
      const payload = {
        billItems,
        subtotal: calculations.subtotal,
        discountAmount: calculations.totalDiscount,
        taxAmount: calculations.totalTax,
        grandTotal: calculations.grandTotal,
        customerName: customerName || "Walk-in Customer",
        customerPhone,
        customerEmail,
        doctorName,
        paymentMethod,
        date: new Date().toISOString(),
        username: localStorage.getItem("username") || "Staff Pharmacist"
      };
      const response = await api.post("/save-bill", payload);
      setCompletedBill({ ...payload, id: response.data.billId, invoiceNumber: response.data.invoiceNumber || `INV-${Date.now()}` });
      setShowSuccessModal(true);
      fetchInventory();
      fetchTodaySales();
      fetchBillingHistory();
    } catch (error) {
      toast.error("Failed to process sale.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartNewSale = () => {
    setBillItems([]);
    setDiscountPercent(0);
    setIsWalkIn(true);
    setCustomerName("Walk-in Customer");
    setPaymentMethod("CASH");
    setCashReceived("");
    setUpiStatus("idle");
    setShowSuccessModal(false);
    setCompletedBill(null);
  };

  const generatePDFInvoice = (bill) => {
    if (!bill) return;

    const doc = new jsPDF();
    const store = bill.businessDetails || storeSettings;
    const invNum = bill.invoiceNumber || `INV-${bill.id || '2026'}`;
    const billDate = new Date(bill.createdAt || bill.date || Date.now()).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Pharmacy Header
    doc.setFillColor(14, 116, 144);
    doc.rect(0, 0, 210, 38, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(store.business_name || "MEDSTOCK PHARMACY & HEALTHCARE", 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`${store.business_address || '124, Healthcare Boulevard, Medical Enclave'} | Contact: ${store.business_contact || '+91 98765 43210'}`, 14, 23);
    doc.text(`GSTIN: ${store.business_gstin || '27AABCU9603R1ZM'} | Drug License No: DL-20B/21B-48920`, 14, 29);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TAX INVOICE", 165, 16);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice: ${invNum}`, 145, 23);
    doc.text(`Date: ${billDate}`, 145, 29);

    // Customer & Bill Info Box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO (CUSTOMER DETAILS):", 14, 46);
    doc.setFont("helvetica", "normal");
    doc.text(`Patient/Customer: ${bill.customerName || 'Walk-in Customer'}`, 14, 52);
    doc.text(`Mobile: ${bill.customerPhone || 'N/A'} ${bill.customerEmail ? `| Email: ${bill.customerEmail}` : ''}`, 14, 57);
    if (bill.doctorName) {
      doc.text(`Prescribing Doctor: Dr. ${bill.doctorName.replace(/^dr\.\s*/i, '')}`, 14, 62);
    }

    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT INFO:", 135, 46);
    doc.setFont("helvetica", "normal");
    doc.text(`Payment Mode: ${bill.paymentMethod || bill.paymentType || 'CASH'}`, 135, 52);
    doc.text(`Billed By: ${bill.username || 'Staff Pharmacist'}`, 135, 57);
    if (bill.paymentDetails?.upiRefId) {
      doc.text(`UPI UTR Ref: ${bill.paymentDetails.upiRefId}`, 135, 62);
    }

    // Line items table
    const tableStartY = bill.doctorName ? 68 : 64;
    const tableBody = (bill.billItems || []).map((item, idx) => {
      const unitP = parseFloat(item.price) || 0;
      const lineTotal = (item.quantity * unitP) * (1 - (item.discount || 0) / 100);
      return [
        idx + 1,
        item.name,
        item.category || 'Standard',
        item.quantity,
        `Rs. ${unitP.toFixed(2)}`,
        item.discount ? `${item.discount}%` : '0%',
        `Rs. ${lineTotal.toFixed(2)}`
      ];
    });

    doc.autoTable({
      startY: tableStartY,
      head: [['#', 'Medicine Description', 'Category', 'Qty', 'Unit Price', 'Disc %', 'Net Amount']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 65 },
        2: { cellWidth: 30 },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 28, halign: 'right' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 6;

    // Totals Table
    const subtotal = bill.subtotal || bill.billItems?.reduce((s, i) => s + (i.quantity * i.price), 0) || bill.totalAmount;
    const discount = bill.discountAmount || 0;
    const tax = bill.taxAmount || 0;
    const grand = bill.grandTotal || bill.totalAmount;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Subtotal:`, 135, finalY);
    doc.text(`Rs. ${Number(subtotal).toFixed(2)}`, 195, finalY, { align: 'right' });

    doc.text(`Total Discount:`, 135, finalY + 5);
    doc.text(`- Rs. ${Number(discount).toFixed(2)}`, 195, finalY + 5, { align: 'right' });

    doc.text(`GST (18% - CGST 9% + SGST 9%):`, 135, finalY + 10);
    doc.text(`Rs. ${Number(tax).toFixed(2)}`, 195, finalY + 10, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setFillColor(241, 245, 249);
    doc.rect(133, finalY + 14, 65, 8, 'F');
    doc.text(`GRAND TOTAL:`, 135, finalY + 20);
    doc.text(`Rs. ${Number(grand).toFixed(2)}`, 195, finalY + 20, { align: 'right' });

    // Terms & Pharmacist Signature
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Terms & Conditions:", 14, finalY + 10);
    doc.text("1. Medicines once sold cannot be returned without original cash memo.", 14, finalY + 14);
    doc.text("2. Please store medicines as per refrigeration/temperature instructions.", 14, finalY + 18);
    doc.text("3. This is a computer-generated GST tax invoice.", 14, finalY + 22);

    doc.text("Authorized Pharmacist Signature", 145, finalY + 36);
    doc.line(140, finalY + 32, 195, finalY + 32);

    doc.save(`${invNum}.pdf`);
  };

  // Filtered History
  const filteredBillingHistory = useMemo(() => {
    return billingHistory.filter(bill => {
      const billDate = new Date(bill.createdAt || bill.date || Date.now());
      const now = new Date();
      
      let dateMatch = true;
      if (historyFilterRange === 'today') {
        dateMatch = billDate.toDateString() === now.toDateString();
      } else if (historyFilterRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateMatch = billDate >= weekAgo;
      } else if (historyFilterRange === 'month') {
        dateMatch = billDate.getMonth() === now.getMonth() && billDate.getFullYear() === now.getFullYear();
      }

      let paymentMatch = true;
      if (historyPaymentFilter !== 'all') {
        paymentMatch = (bill.paymentMethod || bill.paymentType || '').toUpperCase().includes(historyPaymentFilter.toUpperCase());
      }

      let searchMatch = true;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const inv = (bill.invoiceNumber || `INV-${bill.id}`).toLowerCase();
        const cust = (bill.customerName || '').toLowerCase();
        searchMatch = inv.includes(q) || cust.includes(q);
      }

      return dateMatch && paymentMatch && searchMatch;
    });
  }, [billingHistory, historyFilterRange, historyPaymentFilter, historySearch]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header & Fast Navigation Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-teal-600 text-white flex items-center justify-center text-2xl shadow-md shadow-primary-500/20">
            <FaCashRegister />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Pharmacy POS Terminal
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              High-speed checkout, smart stock sync, and GST invoice dispatch
            </p>
          </div>
        </div>

        {/* Action Tabs & Quick Launchers */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-600">
            <button
              onClick={() => setActiveTab("pos")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "pos"
                  ? 'bg-white dark:bg-slate-800 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FaReceipt /> POS Checkout
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "history"
                  ? 'bg-white dark:bg-slate-800 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FaHistory /> Sales History ({billingHistory.length})
            </button>
          </div>

          <button
            onClick={() => navigate('/PrescriptionScanner')}
            className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-transform hover:-translate-y-0.5"
          >
            <FaFilePrescription /> Scan Rx (AI)
          </button>
        </div>
      </div>

      {/* POS TERMINAL VIEW */}
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left / Center Column: Search & Medicine Cart (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Fast Medicine Search Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-5 relative">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search medicine by name, category, or barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <FaTimes size={12} />
                    </button>
                  )}
                </div>

                {/* Category Quick Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {categories.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>

                <button
                  onClick={() => setIsGenericFinderOpen(true)}
                  className="px-3 py-2.5 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-600 transition-colors"
                >
                  <FaExchangeAlt /> Substitute
                </button>
              </div>

              {/* Dynamic Search Autocomplete Dropdown */}
              {isSearchFocused && filteredInventory.length > 0 && (
                <div className="absolute left-5 right-5 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-40 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60 max-h-80 overflow-y-auto">
                  {filteredInventory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddItemToCart(item)}
                      className="p-3 hover:bg-primary-50 dark:hover:bg-slate-700/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Exp: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'} &bull; Supplier: {item.supplier || 'Standard'}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-extrabold text-sm text-slate-900 dark:text-white">₹{Number(item.price).toFixed(2)}</p>
                          {item.quantity <= 0 ? (
                            <span className="text-[10px] font-bold text-rose-600">Out of Stock</span>
                          ) : item.quantity <= (item.threshold || 10) ? (
                            <span className="text-[10px] font-bold text-amber-600">Low Stock ({item.quantity})</span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-600">In Stock ({item.quantity})</span>
                          )}
                        </div>
                        <button className="p-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs">
                          <FaPlus />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medicine Cart Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-base">Medicine Cart</h2>
                  <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-xs font-bold">
                    {billItems.length} items
                  </span>
                </div>

                {billItems.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline"
                  >
                    <FaTrashAlt size={11} /> Clear Cart
                  </button>
                )}
              </div>

              {billItems.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 mx-auto flex items-center justify-center text-2xl mb-3">
                    <FaBarcode />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Cart is Empty</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                    Search medicines in the search bar above, or scan a prescription to auto-fill the bill.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Medicine Name</th>
                        <th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-center">Quantity</th>
                        <th className="px-4 py-3 text-right">Subtotal</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                      {billItems.map((item, idx) => {
                        const invItem = inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase());
                        const available = invItem ? invItem.quantity : 'N/A';
                        const lineSubtotal = item.quantity * item.price;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                            <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-900 dark:text-white block">{item.name}</span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Stock: {available} units &bull; {item.category || 'General'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                              ₹{Number(item.price).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleUpdateQuantity(idx, -1)}
                                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200"
                                >
                                  <FaMinus size={9} />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleDirectQuantityChange(idx, e.target.value)}
                                  className="w-12 py-1 text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                                />
                                <button
                                  onClick={() => handleUpdateQuantity(idx, 1)}
                                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200"
                                >
                                  <FaPlus size={9} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-white">
                              ₹{Number(lineSubtotal).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              >
                                <FaTrashAlt size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* AI Drug Safety Contraindication Banner */}
            {drugSafetyResult && (
              <AIDrugSafetyAlert interactionResult={drugSafetyResult} />
            )}

          </div>

          {/* Right Column: Customer Info & Checkout Panel (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Customer Details Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <FaUserCheck className="text-primary-600" /> Customer Details
                </h3>
                <button
                  type="button"
                  onClick={handleToggleWalkIn}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                    isWalkIn 
                      ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200'
                  }`}
                >
                  {isWalkIn ? '✓ Walk-in Guest' : '+ Add Details'}
                </button>
              </div>

              {!isWalkIn && (
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Customer Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Verma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Mobile No</label>
                      <input
                        type="tel"
                        maxLength="10"
                        placeholder="9876543210"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Doctor Ref</label>
                      <input
                        type="text"
                        placeholder="Dr. S. Sharma"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bill Summary & GST Breakdown Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-5 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-100 dark:border-slate-700 pb-2.5 flex items-center justify-between">
                <span>Bill Summary</span>
                <span className="text-xs font-semibold text-slate-500">{storeSettings.business_gstin ? 'GST Tax Invoice' : 'Receipt'}</span>
              </h3>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal ({billItems.length} items):</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{calculations.subtotal.toFixed(2)}</span>
                </div>

                {/* Bill Discount Row */}
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <span>Discount:</span>
                    <select
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                      className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] font-bold"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="10">10%</option>
                      <option value="15">15%</option>
                    </select>
                  </div>
                  <span className="font-bold text-emerald-600">- ₹{calculations.totalDiscount.toFixed(2)}</span>
                </div>

                {/* GST Tax Row */}
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>GST ({taxRate}% - CGST + SGST):</span>
                  <span className="font-bold text-slate-900 dark:text-white">+ ₹{calculations.totalTax.toFixed(2)}</span>
                </div>

                {calculations.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Round-off:</span>
                    <span>{calculations.roundOff > 0 ? `+ ₹${calculations.roundOff.toFixed(2)}` : `- ₹${Math.abs(calculations.roundOff).toFixed(2)}`}</span>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="p-3.5 bg-gradient-to-r from-primary-900 to-teal-900 text-white rounded-xl flex items-center justify-between shadow-inner">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-teal-200">Grand Total Payable</p>
                  <p className="text-2xl font-black tracking-tight">₹{calculations.grandTotal.toFixed(2)}</p>
                </div>
                <div className="text-right text-[10px] text-teal-300 font-mono">
                  INR NET
                </div>
              </div>
            </div>

            {/* Payment Method Selector & Context Interfaces */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-5 space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <FaMoneyBillWave className="text-emerald-600" /> Select Payment Method
              </h3>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CASH', label: 'Cash', icon: FaMoneyBillWave, color: 'text-emerald-600' },
                  { id: 'UPI', label: 'UPI QR', icon: FaQrcode, color: 'text-sky-600' },
                  { id: 'CARD', label: 'Card', icon: FaCreditCard, color: 'text-indigo-600' }
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition-all ${
                        isSelected 
                          ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500/20' 
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`text-base ${m.color}`} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 💵 CASH PAYMENT INTERFACE */}
              {paymentMethod === "CASH" && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Cash Received from Customer (₹)
                    </label>
                    <input
                      type="number"
                      placeholder={`Enter amount (e.g. ${calculations.grandTotal})`}
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-extrabold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Quick Cash Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickCash('exact')}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold"
                    >
                      Exact (₹{calculations.grandTotal})
                    </button>
                    {[100, 200, 500, 2000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickCash(val)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold"
                      >
                        ₹{val}
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Change Calculation */}
                  {cashReceived !== "" && (
                    <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                      cashChange >= 0 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    }`}>
                      <span>{cashChange >= 0 ? 'Change to Return:' : 'Shortage Amount:'}</span>
                      <span className="text-base font-black">₹{Math.abs(cashChange).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 📱 UPI PAYMENT INTERFACE */}
              {paymentMethod === "UPI" && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700 text-center">
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl inline-block shadow-sm">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=medstock@icici&pn=MedStock%20Pharmacy&am=${calculations.grandTotal}&cu=INR&tn=Bill`)}`}
                      alt="UPI QR Code"
                      className="w-36 h-36 mx-auto rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Scan to Pay ₹{calculations.grandTotal.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400">Accepts GPay, PhonePe, Paytm, BHIM UPI</p>
                  </div>

                  {/* UPI Status Flow */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                    {upiStatus === "idle" && (
                      <button
                        type="button"
                        onClick={handleVerifyUPI}
                        className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
                      >
                        Simulate / Confirm Customer UPI
                      </button>
                    )}
                    {upiStatus === "verifying" && (
                      <div className="flex items-center justify-center gap-2 text-sky-600 font-bold py-1">
                        <div className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Verifying UPI Gateway Transaction...</span>
                      </div>
                    )}
                    {upiStatus === "verified" && (
                      <div className="text-emerald-600 font-bold flex items-center justify-center gap-1.5 py-1">
                        <FaCheckCircle /> Payment Verified! Ref: {upiRefId}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 💳 CARD PAYMENT INTERFACE */}
              {paymentMethod === "CARD" && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Card Number</label>
                    <input
                      type="text"
                      placeholder="4532 0158 9845 4242"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleCardExpiryChange}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">CVV</label>
                      <input
                        type="password"
                        maxLength="4"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <FaShieldAlt className="text-emerald-500" />
                    <span>PCI-DSS Tokenized Payment. Raw card numbers are never stored.</span>
                  </div>
                </div>
              )}

              {/* Complete Sale Action Button */}
              <button
                onClick={handleCompleteSale}
                disabled={isProcessing || billItems.length === 0}
                className={`w-full py-4 rounded-xl font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                  isProcessing || billItems.length === 0
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 hover:-translate-y-0.5'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deducting Stock & Generating Bill...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle /> COMPLETE SALE & PRINT INVOICE (₹{calculations.grandTotal.toFixed(2)})
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* SALES & BILLING HISTORY VIEW */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-5 space-y-4">
          
          {/* History KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-2">
            <div className="p-4 bg-primary-50 dark:bg-primary-950/40 rounded-xl border border-primary-200 dark:border-primary-800">
              <p className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase">Today's Revenue</p>
              <p className="text-2xl font-black text-primary-900 dark:text-white mt-0.5">
                ₹{Number(todaySales.totalRevenue || 0).toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800">
              <p className="text-xs font-bold text-teal-700 dark:text-teal-300 uppercase">Today's Bills Dispatched</p>
              <p className="text-2xl font-black text-teal-900 dark:text-white mt-0.5">
                {todaySales.totalSales || 0} Bills
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Lifetime POS Bills</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {billingHistory.length}
              </p>
            </div>
          </div>

          {/* History Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              {['today', 'week', 'month', 'all'].map((range) => (
                <button
                  key={range}
                  onClick={() => setHistoryFilterRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                    historyFilterRange === range
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {range === 'all' ? 'All Time' : range}
                </button>
              ))}

              <select
                value={historyPaymentFilter}
                onChange={(e) => setHistoryPaymentFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by invoice or customer..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* History Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Invoice ID</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {filteredBillingHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">
                      No billing records found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredBillingHistory.map((bill, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                      <td className="px-4 py-3 font-mono font-bold text-primary-600 dark:text-primary-400">
                        {bill.invoiceNumber || `INV-${bill.id}`}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(bill.createdAt || bill.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {bill.customerName || 'Walk-in Customer'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                          {bill.paymentMethod || bill.paymentType || 'CASH'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-white">
                        ₹{Number(bill.grandTotal || bill.totalAmount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedHistoryBill(bill)}
                            title="View Details"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 hover:text-primary-600"
                          >
                            <FaReceipt size={12} />
                          </button>
                          <button
                            onClick={() => generatePDFInvoice(bill)}
                            title="Download PDF"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 hover:text-emerald-600"
                          >
                            <FaDownload size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* PAYMENT SUCCESS CONFIRMATION MODAL */}
      {showSuccessModal && completedBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-modal max-w-md w-full p-6 text-center space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20">
              <FaCheckCircle />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Payment Successful!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Invoice Ref: {completedBill.invoiceNumber}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-4 text-xs space-y-2 text-left border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{completedBill.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{completedBill.paymentMethod}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-sm">
                <span className="text-slate-900 dark:text-white">Amount Paid:</span>
                <span className="text-emerald-600">₹{completedBill.grandTotal.toFixed(2)}</span>
              </div>
              {completedBill.paymentDetails?.changeGiven > 0 && (
                <div className="flex justify-between text-amber-600 font-bold">
                  <span>Change Given:</span>
                  <span>₹{completedBill.paymentDetails.changeGiven.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => generatePDFInvoice(completedBill)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-transform hover:-translate-y-0.5"
              >
                <FaDownload /> Download PDF
              </button>
              <button
                onClick={handleStartNewSale}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs shadow-md shadow-primary-500/20 flex items-center justify-center gap-1.5 transition-transform hover:-translate-y-0.5"
              >
                <FaPlus /> Start New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY BILL VIEW MODAL */}
      {selectedHistoryBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 relative">
            <button
              onClick={() => setSelectedHistoryBill(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <FaTimes />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Invoice #{selectedHistoryBill.invoiceNumber || selectedHistoryBill.id}
            </h3>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              {selectedHistoryBill.billItems?.map((item, i) => (
                <div key={i} className="py-2 flex justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                    <span className="text-slate-400 block">Qty: {item.quantity} &bull; ₹{item.price} each</span>
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white">₹{(item.quantity * item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-3">
              <span className="text-sm font-black">Total: ₹{Number(selectedHistoryBill.grandTotal || selectedHistoryBill.totalAmount).toFixed(2)}</span>
              <button
                onClick={() => generatePDFInvoice(selectedHistoryBill)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <FaDownload /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Modals */}
      {isGenericFinderOpen && (
        <AIGenericFinderModal
          isOpen={isGenericFinderOpen}
          onClose={() => setIsGenericFinderOpen(false)}
          onSelectMedicine={(med) => {
            const invMatch = inventory.find(i => i.name.toLowerCase().includes(med.name.toLowerCase()));
            if (invMatch) {
              handleAddItemToCart(invMatch);
            } else {
              toast.error("Generic item not directly in current local catalog.");
            }
            setIsGenericFinderOpen(false);
          }}
        />
      )}

      {isPrescriptionParserOpen && (
        <AIPrescriptionParserModal
          isOpen={isPrescriptionParserOpen}
          onClose={() => setIsPrescriptionParserOpen(false)}
          onApplyItems={(items) => {
            items.forEach(it => {
              const invMatch = inventory.find(i => i.name.toLowerCase().includes(it.name.toLowerCase()));
              if (invMatch) {
                handleAddItemToCart({ ...invMatch, quantity: it.quantity });
              }
            });
            setIsPrescriptionParserOpen(false);
          }}
        />
      )}

    </div>
  );
};

export default UserBilling;