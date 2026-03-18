/**
 * fixRepaymentStatuses.js
 * Place this file in:  Idurar-erp-crm/backend/
 * Then run:           node fixRepaymentStatuses.js
 */

const mongoose = require('mongoose');
const path     = require('path');

// ── Load your existing .env automatically ─────────────────────────────────────
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) { /* dotenv not installed — set MONGO_URI below manually */ }

const MONGO_URI =
  process.env.MONGO_URI    ||
  process.env.DATABASE     ||
  process.env.DB_URI       ||
  process.env.MONGODB_URI  ||
  'mongodb://localhost:27017/idurar';  // fallback — edit db name if needed

// ── Status logic (self-contained, no imports) ─────────────────────────────────
const round2 = (v) => Math.round(((parseFloat(v) || 0) + Number.EPSILON) * 100) / 100;

function deriveStatus(totalAmount, amountPaid, dueDate) {
  const total = round2(totalAmount);
  const paid  = round2(amountPaid);
  const due   = new Date(dueDate);
  due.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const isOverdue = due < today;
  if (paid === 0)    return isOverdue ? 'DEFAULT'  : 'NOT_STARTED';
  if (paid >= total) return isOverdue ? 'LATE'     : 'PAID';
  return 'PARTIAL';
}

// ── Run migration ──────────────────────────────────────────────────────────────
async function migrate() {
  console.log('\n Connecting to:', MONGO_URI.replace(/:\/\/[^@]+@/, '://<hidden>@'));
  await mongoose.connect(MONGO_URI);
  console.log('Connected\n');

  const col   = mongoose.connection.collection('repayments');
  const total = await col.countDocuments({});
  console.log('Total repayment documents:', total, '\n');

  if (total === 0) {
    console.log('No repayments found in DB. Nothing to migrate.');
    console.log('Create repayments first, then re-run.\n');
    await mongoose.disconnect();
    return;
  }

  const cursor = col.find({});
  let checked = 0, updated = 0, errors = 0;

  for await (const doc of cursor) {
    checked++;
    try {
      const principal   = round2(doc.principal);
      const interest    = round2(doc.interest   || 0);
      const amountPaid  = round2(doc.amountPaid || 0);
      const totalAmount = round2(principal + interest);
      const balance     = Math.max(0, round2(totalAmount - amountPaid));
      const dueDate     = doc.date || doc.dueDate;

      if (!dueDate) {
        console.warn('  Skipping', doc._id, '-- no date field');
        continue;
      }

      const newStatus = deriveStatus(totalAmount, amountPaid, dueDate);

      const needsUpdate =
        doc.status      !== newStatus   ||
        doc.totalAmount !== totalAmount ||
        doc.balance     !== balance;

      if (needsUpdate) {
        await col.updateOne(
          { _id: doc._id },
          { $set: { status: newStatus, totalAmount, balance, principal, interest, amountPaid } }
        );
        updated++;
        console.log('  Updated', String(doc._id), '|', doc.status, '->', newStatus, '| balance:', balance);
      }
    } catch (err) {
      errors++;
      console.error('  Error on', doc._id, err.message);
    }
  }

  console.log('\n----------------------------------');
  console.log('Checked :', checked);
  console.log('Updated :', updated);
  console.log('Errors  :', errors);
  console.log('----------------------------------\n');

  await mongoose.disconnect();
  console.log('Migration complete.\n');
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});