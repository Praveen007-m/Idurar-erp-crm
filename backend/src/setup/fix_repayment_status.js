const mongoose = require('mongoose');

/**
 * DB Migration: Fix Repayment Status Fields
 * Adds amountPaid/remainingBalance to existing records
 * Normalizes legacy status values
 * Run: cd backend && node src/setup/fix_repayment_status.js
 */

async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/idurar-erp-crm';
  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB');
}

async function fixRepayments() {
  const Repayment = mongoose.model('Repayment');
  
  console.log('🔄 Fixing repayment records...');
  
  // 1. Add missing fields to existing records
  const result1 = await Repayment.updateMany(
    { amountPaid: { $exists: false } },
    { 
      $set: { 
        amountPaid: 0,
        remainingBalance: { $expr: { $subtract: ['$amount', 0] } }
      }
    }
  );
  console.log(`✓ Added fields to ${result1.modifiedCount} records`);
  
  // 2. Normalize legacy status values
  const legacyFixes = [
    { old: 'late payment', new: 'late' },
    { old: 'not-paid', new: 'default' },
    { old: 'not-started', new: 'not_started' },
    { old: 'defaulted', new: 'default' }
  ];
  
  let normalized = 0;
  for (const fix of legacyFixes) {
    const result2 = await Repayment.updateMany(
      { status: fix.old },
      { $set: { status: fix.new } }
    );
    normalized += result2.modifiedCount;
  }
  console.log(`✓ Normalized ${normalized} legacy status values`);
  
  // 3. Recalc status/remainingBalance for records without proper status
  const recalcResult = await Repayment.updateMany(
    { 
      $or: [
        { status: null },
        { status: { $exists: false } },
        { remainingBalance: { $ne: { $subtract: ['$amount', '$amountPaid'] } } }
      ]
    },
    [
      { 
        $set: { 
          remainingBalance: { $subtract: ['$amount', '$amountPaid'] },
          status: {
            $cond: {
              if: { $gte: ['$amountPaid', '$amount'] },
              then: 'paid',
              else: {
                $cond: {
                  if: { $gt: ['$amountPaid', 0] },
                  then: 'partial',
                  else: 'default'
                }
              }
            }
          }
        }
      }
    ]
  );
  console.log(`✓ Recalculated ${recalcResult.modifiedCount} records`);
  
  await mongoose.disconnect();
  console.log('\n✅ Migration complete!');
}

connectDB().then(fixRepayments).catch(console.error);
