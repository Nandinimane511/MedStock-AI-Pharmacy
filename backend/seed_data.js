const { medstockDB, authDB, adminDB, userDB } = require('./connections');
const bcrypt = require('bcrypt');

async function query(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

async function seedData() {
  console.log('🌱 Starting comprehensive Medical Store Data Seeding...');

  try {
    // 1. Clear existing test data in medstock tables
    console.log('Clearing existing medstock records...');
    await query(medstockDB, 'DELETE FROM billitems');
    await query(medstockDB, 'DELETE FROM bills');
    await query(medstockDB, 'DELETE FROM orderitems');
    await query(medstockDB, 'DELETE FROM orders');
    await query(medstockDB, 'DELETE FROM payouts');
    await query(medstockDB, 'DELETE FROM sales');
    await query(medstockDB, 'DELETE FROM inventory');
    await query(medstockDB, 'DELETE FROM suppliers');
    await query(medstockDB, 'DELETE FROM user_data');
    await query(medstockDB, 'DELETE FROM userrole_billingpage');

    // 2. Insert Verified Suppliers
    console.log('Inserting Suppliers...');
    const suppliers = [
      ['Sun Pharma Distribution Ltd', 'Rajesh Sharma', '+91 98201 12345', 'orders@sunpharma-dist.com', 'Plot 14, MIDC Industrial Area, Andheri East, Mumbai', '2026-08-10'],
      ['Cipla Healthcare Logistics', 'Anita Deshmukh', '+91 98202 23456', 'supply@ciplacare.in', 'Gateway Towers, Sector 4, Pune', '2026-08-15'],
      ['Dr. Reddy\'s Lab Supply', 'Vikram Reddy', '+91 98203 34567', 'distributors@drreddys.com', 'Banjara Hills Road No 3, Hyderabad', '2026-08-05'],
      ['Abbott India Supplies', 'Meera Nair', '+91 98204 45678', 'orders.india@abbott.com', 'Prestige Tech Park, Outer Ring Rd, Bengaluru', '2026-08-18'],
      ['Torrent Pharmaceuticals Wholesale', 'Suresh Patel', '+91 98205 56789', 'wholesale@torrentpharma.com', 'Torrent House, Ashram Road, Ahmedabad', '2026-08-12'],
    ];

    const supplierInsertSql = `
      INSERT INTO suppliers (SupplierName, ContactPerson, PhoneNumber, EmailAddress, Address, LastDeliveryDate)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const supplierIds = [];
    for (const sup of suppliers) {
      const res = await query(medstockDB, supplierInsertSql, sup);
      supplierIds.push(res.insertId);
    }
    console.log(`✅ Seeded ${supplierIds.length} Suppliers`);

    // 3. Insert Inventory / Medicines
    console.log('Inserting Inventory / Medicines...');
    const inventoryItems = [
      ['Amoxicillin 500mg', 'Antibiotic', 120, '2027-04-15', 'Sun Pharma Distribution Ltd', 20, 85.00],
      ['Augmentin 625 Duo', 'Antibiotic', 45, '2026-11-20', 'Cipla Healthcare Logistics', 15, 195.50],
      ['Azithromycin 500mg (Azee)', 'Antibiotic', 15, '2026-09-30', 'Cipla Healthcare Logistics', 25, 120.00], // Low stock
      ['Paracetamol 650mg (Dolo 650)', 'Analgesic', 250, '2027-10-10', 'Sun Pharma Distribution Ltd', 50, 32.00],
      ['Ibuprofen 400mg (Brufen)', 'Analgesic', 80, '2026-12-15', 'Abbott India Supplies', 20, 48.00],
      ['Aspirin 75mg (Ecosprin)', 'Cardiovascular', 110, '2027-06-30', 'Torrent Pharmaceuticals Wholesale', 30, 18.50],
      ['Warfarin 5mg (Uniwarfin)', 'Cardiovascular', 30, '2026-10-01', 'Sun Pharma Distribution Ltd', 10, 145.00],
      ['Metformin 500mg (Glycomet)', 'Anti-Diabetic', 180, '2027-08-25', 'Dr. Reddy\'s Lab Supply', 40, 42.00],
      ['Glimepiride 2mg (Amaryl)', 'Anti-Diabetic', 90, '2027-03-12', 'Sun Pharma Distribution Ltd', 20, 68.00],
      ['Amlodipine 5mg (Norvasc)', 'Cardiovascular', 140, '2027-05-18', 'Abbott India Supplies', 30, 55.00],
      ['Telmisartan 40mg (Telma 40)', 'Cardiovascular', 100, '2027-07-20', 'Torrent Pharmaceuticals Wholesale', 25, 92.00],
      ['Pantoprazole 40mg (Pan 40)', 'Gastrointestinal', 160, '2027-02-14', 'Dr. Reddy\'s Lab Supply', 35, 75.00],
      ['Levocetirizine 5mg (Levocet)', 'Respiratory', 85, '2026-09-10', 'Cipla Healthcare Logistics', 20, 40.00], // Expiring soon
      ['Montelukast 10mg (Montair)', 'Respiratory', 70, '2027-01-30', 'Cipla Healthcare Logistics', 20, 110.00],
      ['Vitamin C + Zinc (Limcee)', 'Vitamins', 220, '2027-12-31', 'Abbott India Supplies', 40, 28.00],
      ['Vitamin D3 60K IU (Calcirol)', 'Vitamins', 95, '2027-09-15', 'Sun Pharma Distribution Ltd', 20, 130.00],
      ['Cetirizine 10mg (Cetzine)', 'Respiratory', 8, '2026-08-30', 'Dr. Reddy\'s Lab Supply', 30, 25.00], // Low stock & expiring soon
    ];

    const invInsertSql = `
      INSERT INTO inventory (name, category, quantity, expiryDate, supplier, threshold, price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const inventoryMap = {};
    for (const item of inventoryItems) {
      const res = await query(medstockDB, invInsertSql, item);
      inventoryMap[item[0]] = { id: res.insertId, name: item[0], category: item[1], price: item[6], expiryDate: item[3] };
    }
    console.log(`✅ Seeded ${Object.keys(inventoryMap).length} Inventory / Medicine Items`);

    // 4. Insert Orders & Order Items
    console.log('Inserting Purchase Orders...');
    const sampleOrders = [
      {
        orderId: 'ORD-1001',
        supplierId: supplierIds[0],
        totalPrice: 7450.00,
        deliveryDate: '2026-08-10',
        isDelivered: 1,
        deliveryDateActual: '2026-08-10',
        items: [
          { name: 'Amoxicillin 500mg', category: 'Antibiotic', qty: 50, price: 85.00, expiry: '2027-04-15' },
          { name: 'Paracetamol 650mg (Dolo 650)', category: 'Analgesic', qty: 100, price: 32.00, expiry: '2027-10-10' }
        ]
      },
      {
        orderId: 'ORD-1002',
        supplierId: supplierIds[1],
        totalPrice: 12400.00,
        deliveryDate: '2026-08-15',
        isDelivered: 1,
        deliveryDateActual: '2026-08-15',
        items: [
          { name: 'Augmentin 625 Duo', category: 'Antibiotic', qty: 40, price: 195.50, expiry: '2026-11-20' },
          { name: 'Montelukast 10mg (Montair)', category: 'Respiratory', qty: 40, price: 110.00, expiry: '2027-01-30' }
        ]
      },
      {
        orderId: 'ORD-1003',
        supplierId: supplierIds[2],
        totalPrice: 5600.00,
        deliveryDate: '2026-08-25',
        isDelivered: 0,
        deliveryDateActual: null,
        items: [
          { name: 'Metformin 500mg (Glycomet)', category: 'Anti-Diabetic', qty: 80, price: 42.00, expiry: '2027-08-25' },
          { name: 'Pantoprazole 40mg (Pan 40)', category: 'Gastrointestinal', qty: 30, price: 75.00, expiry: '2027-02-14' }
        ]
      },
      {
        orderId: 'ORD-1004',
        supplierId: supplierIds[3],
        totalPrice: 9200.00,
        deliveryDate: '2026-08-28',
        isDelivered: 0,
        deliveryDateActual: null,
        items: [
          { name: 'Amlodipine 5mg (Norvasc)', category: 'Cardiovascular', qty: 80, price: 55.00, expiry: '2027-05-18' },
          { name: 'Vitamin C + Zinc (Limcee)', category: 'Vitamins', qty: 100, price: 28.00, expiry: '2027-12-31' }
        ]
      },
    ];

    for (const ord of sampleOrders) {
      await query(medstockDB, `
        INSERT INTO orders (OrderID, SupplierID, TotalPrice, DeliveryDate, Delivery_Status, Delivery_Date)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [ord.orderId, ord.supplierId, ord.totalPrice, ord.deliveryDate, ord.isDelivered, ord.deliveryDateActual]);

      for (const itm of ord.items) {
        const inv = inventoryMap[itm.name];
        await query(medstockDB, `
          INSERT INTO orderitems (OrderID, InventoryID, Quantity, Price, Name, Category, ExpiryDate, SupplierID)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [ord.orderId, inv ? inv.id : null, itm.qty, itm.price, itm.name, itm.category, itm.expiry, ord.supplierId]);
      }
    }
    console.log(`✅ Seeded ${sampleOrders.length} Orders and complete OrderItems`);

    // 5. Insert Bills, Bill Items & Sales Records
    console.log('Inserting Bills, Bill Items & Sales...');
    const billsData = [
      {
        billId: 'BILL-2026-001',
        orderId: 'ORD-1001',
        date: '2026-08-20 10:30:00',
        total: 424.80,
        items: [
          { name: 'Augmentin 625 Duo', qty: 2, price: 195.50 },
          { name: 'Paracetamol 650mg (Dolo 650)', qty: 1, price: 32.00 }
        ],
        payment: 'UPI',
        email: 'admin@gmail.com'
      },
      {
        billId: 'BILL-2026-002',
        orderId: 'ORD-1002',
        date: '2026-08-21 14:15:00',
        total: 350.40,
        items: [
          { name: 'Pantoprazole 40mg (Pan 40)', qty: 2, price: 75.00 },
          { name: 'Montelukast 10mg (Montair)', qty: 1, price: 110.00 },
          { name: 'Vitamin C + Zinc (Limcee)', qty: 3, price: 28.00 }
        ],
        payment: 'Cash',
        email: 'manenandini511@gmail.com'
      },
      {
        billId: 'BILL-2026-003',
        orderId: null,
        date: '2026-08-22 17:45:00',
        total: 512.00,
        items: [
          { name: 'Telmisartan 40mg (Telma 40)', qty: 3, price: 92.00 },
          { name: 'Metformin 500mg (Glycomet)', qty: 4, price: 42.00 },
          { name: 'Paracetamol 650mg (Dolo 650)', qty: 2, price: 32.00 }
        ],
        payment: 'Card',
        email: 'abcde@gmail.com'
      },
      {
        billId: 'BILL-2026-004',
        orderId: null,
        date: '2026-08-23 09:10:00',
        total: 285.00,
        items: [
          { name: 'Amoxicillin 500mg', qty: 2, price: 85.00 },
          { name: 'Ibuprofen 400mg (Brufen)', qty: 2, price: 48.00 }
        ],
        payment: 'Razorpay',
        email: 'admin@gmail.com'
      }
    ];

    for (const b of billsData) {
      await query(medstockDB, `
        INSERT INTO bills (BillID, OrderID, BillingDate, TotalAmount)
        VALUES (?, ?, ?, ?)
      `, [b.billId, b.orderId, b.date, b.total]);

      for (const item of b.items) {
        await query(medstockDB, `
          INSERT INTO billitems (BillID, MedicineName, Quantity, Price)
          VALUES (?, ?, ?, ?)
        `, [b.billId, item.name, item.qty, item.price]);
      }

      await query(medstockDB, `
        INSERT INTO sales (user_email, role, payment_method, total_amount, source, sale_date)
        VALUES (?, 'Admin', ?, ?, 'POS', ?)
      `, [b.email, b.payment, b.total, b.date]);
    }
    console.log(`✅ Seeded ${billsData.length} Bills, BillItems and Sales`);

    // 6. Insert Payouts
    console.log('Inserting Payouts...');
    await query(medstockDB, `
      INSERT INTO payouts (payout_amount, payout_date, created_by)
      VALUES 
        (15000.00, '2026-08-15', 'admin@gmail.com'),
        (12500.00, '2026-08-20', 'admin@gmail.com'),
        (8500.00, '2026-08-22', 'admin@gmail.com')
    `);
    console.log('✅ Seeded Payouts');

    // 7. Seed medstock.user_data for staff directory
    console.log('Inserting Staff User Data...');
    await query(medstockDB, `
      INSERT INTO user_data (name, role, email, phone, created_at, updated_at)
      VALUES 
        ('Dr. Nandini Mane', 'Admin', 'admin@gmail.com', '+91 98765 00001', NOW(), NOW()),
        ('Shruti Mane', 'User', 'manenandini511@gmail.com', '+91 98765 00002', NOW(), NOW()),
        ('Rohan Deshmukh', 'User', 'rohan.pharm@gmail.com', '+91 98765 00003', NOW(), NOW())
    `);
    console.log('✅ Seeded user_data');

    // 8. Ensure test users exist in auth_db with known password: 'Password@123'
    console.log('Verifying auth_db users...');
    const hashedPass = await bcrypt.hash('Password@123', 10);
    
    // Check if test users exist
    const existingUsers = await query(authDB, 'SELECT email FROM users');
    const existingEmails = existingUsers.map(u => u.email);

    if (!existingEmails.includes('admin@gmail.com')) {
      await query(authDB, 'INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)',
        ['admin@gmail.com', 'Admin Pharmacy', hashedPass, 'Admin']
      );
    }
    if (!existingEmails.includes('staff@gmail.com')) {
      await query(authDB, 'INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)',
        ['staff@gmail.com', 'Pharmacy Staff', hashedPass, 'User']
      );
    }

    console.log('🎉 Data Seeding Successfully Completed!');
  } catch (err) {
    console.error('❌ Error during data seeding:', err);
    throw err;
  }
}

if (require.main === module) {
  seedData().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seedData };
