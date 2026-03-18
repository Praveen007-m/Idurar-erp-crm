/**
 * PATCH INSTRUCTIONS — appApi.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Add ONE route after the existing /reports route.
 * Find this block in appApi.js (~line 85):
 *
 *   router.route('/reports')
 *     .get(checkRole(['admin', 'owner', 'staff']), catchErrors(dashboardController.reports));
 *
 * ADD immediately after it:
 *
 *   router.route('/dashboard/performance-summary')
 *     .get(catchErrors(dashboardController.performanceSummary));
 *
 * That's the only change needed in appApi.js.
 * ─────────────────────────────────────────────────────────────────────────────
 */


/**
 * fixAssignedField.js  —  ONE-TIME migration fix
 * ─────────────────────────────────────────────────────────────────────────────
 * Your addAssignedToClients.js script wrote the field as `assignedTo`
 * but your actual app schema uses `assigned` (confirmed from appApi.js).
 *
 * This script renames assignedTo → assigned on all client documents.
 *
 * Place in:  backend/
 * Run with:  node fixAssignedField.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const mongoose = require('mongoose');
const path     = require('path');

try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch {}

const MONGO_URI =
  process.env.MONGO_URI   || process.env.DATABASE ||
  process.env.DB_URI      || process.env.MONGODB_URI ||
  'mongodb://localhost:27017/idurar';

async function fix() {
  await mongoose.connect(MONGO_URI);
  console.log('\nConnected.\n');

  const col = mongoose.connection.db.collection('clients');

  // Find all clients that have assignedTo but NOT assigned
  const withWrongField = await col.find({ assignedTo: { $exists: true } }).toArray();
  console.log(`Found ${withWrongField.length} clients with "assignedTo" field (wrong name).`);

  if (withWrongField.length === 0) {
    // Check if assigned field already exists correctly
    const withCorrect = await col.countDocuments({ assigned: { $exists: true } });
    console.log(`Found ${withCorrect} clients already with correct "assigned" field.`);
    if (withCorrect > 0) {
      console.log('\n✅ Already correct — no changes needed.\n');
    } else {
      console.log('\n⚠️  No assigned/assignedTo field found on any client.');
      console.log('   Re-run: node addAssignedToClients.js (will now write correct field name)\n');
    }
    await mongoose.disconnect();
    return;
  }

  let updated = 0;
  for (const doc of withWrongField) {
    await col.updateOne(
      { _id: doc._id },
      {
        $set:   { assigned: doc.assignedTo },
        $unset: { assignedTo: '' },
      }
    );
    console.log(`  ✔ ${doc.name} — assignedTo → assigned (${doc.assignedTo})`);
    updated++;
  }

  console.log(`\n✅ Fixed ${updated} clients. "assignedTo" renamed to "assigned".\n`);
  await mongoose.disconnect();
}

fix().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});