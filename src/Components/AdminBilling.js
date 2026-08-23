import React, { useState, useEffect } from "react";
import api from "../api/axiosConfig";
import toast from 'react-hot-toast';
import { AiOutlineClose } from "react-icons/ai";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { FaExchangeAlt, FaFilePrescription, FaFileInvoiceDollar, FaCheckCircle } from 'react-icons/fa';
import AIGenericFinderModal from './AIGenericFinderModal';
import AIPrescriptionParserModal from './AIPrescriptionParserModal';

const AdminBilling = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [previousBills, setPreviousBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todaySales, setTodaySales] = useState({ totalSales: 0, totalRevenue: 0, paymentBreakdown: [] });
  const [paymentMethods, setPaymentMethods] = useState({});

  const [selectedBill, setSelectedBill] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [showInvoice, setShowInvoice] = useState(false);

  // AI Modal States
  const [isGenericFinderOpen, setIsGenericFinderOpen] = useState(false);
  const [isPrescriptionParserOpen, setIsPrescriptionParserOpen] = useState(false);

  // Fetch only delivered orders for billing
  const fetchDeliveredOrders = async () => {
    try {
      const response = await api.get("/get-delivered-orders");
      setPendingOrders(response.data);
    } catch (error) {
      console.error("Error fetching delivered orders:", error);
      toast.error("Failed to fetch delivered orders.");
    }
  };

  // Fetch previous billing history
  const fetchPreviousBills = async () => {
    try {
      const response = await api.get("/get-bills");
      setPreviousBills(response.data);
    } catch (error) {
      console.error("Error fetching previous bills:", error);
      toast.error("Failed to fetch previous bills.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch today's sales summary
  const fetchTodaySales = async () => {
    try {
      const response = await api.get("/sales/summary?range=today");
      setTodaySales(response.data);
    } catch (error) {
      console.error("Error fetching today sales:", error);
    }
  };

  useEffect(() => {
    fetchDeliveredOrders();
    fetchPreviousBills();
    fetchTodaySales();
  }, []);

  // Generate a bill for an order
  const generateBill = async (order, paymentType) => {
    try {
      const response = await api.post("/generate-bill", {
        orderID: order.OrderID,
        paymentType: paymentType || 'Bank Transfer'
      });
  
      if (response.status === 200) {
        toast.success("Bill generated and inventory updated!");
        fetchDeliveredOrders();
        fetchPreviousBills();
        fetchTodaySales();
        viewInvoice(response.data.billID);
      }
    } catch (error) {
      console.error("Error generating bill:", error);
      if (error.response && error.response.data) {
        toast.error(`Error: ${error.response.data.error}`);
      } else {
        toast.error("Error generating bill. Please try again.");
      }
    }
  };

  // Fetch and view invoice
  const viewInvoice = async (billID) => {
    try {
      const response = await api.get(`/invoice/${billID}`);
      const billData = response.data.bill;
      if (response.data.businessDetails) {
        billData.businessDetails = response.data.businessDetails;
      }
      setSelectedBill(billData);
      setInvoiceItems(response.data.items);
      setShowInvoice(true);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast.error("Error loading invoice details.");
    }
  };

  const generatePDFInvoice = () => {
    if (!selectedBill) return;

    const doc = new jsPDF();
    doc.setFontSize(20);
    
    if (selectedBill.businessDetails && selectedBill.businessDetails.business_name) {
      doc.text(selectedBill.businessDetails.business_name, 105, 20, null, null, "center");
      doc.setFontSize(10);
      doc.text(selectedBill.businessDetails.business_address || '', 105, 28, null, null, "center");
      doc.text(`Contact: ${selectedBill.businessDetails.business_contact || ''} | GSTIN: ${selectedBill.businessDetails.business_gstin || ''}`, 105, 34, null, null, "center");
    } else {
      doc.text("MedStock Tax Invoice", 105, 20, null, null, "center");
    }
    
    doc.setFontSize(12);
    doc.text(`Bill ID: ${selectedBill.BillID}`, 15, 45);
    doc.text(`Order ID: ${selectedBill.OrderID}`, 15, 55);
    doc.text(`Billing Date: ${new Date(selectedBill.BillingDate).toLocaleDateString()}`, 15, 65);

    const tableColumn = ["#", "Medicine", "Quantity", "Unit Price (Rs)", "Total (Rs)"];
    const tableRows = [];

    invoiceItems.forEach((item, index) => {
      const rowData = [
        index + 1,
        item.MedicineName,
        item.Quantity,
        Number(item.Price).toFixed(2),
        (item.Quantity * item.Price).toFixed(2)
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 75,
    });

    const finalY = doc.lastAutoTable.finalY || 75;
    doc.setFontSize(14);
    doc.text(`Total Amount (incl. Taxes): Rs ${Number(selectedBill.TotalAmount).toFixed(2)}`, 15, finalY + 15);

    doc.save(`invoice_${selectedBill.BillID}.pdf`);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-12 px-5 md:px-8 mx-auto w-full">
      
      {/* Page Header */}
      <div className="mb-6 mt-6 py-6 px-8 bg-gradient-to-r from-primary-800 via-primary-700 to-teal-700 text-white rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Admin Billing & Invoices</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-400 text-slate-900 text-xs font-bold uppercase tracking-wider">Enterprise</span>
          </div>
          <p className="text-xs md:text-sm text-primary-100">
            Generate supplier invoices, fulfill delivered orders into active inventory, and track billing archives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrescriptionParserOpen(true)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl backdrop-blur-sm border border-white/30 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FaFilePrescription /> Parse Rx
          </button>
          <button
            onClick={() => setIsGenericFinderOpen(true)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl backdrop-blur-sm border border-white/30 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FaExchangeAlt /> Generic Finder
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-500 text-sm">
          Loading billing data...
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Delivered Orders Ready for Billing */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-6 md:p-8">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaFileInvoiceDollar className="text-primary-600" /> Delivered Orders Ready for Invoicing
              </h2>
              <span className="text-xs font-bold px-2.5 py-1 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-lg">
                {pendingOrders.length} Pending
              </span>
            </div>

            {pendingOrders.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="px-5 py-3.5">Order ID</th>
                      <th className="px-4 py-3.5">Supplier ID</th>
                      <th className="px-4 py-3.5 text-right">Total Price</th>
                      <th className="px-4 py-3.5">Delivery Date</th>
                      <th className="px-4 py-3.5">Payment Method</th>
                      <th className="px-4 py-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {pendingOrders.map((order) => (
                      <tr key={order.OrderID} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{order.OrderID}</td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">Supplier #{order.SupplierID}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-white">₹{parseFloat(order.TotalPrice).toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{new Date(order.DeliveryDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3.5">
                          <select 
                            value={paymentMethods[order.OrderID] || 'Bank Transfer'}
                            onChange={(e) => setPaymentMethods({ ...paymentMethods, [order.OrderID]: e.target.value })}
                            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                          >
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="UPI">UPI</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Cash">Cash</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => generateBill(order, paymentMethods[order.OrderID])}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1 mx-auto"
                          >
                            <FaCheckCircle /> Generate Bill
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-center text-slate-400 text-xs">
                All delivered orders have been invoiced.
              </div>
            )}
          </section>

          {/* Previous Bills */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-6 md:p-8">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Billing History & Walk-in Records</h2>
              <span className="text-xs font-bold text-slate-500">{previousBills.length} Invoices</span>
            </div>

            {previousBills.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="px-5 py-3">Bill ID</th>
                      <th className="px-4 py-3">Customer / User</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previousBills.map((bill, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="px-5 py-3 font-bold text-primary-600 dark:text-primary-400">
                          #{bill.id || `BILL-${index + 1}`}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{bill.username || 'Walk-in Customer'}</td>
                        <td className="px-4 py-3 text-slate-500">{bill.date || 'Today'}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">₹{parseFloat(bill.totalAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                            {bill.paymentType || 'Cash'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-center text-slate-400 text-xs">
                No billing history found.
              </div>
            )}
          </section>

          {/* Today's Sales Performance */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-6 md:p-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Daily Revenue Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-primary-50 dark:bg-slate-700/60 p-4 rounded-xl text-center border border-primary-100 dark:border-slate-600">
                <p className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">Total Sales Volume</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{todaySales.totalSales}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-slate-700/60 p-4 rounded-xl text-center border border-emerald-100 dark:border-slate-600">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Total Revenue</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">₹{Number(todaySales.totalRevenue).toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 dark:bg-slate-700/60 p-4 rounded-xl border border-purple-100 dark:border-slate-600 text-xs">
                <p className="font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 text-center mb-2">Payment Channels</p>
                <ul className="space-y-1 text-slate-700 dark:text-slate-200">
                  {todaySales.paymentBreakdown?.map((b, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{b.payment_method} ({b.count}):</span>
                      <span className="font-bold">₹{Number(b.amount).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

        </div>
      )}

      {/* Invoice Modal */}
      {showInvoice && selectedBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal max-w-2xl w-full p-6 relative">
            <button onClick={() => setShowInvoice(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
              <AiOutlineClose size={18} />
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">Tax Invoice: #{selectedBill.BillID}</h3>
            
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-2">Medicine</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoiceItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-medium">{item.MedicineName}</td>
                      <td className="px-3 py-2 text-center">{item.Quantity}</td>
                      <td className="px-3 py-2 text-right">₹{parseFloat(item.Price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-3">
              <span className="font-bold text-sm">Total: ₹{parseFloat(selectedBill.TotalAmount).toFixed(2)}</span>
              <button onClick={generatePDFInvoice} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm">
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Modals */}
      <AIGenericFinderModal isOpen={isGenericFinderOpen} onClose={() => setIsGenericFinderOpen(false)} />
      <AIPrescriptionParserModal isOpen={isPrescriptionParserOpen} onClose={() => setIsPrescriptionParserOpen(false)} onApplyItems={() => {}} />

    </div>
  );
};

export default AdminBilling;
