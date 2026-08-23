const axios = require('axios');
const http = require('http');
const app = require('./server');

const BASE_URL = 'http://localhost:5001';
let server;
let adminToken = '';
let userToken = '';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(suite, name, passed, details = '') {
  if (passed) {
    results.passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    results.failed++;
    console.error(`  ❌ [FAIL] ${name} -> ${details}`);
  }
  results.tests.push({ suite, name, passed, details });
}

async function runTests() {
  console.log('🧪 Starting MedStock Complete Endpoint Test Suite...\n');

  // Start test server on port 5001
  await new Promise((resolve) => {
    server = app.listen(5001, () => {
      console.log('🚀 Test server running on port 5001\n');
      resolve();
    });
  });

  const client = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true // Do not throw on 4xx/5xx so we can assert status codes
  });

  try {
    // ==========================================
    // 1. AUTH SUITE
    // ==========================================
    console.log('📦 1. AUTHENTICATION SUITE');
    
    // Login Admin
    const loginAdminRes = await client.post('/api/login', {
      email: 'admin@gmail.com',
      password: 'Password@123',
      role: 'Admin'
    });
    const adminLoginPass = loginAdminRes.status === 200 && !!loginAdminRes.data.token;
    adminToken = loginAdminRes.data.token;
    recordTest('Auth', 'POST /api/login (Admin)', adminLoginPass, JSON.stringify(loginAdminRes.data));

    // Login User
    const loginUserRes = await client.post('/api/login', {
      email: 'manenandini511@gmail.com',
      password: 'Password@123',
      role: 'User'
    });
    const userLoginPass = loginUserRes.status === 200 && !!loginUserRes.data.token;
    userToken = loginUserRes.data?.token || adminToken;
    recordTest('Auth', 'POST /api/login (User)', userLoginPass, JSON.stringify(loginUserRes.data));

    // Protected Route with Token
    const dashRes = await client.get('/api/dashboard', {
      headers: { Authorization: adminToken }
    });
    recordTest('Auth', 'GET /api/dashboard (Protected)', dashRes.status === 200);

    // Reset Password
    const resetRes = await client.post('/api/reset-password', {
      email: 'admin@gmail.com',
      newPassword: 'Password@123'
    });
    recordTest('Auth', 'POST /api/reset-password', resetRes.status === 200);

    // ==========================================
    // 2. INVENTORY SUITE
    // ==========================================
    console.log('\n📦 2. INVENTORY MANAGEMENT SUITE');

    // Get All Inventory
    const invRes = await client.get('/api/inventory');
    const invPass = invRes.status === 200 && Array.isArray(invRes.data) && invRes.data.length > 0;
    recordTest('Inventory', 'GET /api/inventory', invPass, `Returned ${invRes.data?.length} items`);

    // Get Low or Expired
    const lowExpRes = await client.get('/api/inventory/low-or-expired');
    recordTest('Inventory', 'GET /api/inventory/low-or-expired', lowExpRes.status === 200 && Array.isArray(lowExpRes.data));

    // Get Inventory Names
    const namesRes = await client.get('/api/inventory/names');
    recordTest('Inventory', 'GET /api/inventory/names', namesRes.status === 200 && Array.isArray(namesRes.data));

    // Add New Inventory Item
    const addInvRes = await client.post('/api/inventory', {
      name: `Test Medicine ${Date.now()}`,
      category: 'Antibiotic',
      quantity: 50,
      expiryDate: '2027-12-31',
      supplier: 'Sun Pharma Distribution Ltd',
      threshold: 10,
      price: 99.00
    });
    const createdItemId = addInvRes.data?.id;
    recordTest('Inventory', 'POST /api/inventory', addInvRes.status === 201 && !!createdItemId);

    // Update Inventory Item
    if (createdItemId) {
      const updInvRes = await client.put(`/api/inventory/${createdItemId}`, {
        name: `Test Medicine Updated ${Date.now()}`,
        category: 'Antibiotic',
        quantity: 60,
        expiryDate: '2027-12-31',
        supplier: 'Sun Pharma Distribution Ltd',
        threshold: 15,
        price: 110.00
      });
      recordTest('Inventory', `PUT /api/inventory/:id`, updInvRes.status === 200);

      // Delete Inventory Item
      const delInvRes = await client.delete(`/api/inventory/${createdItemId}`);
      recordTest('Inventory', `DELETE /api/inventory/:id`, delInvRes.status === 200);
    }

    // Update Stock via billing route
    const updateStockRes = await client.post('/api/update-inventory', {
      name: 'Amoxicillin 500mg',
      quantity: 1
    });
    recordTest('Inventory', 'POST /api/update-inventory', updateStockRes.status === 200);

    // Export Inventory
    const exportRes = await client.get('/api/export-inventory');
    recordTest('Inventory', 'GET /api/export-inventory', exportRes.status === 200);

    // ==========================================
    // 3. SUPPLIERS SUITE
    // ==========================================
    console.log('\n📦 3. SUPPLIERS SUITE');

    const supRes = await client.get('/api/suppliers');
    recordTest('Suppliers', 'GET /api/suppliers', supRes.status === 200 && supRes.data.length > 0);
    const validSupplierId = supRes.data && supRes.data.length > 0 ? supRes.data[0].SupplierID : 1;

    const addSupRes = await client.post('/api/suppliers', {
      SupplierName: `Apex Medical Supplies ${Date.now()}`,
      ContactPerson: 'Ravi Kumar',
      PhoneNumber: '+91 98989 12121',
      EmailAddress: `apex_${Date.now()}@medsupply.com`,
      Address: '42 Health Park, Mumbai',
      LastDeliveryDate: '2026-08-01'
    });
    const newSupId = addSupRes.data?.id;
    recordTest('Suppliers', 'POST /api/suppliers', addSupRes.status === 201 && !!newSupId);

    if (newSupId) {
      const updSupRes = await client.put(`/api/suppliers/${newSupId}`, {
        SupplierName: `Apex Medical Supplies Updated`,
        ContactPerson: 'Ravi Kumar Senior',
        PhoneNumber: '+91 98989 12121',
        EmailAddress: `apex_upd_${Date.now()}@medsupply.com`,
        Address: '42 Health Park Updated, Mumbai',
        LastDeliveryDate: '2026-08-10'
      });
      recordTest('Suppliers', 'PUT /api/suppliers/:id', updSupRes.status === 200);

      const delSupRes = await client.delete(`/api/suppliers/${newSupId}`);
      recordTest('Suppliers', 'DELETE /api/suppliers/:id', delSupRes.status === 200);
    }

    // ==========================================
    // 4. ORDERS & DELIVERIES SUITE
    // ==========================================
    console.log('\n📦 4. ORDERS & DELIVERIES SUITE');

    const ordersRes = await client.get('/api/orders');
    recordTest('Orders', 'GET /api/orders', ordersRes.status === 200 && Array.isArray(ordersRes.data));

    const upcomingOrdersRes = await client.get('/api/orders/upcoming');
    recordTest('Orders', 'GET /api/orders/upcoming', upcomingOrdersRes.status === 200);

    const deliveredOrdersRes = await client.get('/api/get-delivered-orders');
    recordTest('Orders', 'GET /api/get-delivered-orders', deliveredOrdersRes.status === 200);

    // Create New Order using valid Supplier ID
    const testOrderId = `ORD-${Date.now().toString().slice(-4)}`;
    const createOrderRes = await client.post('/api/orders', {
      OrderID: testOrderId,
      SupplierID: validSupplierId,
      DeliveryDate: '2026-09-15',
      TotalPrice: 3400.00,
      medicines: [
        { name: 'Paracetamol 650mg (Dolo 650)', category: 'Analgesic', quantity: 50, price: 32.00, expiryDate: '2027-10-10', supplier_id: validSupplierId }
      ]
    });
    recordTest('Orders', 'POST /api/orders', createOrderRes.status === 201, JSON.stringify(createOrderRes.data));

    // Delete Test Order
    const delOrderRes = await client.delete(`/api/orders/${testOrderId}`);
    recordTest('Orders', 'DELETE /api/orders/:orderID', delOrderRes.status === 200);

    // ==========================================
    // 5. BILLING & INVOICES SUITE
    // ==========================================
    console.log('\n📦 5. BILLING & INVOICES SUITE');

    const saveBillRes = await client.post('/api/save-bill', {
      billItems: [{ name: 'Amoxicillin 500mg', quantity: 1, price: 85.00 }],
      totalAmount: 85.00,
      date: '2026-08-23',
      username: 'admin@gmail.com',
      paymentType: 'Cash'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Billing', 'POST /api/save-bill', saveBillRes.status === 201, JSON.stringify(saveBillRes.data));

    const getBillsRes = await client.get('/api/get-bills');
    recordTest('Billing', 'GET /api/get-bills', getBillsRes.status === 200 && Array.isArray(getBillsRes.data));

    // Generate bill for delivered order ORD-1001
    const genBillRes = await client.post('/api/generate-bill', {
      orderID: 'ORD-1001',
      paymentType: 'UPI'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Billing', 'POST /api/generate-bill', genBillRes.status === 200 || genBillRes.status === 201, JSON.stringify(genBillRes.data));

    // ==========================================
    // 6. REPORTS & SALES SUITE
    // ==========================================
    console.log('\n📦 6. REPORTS & SALES SUITE');

    const reportStock = await client.get('/api/reports/stock');
    recordTest('Reports', 'GET /api/reports/stock', reportStock.status === 200);

    const reportSales = await client.get('/api/reports/sales');
    recordTest('Reports', 'GET /api/reports/sales', reportSales.status === 200);

    const reportPayout = await client.get('/api/reports/todays-payout');
    recordTest('Reports', 'GET /api/reports/todays-payout', reportPayout.status === 200);

    const reportPayoutHist = await client.get('/api/reports/payout-history');
    recordTest('Reports', 'GET /api/reports/payout-history', reportPayoutHist.status === 200);

    const reportLowStock = await client.get('/api/reports/low-stock');
    recordTest('Reports', 'GET /api/reports/low-stock', reportLowStock.status === 200);

    const reportExpired = await client.get('/api/reports/expired-items');
    recordTest('Reports', 'GET /api/reports/expired-items', reportExpired.status === 200);

    const salesSummary = await client.get('/api/sales/summary', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Reports', 'GET /api/sales/summary', salesSummary.status === 200);

    const salesByUser = await client.get('/api/sales/summary/by-user', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Reports', 'GET /api/sales/summary/by-user', salesByUser.status === 200);

    // ==========================================
    // 7. SYSTEM SETTINGS & NOTIFICATIONS
    // ==========================================
    console.log('\n📦 7. SETTINGS & NOTIFICATIONS SUITE');

    const settingsGet = await client.get('/api/settings');
    recordTest('Settings', 'GET /api/settings', settingsGet.status === 200 && !!settingsGet.data?.business_name);

    const settingsPut = await client.put('/api/settings', {
      tax_rate: 18.00,
      business_name: 'MedStock Pharmacy & Healthcare Hub',
      business_address: '108 Healthcare Blvd, Metro City, 400001',
      business_gstin: '27AABCU9603R1ZM',
      business_contact: '+91 98765 43210',
      default_threshold: 10
    });
    recordTest('Settings', 'PUT /api/settings', settingsPut.status === 200);

    const notifRes = await client.get('/api/notifications');
    recordTest('Notifications', 'GET /api/notifications', notifRes.status === 200 && notifRes.data?.summary);

    // ==========================================
    // 8. USERS DIRECTORY SUITE
    // ==========================================
    console.log('\n📦 8. USERS DIRECTORY SUITE');

    const usersGet = await client.get('/api/users');
    recordTest('Users', 'GET /api/users', usersGet.status === 200 && Array.isArray(usersGet.data));

    const addUserRes = await client.post('/api/users', {
      name: 'Dr. Test Pharmacist',
      role: 'User',
      email: `test_pharm_${Date.now()}@medstock.com`,
      phone: `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`
    });
    const newUserId = addUserRes.data?.id;
    recordTest('Users', 'POST /api/users', addUserRes.status === 200 || addUserRes.status === 201);

    if (newUserId) {
      const updUserRes = await client.put(`/api/users/${newUserId}`, {
        name: 'Dr. Test Pharmacist Lead',
        role: 'Admin',
        phone: `+91 99999 88888`
      });
      recordTest('Users', 'PUT /api/users/:id', updUserRes.status === 200);

      const delUserRes = await client.delete(`/api/users/${newUserId}`);
      recordTest('Users', 'DELETE /api/users/:id', delUserRes.status === 200);
    }

    // ==========================================
    // 9. 🤖 AI & AUTOMATION SUITE
    // ==========================================
    console.log('\n🤖 9. MEDSTOCK AI & AUTOMATION SUITE');

    // Drug Interaction Check (Warfarin + Aspirin should detect HIGH severity bleed risk)
    const aiInteractions = await client.post('/api/ai/check-interactions', {
      medicines: ['Warfarin 5mg', 'Aspirin 75mg']
    });
    const hasInteraction = aiInteractions.status === 200 && aiInteractions.data?.safe === false && aiInteractions.data?.interactionsFound > 0;
    recordTest('AI', 'POST /api/ai/check-interactions (Drug Safety Alert)', hasInteraction, JSON.stringify(aiInteractions.data?.alerts));

    // Generic Substitute Finder
    const aiSubstitutes = await client.post('/api/ai/find-substitutes', {
      medicineName: 'Augmentin 625 Duo'
    });
    const hasSubstitutes = aiSubstitutes.status === 200 && Array.isArray(aiSubstitutes.data?.substitutes);
    recordTest('AI', 'POST /api/ai/find-substitutes (Generic Bio-Equivalents)', hasSubstitutes, `Found ${aiSubstitutes.data?.substitutes?.length} alternatives`);

    // Prescription OCR & Text Parser
    const aiPrescription = await client.post('/api/ai/parse-prescription', {
      prescriptionText: 'Rx:\n1. Augmentin 625 Duo 1-0-1 x 5 days\n2. Paracetamol 650mg 1-1-1 x 3 days\n3. Pan 40 OD before breakfast 5 days'
    });
    const parsedRx = aiPrescription.status === 200 && aiPrescription.data?.parsedItems?.length >= 2;
    recordTest('AI', 'POST /api/ai/parse-prescription (Smart Cart Auto-Fill)', parsedRx, `Parsed ${aiPrescription.data?.parsedItems?.length} items`);

    // Predictive Stock Reorder & Demand Forecasting
    const aiReorder = await client.get('/api/ai/forecast-reorder');
    const hasReorder = aiReorder.status === 200 && Array.isArray(aiReorder.data?.recommendations);
    recordTest('AI', 'GET /api/ai/forecast-reorder (Predictive Reordering)', hasReorder, `Urgent reorders: ${aiReorder.data?.urgentReorderCount}`);

    // Expiry Optimizer
    const aiExpiry = await client.get('/api/ai/expiry-optimizer');
    const hasExpiry = aiExpiry.status === 200 && typeof aiExpiry.data?.totalValueAtRisk === 'number';
    recordTest('AI', 'GET /api/ai/expiry-optimizer (Dynamic Markdown Clearance)', hasExpiry, `At risk: ₹${aiExpiry.data?.totalValueAtRisk}`);

    // Natural Language AI Pharmacy Assistant
    const aiAssistant = await client.post('/api/ai/assistant', {
      prompt: 'Which medicines are expiring soon?'
    });
    const hasAssistantResp = aiAssistant.status === 200 && !!aiAssistant.data?.summary;
    recordTest('AI', 'POST /api/ai/assistant (Pharmacy Copilot)', hasAssistantResp, aiAssistant.data?.summary);

    // AI Prescription Image & OCR Scanner
    const scanRxRes = await client.post('/api/ai/scan-prescription', {
      samplePreset: 'handwritten_fever_infection'
    });
    const hasScanResult = scanRxRes.status === 200 && scanRxRes.data?.medicinesDetected >= 3 && Array.isArray(scanRxRes.data?.extractedMedicines);
    recordTest('AI', 'POST /api/ai/scan-prescription (AI Prescription Scanner OCR)', hasScanResult, `Detected ${scanRxRes.data?.medicinesDetected} items with ${scanRxRes.data?.summary?.availableCount} available`);

    // Process Prescription & Deduct Inventory
    const processRxRes = await client.post('/api/ai/process-prescription', {
      confirmedMedicines: [
        {
          medicineName: 'Amoxicillin 500mg',
          quantity: 2,
          unitPrice: 85.00,
          inventoryId: 1
        }
      ],
      customerName: 'Test Patient',
      doctorName: 'Dr. Test, MD',
      paymentMode: 'Cash',
      userEmail: 'admin@gmail.com'
    });
    const hasProcessedRx = processRxRes.status === 200 && !!processRxRes.data?.transactionId;
    recordTest('AI', 'POST /api/ai/process-prescription (Prescription Dispensing & Stock Deduction)', hasProcessedRx, `Receipt: ${processRxRes.data?.transactionId}`);

  } catch (error) {
    console.error('Fatal Test Runner Error:', error);
  } finally {
    console.log('\n=============================================');
    console.log(`📊 FINAL TEST RESULTS: ${results.passed} PASSED | ${results.failed} FAILED`);
    console.log('=============================================\n');

    if (server) {
      server.close();
    }
    process.exit(results.failed === 0 ? 0 : 1);
  }
}

runTests();
