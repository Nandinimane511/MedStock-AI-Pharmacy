import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { 
  FaFilePrescription, FaUpload, FaCamera, FaCheck, FaExclamationTriangle, 
  FaTimes, FaCheckCircle, FaTrash, 
  FaBoxes, FaRobot, FaDownload, FaReceipt
} from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import AIDrugSafetyAlert from './AIDrugSafetyAlert';
import { scanPrescriptionClientSide } from '../utils/clientAiService';
import { addLocalBill } from '../utils/dataStore';

export default function PrescriptionScanner() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [rawText, setRawText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Editable form state for extracted medicines
  const [medicinesList, setMedicinesList] = useState([]);
  const [patientInfo, setPatientInfo] = useState({
    patientName: 'Walk-in Patient',
    doctorName: 'Dr. S. Sharma, MD',
    paymentMode: 'Cash'
  });
  const [processingTransaction, setProcessingTransaction] = useState(false);
  const [dispensedReceipt, setDispensedReceipt] = useState(null);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, JPEG, WebP)');
      return;
    }

    setSelectedFile(file);
    setSelectedPreset('');
    setRawText('');
    setScanResult(null);
    setMedicinesList([]);
    setDispensedReceipt(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handlePresetSelect = (presetKey) => {
    setSelectedPreset(presetKey);
    setSelectedFile(null);
    setScanResult(null);
    setMedicinesList([]);
    setDispensedReceipt(null);

    if (presetKey === 'handwritten_fever_infection') {
      setPreviewUrl('/sample_doctor_prescription.jpg');
      setRawText("Apollo City Clinic - Dr. S. Sharma, MD\nPatient: Rahul Verma, Age: 38\nRx:\n1. Augmentin 625 Duo - 1-0-1 x 5 days (After meals)\n2. Paracetamol 650mg (Dolo 650) - 1-1-1 x 3 days (SOS fever)\n3. Pan 40 (Pantoprazole 40mg) - 1-0-0 x 5 days (Empty stomach)\n4. Azithromycin 500mg - 1-0-0 x 3 days");
    } else if (presetKey === 'chronic_cardiac_diabetes') {
      setPreviewUrl('/sample_cardiac_prescription.jpg');
      setRawText("Fortis Heart & Metabolic Center - Dr. M. Kulkarni, MD, DM Cardiology\nPatient: Anita Desai, Age: 54\nRx:\n1. Metformin 500mg (Glycomet) - 1 tab twice daily with meals x 30 days\n2. Telmisartan 40mg (Telma 40) - 1 tab morning post breakfast x 30 days\n3. Amlodipine 5mg - 1 tab night before sleep x 30 days\n4. Ecosprin 75mg - 1 tab after lunch x 30 days");
    } else if (presetKey === 'respiratory_allergy') {
      setPreviewUrl('/sample_doctor_prescription.jpg');
      setRawText("Chest & Allergy Speciality\nRx:\nMontelukast 10mg (Montair) 0-0-1 x 10 days\nLevocet 5mg 0-0-1 x 5 days\nLimcee Vitamin C 1-0-0 x 15 days");
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error('Unable to access camera. Please upload an image instead.');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPreviewUrl(dataUrl);
      setSelectedPreset('');
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const clearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setSelectedPreset('');
    setRawText('');
    setScanResult(null);
    setMedicinesList([]);
    setDispensedReceipt(null);
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Perform AI OCR & Inventory scan
  const handleScanPrescription = async () => {
    if (!previewUrl && !rawText && !selectedPreset) {
      toast.error('Please upload a prescription image or choose a sample prescription slip.');
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setMedicinesList([]);

    try {
      const payload = {
        imageBase64: previewUrl,
        imageName: selectedFile ? selectedFile.name : (selectedPreset || 'prescription_scan.jpg'),
        rawText: rawText || '',
        samplePreset: selectedPreset
      };

      try {
        const response = await api.post('/ai/scan-prescription', payload);
        if (response.data && response.data.extractedMedicines) {
          setScanResult(response.data);
          setMedicinesList(response.data.extractedMedicines || []);
          
          if (response.data.detectedPatient) {
            setPatientInfo(prev => ({
              ...prev,
              patientName: response.data.detectedPatient,
              doctorName: response.data.detectedDoctor || prev.doctorName
            }));
          }

          toast.success(`OCR Scan Complete! Extracted ${response.data.medicinesDetected} medicines for ${response.data.detectedPatient || 'patient'}.`);
          return;
        }
      } catch (apiErr) {
        console.warn('Backend OCR unreachable, switching to Client-Side AI Vision engine...', apiErr);
      }

      // Client-Side AI Vision Engine Fallback
      toast('Processing with Client-Side AI Vision Engine...', { icon: '🤖' });
      const clientResult = await scanPrescriptionClientSide(previewUrl || selectedPreset || '');
      
      setScanResult(clientResult);
      setMedicinesList(clientResult.extractedMedicines || []);

      if (clientResult.detectedPatient) {
        setPatientInfo(prev => ({
          ...prev,
          patientName: clientResult.detectedPatient,
          doctorName: clientResult.detectedDoctor || prev.doctorName
        }));
      }

      toast.success(`Vision OCR Complete! Extracted ${clientResult.medicinesDetected} medicines for ${clientResult.detectedPatient || 'patient'}.`);

    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Error analyzing image. Please try another image.');
    } finally {
      setIsScanning(false);
    }
  };

  // Medicine list modification handlers
  const handleQuantityChange = (id, newQty) => {
    const qty = parseInt(newQty, 10) || 1;
    setMedicinesList(prev => prev.map(m => {
      if (m.id === id) {
        const subtotal = parseFloat((m.unitPrice * qty).toFixed(2));
        const stockStatus = m.availableUnits === 0 ? 'Out of Stock' : m.availableUnits < qty ? 'Low Stock' : 'Available';
        return { ...m, quantity: qty, subtotal, stockStatus };
      }
      return m;
    }));
  };

  const handleSelectCandidate = (id, candidate) => {
    setMedicinesList(prev => prev.map(m => {
      if (m.id === id) {
        const unitPrice = parseFloat(candidate.price) || 0;
        const subtotal = parseFloat((unitPrice * m.quantity).toFixed(2));
        const stockStatus = candidate.quantity === 0 ? 'Out of Stock' : candidate.quantity < m.quantity ? 'Low Stock' : 'Available';
        return {
          ...m,
          medicineName: candidate.name,
          inventoryId: candidate.id,
          unitPrice,
          subtotal,
          availableUnits: candidate.quantity,
          stockStatus,
          requiresVerification: false,
          confidence: 98,
          confidenceLabel: 'HIGH'
        };
      }
      return m;
    }));
    toast.success(`Matched to ${candidate.name}`);
  };

  const toggleConfirmMedicine = (id) => {
    setMedicinesList(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, confirmed: !m.confirmed, requiresVerification: false };
      }
      return m;
    }));
  };

  const handleRemoveMedicine = (id) => {
    setMedicinesList(prev => prev.filter(m => m.id !== id));
    toast.success('Medicine removed from prescription');
  };

  // Process and Deduct from Inventory
  const handleProcessPrescription = async () => {
    const unconfirmed = medicinesList.filter(m => m.requiresVerification && !m.confirmed);
    if (unconfirmed.length > 0) {
      toast.error('Please verify or correct ambiguous medicines before dispensing.');
      return;
    }

    if (medicinesList.length === 0) {
      toast.error('No medicines to process.');
      return;
    }

    setProcessingTransaction(true);
    let receiptData = null;

    try {
      const response = await api.post('/ai/process-prescription', {
        confirmedMedicines: medicinesList,
        customerName: patientInfo.patientName || 'Walk-in Patient',
        doctorName: patientInfo.doctorName || 'Dr. Consultant',
        paymentMode: patientInfo.paymentMode || 'Cash',
        userEmail: localStorage.getItem('userEmail') || 'pharmacist@medstock.com'
      });
      if (response.data && response.data.transactionId) {
        receiptData = response.data;
      }
    } catch (error) {
      console.warn('Backend process prescription offline, recording locally:', error);
    }

    if (!receiptData) {
      const totalAmount = medicinesList.reduce((sum, m) => sum + (parseFloat(m.subtotal) || 0), 0);
      const billPayload = {
        customer_name: patientInfo.patientName || 'Prescription Patient',
        customer_phone: 'N/A',
        doctor_name: patientInfo.doctorName || 'Consulting Physician',
        payment_method: (patientInfo.paymentMode || 'CASH').toUpperCase(),
        subtotal: totalAmount,
        tax_amount: totalAmount * 0.18,
        discount: 0,
        total_amount: totalAmount * 1.18,
        items: medicinesList.map(m => ({
          medicine_name: m.medicineName || m.name,
          quantity: m.quantity || 1,
          unit_price: m.unitPrice || m.price || 50,
          subtotal: m.subtotal || 50,
          inventory_id: m.inventoryId
        }))
      };

      const savedBill = addLocalBill(billPayload);

      receiptData = {
        success: true,
        transactionId: savedBill.invoice_number,
        customerName: patientInfo.patientName || 'Prescription Patient',
        doctorName: patientInfo.doctorName || 'Consulting Physician',
        paymentMethod: patientInfo.paymentMode || 'Cash',
        dispensedDate: new Date().toISOString(),
        totalAmount: savedBill.total_amount,
        processedItems: medicinesList.map(m => ({
          name: m.medicineName || m.name,
          deductedQty: m.quantity,
          unitPrice: m.unitPrice,
          total: m.subtotal
        }))
      };
    }

    setDispensedReceipt(receiptData);
    toast.success('Prescription processed & inventory updated successfully!');
    generatePDFInvoice(receiptData);
    setProcessingTransaction(false);
  };

  const handleTransferToPOSCart = () => {
    if (medicinesList.length === 0) {
      toast.error('No medicines to transfer.');
      return;
    }

    const payload = {
      medicines: medicinesList,
      patientName: patientInfo.patientName,
      doctorName: patientInfo.doctorName
    };

    sessionStorage.setItem('medstock_imported_rx', JSON.stringify(payload));

    navigate('/Billing/User', {
      state: {
        importedPrescription: payload
      }
    });

    toast.success(`Transferred ${medicinesList.length} items to POS Cart!`);
  };

  const generatePDFInvoice = (receiptData) => {
    const data = receiptData || dispensedReceipt;
    if (!data) return;

    const doc = new jsPDF();
    doc.setFontSize(20);
    
    const biz = data.businessDetails || {};
    if (biz.business_name) {
      doc.text(biz.business_name, 105, 18, null, null, "center");
      doc.setFontSize(9);
      doc.text(biz.business_address || 'Central Pharmacy Plaza', 105, 24, null, null, "center");
      doc.text(`GSTIN: ${biz.business_gstin || '27AABCM8291M1ZX'} | Contact: ${biz.business_contact || '9876543210'}`, 105, 29, null, null, "center");
    } else {
      doc.text("MedStock Pharmacy Dispensing Receipt", 105, 18, null, null, "center");
    }
    
    doc.setFontSize(11);
    doc.text(`Rx Bill Ref: ${data.transactionId || 'RX-DISP-001'}`, 14, 40);
    doc.text(`Patient: ${data.customerName || patientInfo.patientName}`, 14, 46);
    doc.text(`Doctor: ${data.doctorName || patientInfo.doctorName}`, 14, 52);
    doc.text(`Date: ${new Date(data.dispensedDate || Date.now()).toLocaleString()}`, 125, 40);
    doc.text(`Payment: ${data.paymentMethod || patientInfo.paymentMode}`, 125, 46);

    const tableColumn = ["#", "Medicine Name", "Qty", "Unit Price (Rs)", "Subtotal (Rs)"];
    const tableRows = [];

    (data.processedItems || medicinesList).forEach((item, index) => {
      const rowData = [
        index + 1,
        item.name || item.medicineName,
        item.deductedQty || item.quantity,
        Number(item.unitPrice || 0).toFixed(2),
        Number(item.total || item.subtotal || 0).toFixed(2)
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 58,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] }
    });

    const finalY = doc.lastAutoTable.finalY || 60;
    doc.setFontSize(13);
    doc.text(`Total Amount Paid: Rs ${Number(data.totalAmount || 0).toFixed(2)}`, 14, finalY + 12);
    doc.setFontSize(9);
    doc.text("Pharmacist Verification Signature: ______________________", 14, finalY + 24);

    doc.save(`Rx_Invoice_${data.transactionId || 'receipt'}.pdf`);
  };

  // Re-calculate live summary
  const summary = {
    total: medicinesList.length,
    available: medicinesList.filter(m => m.stockStatus === 'Available').length,
    lowStock: medicinesList.filter(m => m.stockStatus === 'Low Stock').length,
    outOfStock: medicinesList.filter(m => m.stockStatus === 'Out of Stock' || m.stockStatus === 'Not Found').length,
    verification: medicinesList.filter(m => m.requiresVerification).length,
    totalCost: medicinesList.reduce((acc, m) => acc + (m.subtotal || 0), 0)
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-16 px-4 md:px-8 font-sans w-full">
      
      {/* Header Banner */}
      <div className="mb-6 mt-6 py-6 px-8 bg-gradient-to-r from-primary-800 via-primary-700 to-teal-700 text-white rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FaFilePrescription className="text-2xl text-teal-300" />
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI Prescription Scanner</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-400 text-slate-900 text-xs font-bold uppercase tracking-wider">Vision OCR</span>
          </div>
          <p className="text-xs md:text-sm text-primary-100">
            Upload or capture doctor's handwritten prescriptions. Instant optical entity recognition, inventory matching, and verified dispensing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePresetSelect('handwritten_fever_infection')}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl border border-white/30 transition-all"
          >
            Sample: Cursive Rx
          </button>
          <button
            onClick={() => handlePresetSelect('chronic_cardiac_diabetes')}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl border border-white/30 transition-all"
          >
            Sample: Chronic Rx
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Upload & Scanner Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Image Upload & Preview */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FaUpload className="text-primary-600" /> Prescription Input
                </h2>
                {previewUrl && (
                  <button onClick={clearImage} className="text-xs font-semibold text-rose-500 hover:underline flex items-center gap-1">
                    <FaTimes /> Remove Image
                  </button>
                )}
              </div>

              {/* Camera Mode */}
              {isCameraActive ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center mb-4">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-4 flex gap-3">
                    <button
                      onClick={capturePhoto}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5"
                    >
                      <FaCamera /> Capture Slip
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-3 py-2 bg-slate-800/80 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : previewUrl ? (
                /* Image Preview Container */
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 mb-4 max-h-[300px] flex items-center justify-center group">
                  <img src={previewUrl} alt="Prescription Preview" className="max-h-[300px] w-auto object-contain rounded-lg shadow-sm" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white text-slate-800 text-xs font-bold rounded-lg shadow">
                      Replace Image
                    </button>
                  </div>
                </div>
              ) : (
                /* Drag & Drop Dropzone */
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-primary-300 dark:border-primary-800 hover:border-primary-500 dark:hover:border-primary-600 rounded-2xl p-8 text-center cursor-pointer bg-primary-50/30 dark:bg-primary-950/20 transition-all mb-4"
                >
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary-100 dark:bg-primary-900/60 text-primary-600 dark:text-primary-300 flex items-center justify-center text-2xl shadow-sm">
                    <FaFilePrescription />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Drag & Drop Prescription Slip Here
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Supports JPG, PNG, WebP & Handwritten photos
                  </p>
                  <button type="button" className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl shadow-sm">
                    Browse Local File
                  </button>
                </div>
              )}

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => handleFileSelect(e.target.files[0])} 
                accept="image/*" 
                className="hidden" 
              />

              {/* Quick Input Bar */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-600 transition-colors"
                >
                  <FaCamera /> Use Camera / Scanner
                </button>
              </div>
            </div>

            {/* Scan Action Button */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={handleScanPrescription}
                disabled={isScanning || (!previewUrl && !rawText && !selectedPreset)}
                className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2
                  ${isScanning || (!previewUrl && !rawText && !selectedPreset)
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/20 hover:-translate-y-0.5'
                  }
                `}
              >
                {isScanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>AI Analyzing Optical Handwriting...</span>
                  </>
                ) : (
                  <>
                    <FaRobot /> Scan Prescription with AI
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Prescription Summary & AI Insights */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Summary Statistics Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-6">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FaBoxes className="text-teal-600" /> Prescription Summary
                </h2>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {summary.total} Items Detected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Rx</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{summary.total}</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Available</p>
                  <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">{summary.available}</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Low Stock</p>
                  <p className="text-xl font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">{summary.lowStock}</p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Out of Stock</p>
                  <p className="text-xl font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">{summary.outOfStock}</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">Needs Review</p>
                  <p className="text-xl font-extrabold text-purple-700 dark:text-purple-300 mt-0.5">{summary.verification}</p>
                </div>
              </div>
            </div>

            {/* AI Operational & Restocking Suggestions */}
            <div className="bg-gradient-to-br from-primary-500/10 via-teal-500/10 to-amber-500/10 dark:from-primary-950/30 dark:to-teal-950/30 border border-primary-200 dark:border-primary-800/60 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center text-sm">
                  <FaRobot />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">AI Clinical & Inventory Suggestions</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Automated verification guidance (Non-diagnostic)</p>
                </div>
              </div>

              <div className="space-y-2">
                {scanResult?.aiSuggestions?.map((sug, idx) => (
                  <div key={idx} className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-primary-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 font-medium">
                    {sug}
                  </div>
                )) || (
                  <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                    Upload a prescription to view AI stock guidance, OCR confidence analysis, and interaction safety checks.
                  </div>
                )}
              </div>
            </div>

            {/* Drug Interaction Safety Alert Preview */}
            {scanResult?.drugSafetyCheck && (
              <AIDrugSafetyAlert interactionResult={scanResult.drugSafetyCheck} />
            )}

          </div>
        </div>

        {/* Extracted Medicines Table & Pharmacist Verification Area */}
        {medicinesList.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-700/80 p-6 md:p-8 animate-fadeIn">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>Extracted Prescription Regimen</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-bold">
                    {medicinesList.length} Medicines
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verify ambiguous medicines, adjust dispensed quantities, and confirm prior to processing.
                </p>
              </div>

              {/* Patient & Dispensing Metadata Inputs */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input 
                  type="text" 
                  value={patientInfo.patientName} 
                  onChange={(e) => setPatientInfo({ ...patientInfo, patientName: e.target.value })}
                  placeholder="Patient Name"
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
                <input 
                  type="text" 
                  value={patientInfo.doctorName} 
                  onChange={(e) => setPatientInfo({ ...patientInfo, doctorName: e.target.value })}
                  placeholder="Doctor Name"
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
                <select 
                  value={patientInfo.paymentMode} 
                  onChange={(e) => setPatientInfo({ ...patientInfo, paymentMode: e.target.value })}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="Razorpay">Razorpay Online</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3.5">Medicine Name</th>
                    <th className="px-3 py-3.5">Strength</th>
                    <th className="px-3 py-3.5 text-center">Dispense Qty</th>
                    <th className="px-3 py-3.5">Dosage / Freq</th>
                    <th className="px-3 py-3.5">Duration</th>
                    <th className="px-3 py-3.5 text-center">Confidence</th>
                    <th className="px-4 py-3.5">Inventory Status</th>
                    <th className="px-3 py-3.5 text-right">Unit Price</th>
                    <th className="px-3 py-3.5 text-right">Subtotal</th>
                    <th className="px-3 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {medicinesList.map((med) => {
                    return (
                      <tr 
                        key={med.id} 
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors ${
                          med.requiresVerification ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        {/* Medicine Name with Candidate Picker */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">
                            {med.medicineName}
                          </div>
                          {med.detectedName !== med.medicineName && (
                            <div className="text-[10px] text-slate-400">
                              OCR Raw: "{med.detectedName}"
                            </div>
                          )}

                          {/* Candidate match selection if low confidence */}
                          {med.requiresVerification && med.candidateMatches?.length > 0 && (
                            <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">Select Match:</span>
                              {med.candidateMatches.slice(0, 3).map((cand) => (
                                <button
                                  key={cand.id}
                                  onClick={() => handleSelectCandidate(med.id, cand)}
                                  className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-100"
                                >
                                  {cand.name} (Stock: {cand.quantity})
                                </button>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Strength */}
                        <td className="px-3 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                          {med.strength}
                        </td>

                        {/* Quantity (Editable) */}
                        <td className="px-3 py-3.5 text-center">
                          <input 
                            type="number" 
                            min="1" 
                            value={med.quantity} 
                            onChange={(e) => handleQuantityChange(med.id, e.target.value)}
                            className="w-16 px-2 py-1 text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                          />
                        </td>

                        {/* Frequency */}
                        <td className="px-3 py-3.5 text-slate-600 dark:text-slate-300 font-semibold">
                          {med.frequency}
                        </td>

                        {/* Duration */}
                        <td className="px-3 py-3.5 text-slate-600 dark:text-slate-300">
                          {med.duration}
                        </td>

                        {/* Confidence Score */}
                        <td className="px-3 py-3.5 text-center">
                          {med.requiresVerification ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[10px] font-extrabold flex items-center justify-center gap-1">
                              <FaExclamationTriangle className="text-[9px]" /> {med.confidence}% Review
                            </span>
                          ) : med.confidence >= 85 ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                              {med.confidence}% High
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 text-[10px] font-bold">
                              {med.confidence}% Good
                            </span>
                          )}
                        </td>

                        {/* Live Inventory Status */}
                        <td className="px-4 py-3.5">
                          {med.stockStatus === 'Available' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                              Available &bull; {med.availableUnits} units
                            </span>
                          ) : med.stockStatus === 'Low Stock' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[10px] border border-amber-200 dark:border-amber-800">
                              Low Stock &bull; {med.availableUnits} left
                            </span>
                          ) : med.stockStatus === 'Out of Stock' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] border border-rose-200 dark:border-rose-800">
                              Out of Stock &bull; 0 units
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                              Not in Catalog
                            </span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="px-3 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                          ₹{Number(med.unitPrice).toFixed(2)}
                        </td>

                        {/* Subtotal */}
                        <td className="px-3 py-3.5 text-right font-extrabold text-slate-900 dark:text-white">
                          ₹{Number(med.subtotal).toFixed(2)}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => toggleConfirmMedicine(med.id)}
                              title="Confirm Medicine"
                              className={`p-1.5 rounded-lg text-xs transition-colors ${
                                med.confirmed 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-emerald-600'
                              }`}
                            >
                              <FaCheck />
                            </button>
                            <button
                              onClick={() => handleRemoveMedicine(med.id)}
                              title="Remove"
                              className="p-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Total & Dispensing Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-200">Pharmacist Verification Note:</span> Confirm all marked medicines prior to deducting inventory.
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Payable</p>
                  <p className="text-2xl font-extrabold text-primary-700 dark:text-primary-300">
                    ₹{summary.totalCost.toFixed(2)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleTransferToPOSCart}
                    disabled={medicinesList.length === 0}
                    className="px-5 py-3.5 bg-gradient-to-r from-primary-600 to-teal-600 hover:from-primary-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-primary-500/20 flex items-center gap-2 transition-transform hover:-translate-y-0.5"
                  >
                    <FaReceipt /> Transfer to POS Billing Cart
                  </button>

                  <button
                    onClick={handleProcessPrescription}
                    disabled={processingTransaction || medicinesList.length === 0}
                    className={`px-6 py-3.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2
                      ${processingTransaction || medicinesList.length === 0
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {processingTransaction ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating Inventory Ledger...</span>
                      </>
                    ) : (
                      <>
                        <FaCheckCircle /> Direct Dispense & Deduct Stock
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Dispensed Success Modal */}
        {dispensedReceipt && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal max-w-lg w-full p-6 relative">
              <button onClick={() => setDispensedReceipt(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
                <FaTimes size={16} />
              </button>

              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-2">
                  <FaCheckCircle />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Prescription Dispensed!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Stock deducted from inventory & logged into sales ledger. Ref: <strong>{dispensedReceipt.transactionId}</strong>
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-4 mb-4 text-xs space-y-2 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient Name:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{dispensedReceipt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctor / Clinic:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{dispensedReceipt.doctorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Channel:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{dispensedReceipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-sm">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Total Billed:</span>
                  <span className="font-extrabold text-primary-600 dark:text-primary-400">₹{parseFloat(dispensedReceipt.totalAmount).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => generatePDFInvoice(dispensedReceipt)}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5"
                >
                  <FaDownload /> Download Invoice PDF
                </button>
                <button
                  onClick={() => { setDispensedReceipt(null); clearImage(); }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Scan Another Rx
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
