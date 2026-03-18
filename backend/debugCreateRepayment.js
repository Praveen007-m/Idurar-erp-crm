/**
 * debugCreateRepayment.js  —  Webaac Solutions Finance Management
 * Place in:  backend/
 * Run with:  node debugCreateRepayment.js
 *
 * Simulates a repayment create to find exactly what is null.
 */

const mongoose = require('mongoose');
const path     = require('path');

try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch {}

// Set up module alias (@/) same as your app
const moduleAlias = require('module-alias');
moduleAlias.addAlias('@', path.join(__dirname, 'src'));

const MONGO_URI =
  process.env.MONGO_URI || process.env.DATABASE || process.env.DB_URI ||
  'mongodb://localhost:27017/idurar';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected\n');

  // Load models
  require('@/models/appModels/Repayment');
  require('@/models/appModels/Payment');
  require('@/models/appModels/Client');

  const Payment   = require('@/models/appModels/Payment');
  const Repayment = mongoose.model('Repayment');
  const Client    = mongoose.model('Client');

  // Get a real client and repayment from DB
  const client     = await Client.findOne({ removed: { $ne: true } }).lean();
  const repayment  = await Repayment.findOne({ removed: false }).lean();

  console.log('Sample client._id :', client?._id);
  console.log('Sample repayment._id:', repayment?._id);
  console.log('repayment.client  :', repayment?.client);
  console.log('typeof client     :', typeof repayment?.client);

  // Check what Payment.create needs
  const samplePayment = {
    client:      client?._id,
    date:        new Date(),
    paymentMode: 'Cash',
    reference:   repayment?._id,
    currency:    'INR',
    description: 'Test payment',
    amount:      100,
    number:      9999,
    createdBy:   null,
  };

  console.log('\nSample Payment payload:');
  console.log(JSON.stringify(samplePayment, null, 2));

  // Check Payment schema required fields
  const PaymentSchema = Payment.schema;
  const requiredPaths = [];
  PaymentSchema.eachPath((pathName, schemaType) => {
    if (schemaType.isRequired) requiredPaths.push(pathName);
  });
  console.log('\nPayment required fields:', requiredPaths);

  // Check if any required field would be null
  for (const field of requiredPaths) {
    const val = samplePayment[field];
    if (val === null || val === undefined) {
      console.log(`\n❌ FOUND IT: Payment.${field} is null/undefined — this causes .toString() crash`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});