/**
 * staffPerformance.js — Backend route
 * Webaac Solutions Finance Management
 *
 * GET /api/staff/performance
 *
 * Place this file at: backend/src/routes/appRoutes/staffPerformance.js
 *
 * Register in appApi.js by adding these 2 lines near the top:
 *   const staffPerformanceRouter = require('./staffPerformance');
 *   router.use('/', staffPerformanceRouter);
 */

const express   = require('express');
const router    = express.Router();
const Client    = require('@/models/appModels/Client');
const Admin     = require('@/models/coreModels/Admin');
const Repayment = require('@/models/appModels/Repayment');
const checkRole = require('@/middlewares/checkRole');
const { catchErrors } = require('@/handlers/errorHandlers');

// ── GET /api/staff/performance ────────────────────────────────────────────────
const staffPerformanceHandler = async (req, res) => {
  try {
    // 1. Get all staff (role = 'staff') from Admin collection
    const staffList = await Admin.find({ role: 'staff', removed: false }).lean();

    if (!staffList.length) {
      return res.json({
        success: true,
        result: {
          staffWise:    [],
          activeCount:  0,
          topPerformer: null,
        },
      });
    }

    const staffIds   = staffList.map((s) => s._id);
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 2. Aggregate clients per staff using Client.assigned field
    const clientAgg = await Client.aggregate([
      { $match: { assigned: { $in: staffIds }, removed: false } },
      {
        $group: {
          _id:           '$assigned',
          customerCount: { $sum: 1 },
          activeCount:   { $sum: { $cond: [{ $eq: ['$status', 'active'] },    1, 0] } },
          defaultCount:  { $sum: { $cond: [{ $eq: ['$status', 'defaulted'] }, 1, 0] } },
        },
      },
    ]);

    const clientMap = {};
    clientAgg.forEach((row) => { clientMap[row._id.toString()] = row; });

    // 3. Aggregate repayments per staff via Client.assigned
    let repaymentMap = {};

    const repaymentAgg = await Repayment.aggregate([
      {
        $lookup: {
          from:         'clients',
          localField:   'client',
          foreignField: '_id',
          as:           'clientDoc',
        },
      },
      { $unwind: { path: '$clientDoc', preserveNullAndEmpty: false } },
      { $match: { 'clientDoc.assigned': { $in: staffIds } } },
      {
        $group: {
          _id: '$clientDoc.assigned',
          totalCollected: {
            $sum: {
              $cond: [
                { $in: ['$status', ['paid', 'late', 'PAID', 'LATE']] },
                { $ifNull: ['$amountPaid', 0] },
                0,
              ],
            },
          },
          monthCollected: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['paid', 'late', 'PAID', 'LATE']] },
                    { $gte: ['$paymentDate', monthStart] },
                    { $lte: ['$paymentDate', monthEnd] },
                  ],
                },
                { $ifNull: ['$amountPaid', 0] },
                0,
              ],
            },
          },
          totalPending: {
            $sum: {
              $cond: [
                { $not: { $in: ['$status', ['paid', 'late', 'PAID', 'LATE']] } },
                { $ifNull: ['$balance', 0] },
                0,
              ],
            },
          },
          overdueCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['default', 'DEFAULT']] }, 1, 0],
            },
          },
          totalRepayments: { $sum: 1 },
        },
      },
    ]);

    repaymentAgg.forEach((row) => { repaymentMap[row._id.toString()] = row; });

    // 4. Merge into per-staff result
    const staffWise = staffList.map((staff) => {
      const sid     = staff._id.toString();
      const clients = clientMap[sid]     || {};
      const reps    = repaymentMap[sid]  || {};

      const customerCount   = clients.customerCount  || 0;
      const activeCount     = clients.activeCount    || 0;
      const defaultCount    = clients.defaultCount   || 0;
      const totalCollected  = reps.totalCollected    || 0;
      const monthCollected  = reps.monthCollected    || 0;
      const totalPending    = reps.totalPending      || 0;
      const overdueCount    = reps.overdueCount      || 0;
      const totalRepayments = reps.totalRepayments   || 0;

      const efficiency =
        totalCollected + totalPending > 0
          ? Math.round((totalCollected / (totalCollected + totalPending)) * 100)
          : 0;

      return {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        customerCount,
        activeCount,
        defaultCount,
        totalCollected,
        monthCollected,
        totalPending,
        overdueCount,
        totalRepayments,
        efficiency,
      };
    });

    staffWise.sort((a, b) => b.totalCollected - a.totalCollected);

    return res.json({
      success: true,
      result: {
        staffWise,
        activeCount:  staffWise.filter((s) => s.customerCount > 0).length,
        topPerformer: staffWise[0]?.name || null,
      },
    });
  } catch (err) {
    console.error('[staff/performance]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.route('/staff/performance')
  .get(checkRole(['admin', 'owner']), catchErrors(staffPerformanceHandler));

module.exports = router;