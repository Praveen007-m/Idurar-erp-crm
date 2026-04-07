/**
 * Debug script to check why reports show only 2 defaults
 * when calendar shows many (35+)
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/idurar';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const getComputedStatusExpression = (today = null) => {
  const effectiveToday = today ? new Date(today) : startOfToday();
  effectiveToday.setHours(0, 0, 0, 0);

  return {
    $switch: {
      branches: [
        {
          case: {
            $and: [
              { $gt: [{ $ifNull: ['$amount', 0] }, 0] },
              { $gte: [{ $ifNull: ['$amountPaid', 0] }, { $ifNull: ['$amount', 0] }] },
            ],
          },
          then: 'paid',
        },
        {
          case: {
            $and: [
              { $gt: [{ $ifNull: ['$amountPaid', 0] }, 0] },
              { $lt: ['$date', effectiveToday] },
            ],
          },
          then: 'late',
        },
        {
          case: {
            $and: [
              { $gt: [{ $ifNull: ['$amountPaid', 0] }, 0] },
              { $lt: [{ $ifNull: ['$amountPaid', 0] }, { $ifNull: ['$amount', 0] }] },
              { $gte: ['$date', effectiveToday] },
            ],
          },
          then: 'partial',
        },
        {
          case: {
            $and: [
              { $eq: [{ $ifNull: ['$amountPaid', 0] }, 0] },
              { $lt: ['$date', effectiveToday] },
            ],
          },
          then: 'default',
        },
        {
          case: {
            $and: [
              { $eq: [{ $ifNull: ['$amountPaid', 0] }, 0] },
              { $gte: ['$date', effectiveToday] },
            ],
          },
          then: 'not_started',
        },
      ],
      default: 'not_started',
    },
  };
};

async function debugDefaultCount() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = mongoose.connection.db;
    const repaymentCol = db.collection('repayments');

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   DEBUGGING DEFAULT REPAYMENT COUNT MISMATCH              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Simple count of all non-removed repayments
    const totalCount = await repaymentCol.countDocuments({ removed: { $ne: true } });
    console.log(`Total repayments (removed != true): ${totalCount}`);

    // 2. Count of repayments with amountPaid = 0 and date < today
    const today = startOfToday();
    const defaultCountDirect = await repaymentCol.countDocuments({
      removed: { $ne: true },
      amountPaid: { $eq: 0 },
      date: { $lt: today },
    });
    console.log(`Direct count (amountPaid=0, date<today): ${defaultCountDirect}`);

    // 3. Status breakdown using aggregation
    const today2 = startOfToday();
    const statusBreakdown = await repaymentCol
      .aggregate([
        { $match: { removed: { $ne: true } } },
        {
          $addFields: {
            computedStatus: getComputedStatusExpression(today2),
            amount: { $ifNull: ['$amount', 0] },
            amountPaid: { $ifNull: ['$amountPaid', 0] },
          },
        },
        {
          $group: {
            _id: '$computedStatus',
            count: { $sum: 1 },
            total: { $sum: '$amount' },
            paid: { $sum: '$amountPaid' },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    console.log('\nStatus breakdown from aggregation:');
    statusBreakdown.forEach((row) => {
      console.log(
        `  ${row._id}: count=${row.count}, total=${row.total}, paid=${row.paid}`
      );
    });

    // 4. Sample of actual default repayments
    console.log('\nSample of repayments with amountPaid=0 and date<today:');
    const samples = await repaymentCol
      .find({
        removed: { $ne: true },
        amountPaid: { $eq: 0 },
        date: { $lt: today },
      })
      .limit(5)
      .toArray();

    samples.forEach((rep, idx) => {
      console.log(
        `  [${idx + 1}] _id=${rep._id}, date=${rep.date}, amount=${rep.amount}, amountPaid=${rep.amountPaid}, status=${rep.status}`
      );
    });

    // 5. Check for any removed=true repayments that should be counted
    const removedDefaults = await repaymentCol.countDocuments({
      removed: true,
      amountPaid: { $eq: 0 },
      date: { $lt: today },
    });
    console.log(`\nDefaults with removed=true: ${removedDefaults}`);

    // 6. Check for any NULL/undefined issues
    const nullDateCount = await repaymentCol.countDocuments({
      removed: { $ne: true },
      date: { $exists: false },
    });
    const nullAmountCount = await repaymentCol.countDocuments({
      removed: { $ne: true },
      amount: { $exists: false },
    });
    const nullAmountPaidCount = await repaymentCol.countDocuments({
      removed: { $ne: true },
      amountPaid: { $exists: false },
    });

    console.log(`\nNull/undefined fields:`);
    console.log(`  Null dates: ${nullDateCount}`);
    console.log(`  Null amounts: ${nullAmountCount}`);
    console.log(`  Null amountPaid: ${nullAmountPaidCount}`);

    // 7. Check stored status vs computed
    console.log('\nStored status distribution:');
    const storedStatus = await repaymentCol
      .aggregate([
        { $match: { removed: { $ne: true } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    storedStatus.forEach((row) => {
      console.log(`  ${row._id || '(null)'}: ${row.count}`);
    });

    console.log(
      '\n✓ Debug complete. Check if computed default count matches what you see in calendar.\n'
    );

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugDefaultCount();
