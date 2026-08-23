const { medstockDB, authDB, adminDB, userDB } = require('./connections');

async function query(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

async function initSchema() {
  console.log('🔄 Initializing / Verifying schemas...');

  try {
    // 1. Check suppliers SupplierID auto_increment
    const supCols = await query(medstockDB, 'SHOW COLUMNS FROM suppliers');
    const supIdCol = supCols.find(c => c.Field.toLowerCase() === 'supplierid');
    if (supIdCol && !supIdCol.Extra.includes('auto_increment')) {
      console.log('Modifying suppliers.SupplierID to AUTO_INCREMENT with FK handling...');
      try {
        await query(medstockDB, 'ALTER TABLE orders DROP FOREIGN KEY orders_ibfk_1');
      } catch (e) {}
      await query(medstockDB, 'ALTER TABLE suppliers MODIFY SupplierID INT NOT NULL AUTO_INCREMENT');
      try {
        await query(medstockDB, 'ALTER TABLE orders ADD CONSTRAINT orders_ibfk_1 FOREIGN KEY (SupplierID) REFERENCES suppliers(SupplierID) ON DELETE CASCADE');
      } catch (e) {}
      console.log('✅ suppliers.SupplierID is now AUTO_INCREMENT');
    }

    // 2. Check inventory table columns
    const invCols = await query(medstockDB, 'SHOW COLUMNS FROM inventory');
    const invColNames = invCols.map(c => c.Field.toLowerCase());

    if (!invColNames.includes('price')) {
      console.log('Adding price column to inventory table...');
      await query(medstockDB, 'ALTER TABLE inventory ADD COLUMN price DECIMAL(10,2) DEFAULT 0.00 AFTER threshold');
      console.log('✅ Added price to inventory');
    }

    // 3. Check OrderItems table columns
    const oiCols = await query(medstockDB, 'SHOW COLUMNS FROM orderitems');
    const oiColNames = oiCols.map(c => c.Field.toLowerCase());

    if (!oiColNames.includes('name')) {
      await query(medstockDB, 'ALTER TABLE orderitems ADD COLUMN Name VARCHAR(255) NULL AFTER Price');
    }
    if (!oiColNames.includes('category')) {
      await query(medstockDB, 'ALTER TABLE orderitems ADD COLUMN Category VARCHAR(255) NULL AFTER Name');
    }
    if (!oiColNames.includes('expirydate')) {
      await query(medstockDB, 'ALTER TABLE orderitems ADD COLUMN ExpiryDate DATE NULL AFTER Category');
    }
    if (!oiColNames.includes('supplierid')) {
      await query(medstockDB, 'ALTER TABLE orderitems ADD COLUMN SupplierID INT NULL AFTER ExpiryDate');
    }
    try {
      await query(medstockDB, 'ALTER TABLE orderitems MODIFY InventoryID INT NULL');
    } catch (e) {}

    // 4. Fix userrole_billingpage constraints and columns
    try {
      await query(medstockDB, 'ALTER TABLE userrole_billingpage DROP FOREIGN KEY fk_inventory');
    } catch (e) {}
    try {
      await query(medstockDB, 'ALTER TABLE userrole_billingpage DROP COLUMN total_amount');
    } catch (e) {}
    try {
      await query(medstockDB, 'ALTER TABLE userrole_billingpage MODIFY price LONGTEXT NULL');
      await query(medstockDB, 'ALTER TABLE userrole_billingpage MODIFY name VARCHAR(255) NULL');
      await query(medstockDB, 'ALTER TABLE userrole_billingpage MODIFY quantity INT NULL');
    } catch (e) {}

    // 5. Ensure system_settings has proper initial row
    const settings = await query(medstockDB, 'SELECT * FROM system_settings LIMIT 1');
    if (settings.length === 0) {
      await query(medstockDB, `
        INSERT INTO system_settings (id, tax_rate, business_name, business_address, business_gstin, business_contact, default_threshold)
        VALUES (1, 18.00, 'MedStock Pharmacy & Healthcare', '108 Healthcare Blvd, Metro City, 400001', '27AABCU9603R1ZM', '+91 98765 43210', 10)
      `);
      console.log('✅ Initialized default system_settings');
    }

    console.log('✅ Schema initialization complete.');
  } catch (err) {
    console.error('❌ Schema init error:', err);
  }
}

if (require.main === module) {
  initSchema().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}

module.exports = { initSchema };
