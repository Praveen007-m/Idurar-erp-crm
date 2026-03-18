/**
 * checkDbConnection.js  —  Webaac Solutions Finance Management
 * Place in:  Idurar-erp-crm/backend/
 * Run with:  node checkDbConnection.js
 *
 * Tells you exactly which MongoDB your app is using and how many
 * documents are in each collection.
 */

const mongoose = require('mongoose');
const path     = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {}

const MONGO_URI =
  process.env.MONGO_URI    ||
  process.env.DATABASE     ||
  process.env.DB_URI       ||
  process.env.MONGODB_URI  ||
  'mongodb://localhost:27017/idurar';

async function check() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  DB CONNECTION CHECKER');
  console.log('══════════════════════════════════════════════');
  console.log('  URI in use:', MONGO_URI.replace(/:\/\/[^@]+@/, '://<hidden>@'));
  console.log('══════════════════════════════════════════════\n');

  await mongoose.connect(MONGO_URI);

  const db          = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  console.log('  Collections and document counts:\n');
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments({});
    const flag  = count === 0 ? '  ← EMPTY' : '';
    console.log(`  ${col.name.padEnd(20)} ${String(count).padStart(6)} documents${flag}`);
  }

  console.log('\n══════════════════════════════════════════════');

  // Check repayments specifically
  const repCol    = db.collection('repayments');
  const repTotal  = await repCol.countDocuments({});
  const repSample = await repCol.findOne({});

  console.log('\n  REPAYMENTS DETAIL');
  console.log('  Total            :', repTotal);
  if (repSample) {
    console.log('  Sample doc fields:', Object.keys(repSample).join(', '));
    console.log('  Sample status    :', repSample.status);
    console.log('  Sample date      :', repSample.date || repSample.dueDate);
    console.log('  Sample amountPaid:', repSample.amountPaid);
    console.log('  Sample balance   :', repSample.balance);
    console.log('  Sample totalAmt  :', repSample.totalAmount);
  }

  // Check admins/staff
  const adminCol   = db.collection('admins');
  const adminCount = await adminCol.countDocuments({});
  const adminSample = await adminCol.findOne({});
  console.log('\n  ADMINS/STAFF DETAIL');
  console.log('  Total            :', adminCount);
  if (adminSample) {
    console.log('  Sample fields    :', Object.keys(adminSample).join(', '));
    console.log('  Sample role      :', adminSample.role);
  }

  // Check clients
  const clientCol   = db.collection('clients');
  const clientCount = await clientCol.countDocuments({});
  const clientSample = await clientCol.findOne({});
  console.log('\n  CLIENTS DETAIL');
  console.log('  Total            :', clientCount);
  if (clientSample) {
    console.log('  Sample fields    :', Object.keys(clientSample).join(', '));
    console.log('  assignedTo field :', clientSample.assignedTo ?? '*** NOT FOUND ***');
  }

  console.log('\n══════════════════════════════════════════════\n');
  await mongoose.disconnect();
}

check().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});