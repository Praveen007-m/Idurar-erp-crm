/**
 * Simple repayment data inspection script
 * Run with: npm run dev (or node with proper env)
 */
const mongoose = require('mongoose');
require('dotenv').config();

const repaymentSchema = new mongoose.Schema({}, { strict: false });
const Repayment = mongoose.model('Repayment', repaymentSchema, 'repayments');

const runInspection = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/idurar');
    
    console.log('\n════════ REPAYMENT DATA INSPECTION ════════\n');
    
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('Today (midnight):', today.toISOString());
    console.log('Today time:', today.getTime());
    
    // Count repayments with amountPaid = 0 and date < today
    const defaultCount = await Repayment.countDocuments({
      removed: { $ne: true },
      amountPaid: 0,
      date: { $lt: today }
    });
    
    console.log('\nDirect query count (amountPaid=0, date<today): ', defaultCount);
    
    // Get a sample of these records
    console.log('\nSample default repayments:');
    const samples = await Repayment.find({
      removed: { $ne: true },
      amountPaid: 0,
      date: { $lt: today }
    })
      .limit(10)
      .lean();
    
    samples.forEach((rep, idx) => {
      console.log(`  [${idx + 1}] date: ${rep.date?.toISOString()}, amount: ${rep.amount}, amountPaid: ${rep.amountPaid}, status: ${rep.status}`);
    });
    
    // Check stored status values
    console.log('\nStored status distribution:');
    const statusCounts = await Repayment.aggregate([
      { $match: { removed: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    statusCounts.forEach(row => {
      console.log(`  ${row._id || '(null)'}: ${row.count}`);
    });
    
    // Total repayments
    const total = await Repayment.countDocuments({ removed: { $ne: true } });
    console.log('\nTotal repayments:', total);
    
    await mongoose.disconnect();
    console.log('\n✓ Inspection complete\n');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

runInspection();
