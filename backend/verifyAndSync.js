/**
 * verifyAndSync.js  —  Webaac Solutions Finance Management
 * Place in:  backend/
 * Run with:  node verifyAndSync.js
 *
 * Shows exactly which MongoDB URI your app uses,
 * and counts documents in every collection.
 */

const mongoose = require('mongoose');
const path     = require('path');

try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch {}

const MONGO_URI =
  process.env.MONGO_URI   || process.env.DATABASE ||
  process.env.DB_URI      || process.env.MONGODB_URI ||
  'mongodb://localhost:27017/idurar';

async function verify() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  URI your app is using:');
  console.log(' ', MONGO_URI.replace(/:\/\/[^@]+@/, '://<hidden>@'));
  console.log('══════════════════════════════════════════════════\n');

  await mongoose.connect(MONGO_URI);

  const db   = mongoose.connection.db;
  const cols = await db.listCollections().toArray();

  let allZero = true;
  for (const col of cols) {
    const count = await db.collection(col.name).countDocuments({});
    if (count > 0) allZero = false;
    console.log(`  ${col.name.padEnd(20)} ${String(count).padStart(6)} docs`);
  }

  console.log('\n══════════════════════════════════════════════════');

  if (allZero) {
    console.log('\n  ⚠️  ALL COLLECTIONS ARE EMPTY on this URI.');
    console.log('  Your app is pointing to an EMPTY database.');
    console.log('\n  Check your backend/.env file.');
    console.log('  The MONGO_URI / DATABASE variable must point to the');
    console.log('  same Atlas cluster where your 128 repayments are stored.');
    console.log('\n  Your local DB (localhost:27017) has the data.');
    console.log('  Fix: update .env to use:');
    console.log('    MONGO_URI=mongodb://127.0.0.1:27017/idurar');
    console.log('  OR copy .env from your working local setup.\n');
  } else {
    // Show repayment details
    const rep = await db.collection('repayments').findOne({ removed: { $ne: true } });
    console.log('\n  REPAYMENTS sample:');
    if (rep) {
      console.log('    status    :', rep.status);
      console.log('    client    :', rep.client);
      console.log('    amountPaid:', rep.amountPaid);
      console.log('    balance   :', rep.balance);
      console.log('    totalAmt  :', rep.totalAmount);
    }

    // Show client details
    const client = await db.collection('clients').findOne({});
    console.log('\n  CLIENTS sample:');
    if (client) {
      console.log('    name      :', client.name);
      console.log('    assigned  :', client.assigned  ?? '❌ MISSING');
      console.log('    assignedTo:', client.assignedTo ?? '(not present)');
      console.log('    status    :', client.status);
    }

    console.log('\n  ✅ Database has data. Backend should serve real numbers.\n');
  }

  await mongoose.disconnect();
}

verify().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});