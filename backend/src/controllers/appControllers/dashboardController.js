const mongoose = require('mongoose');
const Client = mongoose.model('Client');
const Repayment = mongoose.model('Repayment');
const Payment = mongoose.model('Payment');
const Admin = mongoose.model('Admin');
const getPlanCode = require('@/utils/getPlanCode');
const deriveClientStatus = require('@/utils/deriveClientStatus');

// Admin Dashboard - Global metrics
const adminDashboard = async (req, res) => {
  try {
    if (!['owner', 'admin'].includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Customer metrics - use Client.status as fallback, derive if needed
    const clients = await Client.aggregate([
      { $match: { removed: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const customerMetrics = {
      total: await Client.countDocuments({ removed: false }),
      active: 0, completed: 0, defaulted: 0, not_started: 0
    };
    clients.forEach(c => {
      if (c._id === 'active') customerMetrics.active = c.count;
      if (c._id === 'paid') customerMetrics.completed = c.count;
      if (c._id === 'defaulted') customerMetrics.defaulted = c.count;
    });

    // Collections
const paymentsAll = await Repayment.aggregate([
      { $match: { removed: false } },
      { $group: { _id: null, totalCollected: { $sum: '$amountPaid' } } }
    ]);
    const paymentsMonth = await Repayment.aggregate([
      { $match: { removed: false, date: { $gte: monthStart } } },
      { $group: { _id: null, monthCollected: { $sum: '$amountPaid' } } }
    ]);

    // Pending (unpaid balances)
    const pendingAll = await Repayment.aggregate([
      { $match: { removed: false, status: { $nin: ['paid'] } } },
      { $group: { _id: null, totalPending: { $sum: '$balance' } } }
    ]);
    const pendingMonth = await Repayment.aggregate([
      { $match: { removed: false, status: { $nin: ['paid'] }, date: { $gte: monthStart } } },
      { $group: { _id: null, monthPending: { $sum: '$balance' } } }
    ]);

    // Status breakdown
    const statusBreak = await Repayment.aggregate([
      { $match: { removed: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $group: {
        _id: null,
        total: { $sum: '$count' },
        statuses: { $push: { status: '$_id', count: '$count' } }
      } },
      { $project: {
        statuses: { $map: {
          input: '$statuses',
          as: 's',
          in: {
            status: '$$s.status',
            count: '$$s.count',
            percentage: { $round: [{ $multiply: [{ $divide: ['$$s.count', '$total'] }, 100] }, 1] }
          }
        } }
      } }
    ]);

    // Plan-wise - simple query + map
    const clientsForPlans = await Client.find({ removed: false }).lean();
    const planWise = {};
    clientsForPlans.forEach(c => {
      const plan = getPlanCode(c.repaymentType, c.term);
      if (!planWise[plan]) planWise[plan] = { customerCount: 0, collected: 0, pending: 0 };
      planWise[plan].customerCount += 1;
    });
    // Collected/pending per plan - simplified (full agg complex, use basic for now)
    // TODO: Optimize with facet if needed

    // Staff-wise
    const staffClients = await Client.aggregate([
      { $match: { removed: false, assigned: { $ne: null } } },
      { $group: { _id: '$assigned', customerCount: { $sum: 1 }, clients: { $addToSet: '$_id' } } },
      {
        $lookup: {
          from: 'admins',
          localField: '_id',
          foreignField: '_id',
          as: 'staff',
          pipeline: [{ $project: { name: 1 } }]
        }
      }
    ]);

    const staffWise = await Promise.all(staffClients.map(async (s) => {
      const collectedAgg = await Repayment.aggregate([
        { $match: { removed: false, client: { $in: s.clients } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]);
      const pendingAgg = await Repayment.aggregate([
        { $match: { removed: false, client: { $in: s.clients }, status: { $nin: ['paid'] } } },
        { $group: { _id: null, total: { $sum: '$balance' } } }
      ]);

      return {
        name: s.staff[0]?.name || 'Unknown',
        customerCount: s.customerCount,
        collected: collectedAgg[0]?.total || 0,
        pending: pendingAgg[0]?.total || 0
      };
    }));
    staffWise.sort((a, b) => b.collected - a.collected);

    res.json({
      success: true,
      result: {
        customerMetrics,
        collections: {
          totalCollected: paymentsAll[0]?.totalCollected || 0,
          monthCollected: paymentsMonth[0]?.monthCollected || 0,
          totalPending: pendingAll[0]?.totalPending || 0,
          monthPending: pendingMonth[0]?.monthPending || 0
        },
        statusBreakdown: statusBreak[0]?.statuses || [],
        planWise: Object.values(planWise),
        staffWise
      }
    });
  } catch (error) {
    console.error('[adminDashboard]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Staff Dashboard - Personal metrics
const staffDashboard = async (req, res) => {
  try {
    const staffId = req.admin._id;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Assigned customers
    const customerMetrics = {
      total: await Client.countDocuments({ removed: false, assigned: staffId }),
      active: 0, completed: 0, defaulted: 0
    };
    const staffClients = await Client.find({ removed: false, assigned: staffId }).lean();
    const clientIds = staffClients.map(c => c._id);

    // Aggregate customer statuses instead of N+1
    const statusAgg = await Repayment.aggregate([
      { $match: { removed: false, client: { $in: clientIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    const statusCounts = statusAgg.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, { active: 0, completed: 0, defaulted: 0 });
    customerMetrics.active = statusCounts.active || 0;
    customerMetrics.completed = statusCounts.paid || statusCounts.completed || 0;
    customerMetrics.defaulted = statusCounts.default || statusCounts.late || statusCounts.defaulted || 0;

    if (clientIds.length === 0) {
      return res.json({
        success: true,
        result: {
          customerMetrics,
          collections: { totalCollected: 0, monthCollected: 0, totalPending: 0 },
          installments: { overdue: 0, upcoming: 0 },
          performance: { efficiency: 0 }
        }
      });
    }

    // Collections
    const totalCollected = await Repayment.aggregate([
      { $match: { removed: false, client: { $in: clientIds } } },
      { $group: { _id: null, totalCollected: { $sum: '$amountPaid' } } }
    ]);
    const monthCollected = await Repayment.aggregate([
      { $match: { removed: false, client: { $in: clientIds }, date: { $gte: monthStart } } },
      { $group: { _id: null, monthCollected: { $sum: '$amountPaid' } } }
    ]);

    // Pending
    const totalPending = await Repayment.aggregate([
      { $match: { removed: false, client: { $in: clientIds }, status: { $nin: ['paid'] } } },
      { $group: { _id: null, totalPending: { $sum: '$balance' } } }
    ]);

    // Installments
    const overdueCount = await Repayment.countDocuments({
      removed: false,
      client: { $in: clientIds },
      status: { $in: ['default', 'late'] }
    });
    const upcomingCount = await Repayment.countDocuments({
      removed: false,
      client: { $in: clientIds },
      status: { $nin: ['paid'] },
      date: { $gte: now, $lte: next7Days }
    });

    // Efficiency
    const repayStats = await Repayment.aggregate([
      { $match: { removed: false, client: { $in: clientIds } } },
      { $group: { _id: null, collected: { $sum: '$amountPaid' }, expected: { $sum: '$amount' } } }
    ]);
    const efficiency = repayStats[0] && repayStats[0].expected > 0 ? Math.round((repayStats[0].collected / repayStats[0].expected) * 100) : 0;

    res.json({
      success: true,
      result: {
        customerMetrics,
        collections: {
          totalCollected: totalCollected[0]?.totalCollected || 0,
          monthCollected: monthCollected[0]?.monthCollected || 0,
          totalPending: totalPending[0]?.totalPending || 0
        },
        installments: { overdue: overdueCount, upcoming: upcomingCount },
        performance: { efficiency }
      }
    });
  } catch (error) {
    console.error('[staffDashboard]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Collection Reports - Pure Finance Data
const reports = async (req, res) => {
  try {
    const isAdmin = ['owner', 'admin'].includes(req.admin.role);
    const staffId = req.admin._id;

    // Base filter for clients
    let clientFilter = { removed: false };
    if (!isAdmin) {
      clientFilter.assigned = staffId;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get relevant clients
    const clients = await Client.find(clientFilter).lean();
    const clientIds = clients.map(c => c._id);

    if (clientIds.length === 0) {
      return res.json({
        success: true,
        result: {
          totalCollected: 0,
          totalPending: 0,
          monthCollected: 0,
          monthPending: 0,
          statusBreakdown: [],
          planWise: []
        }
      });
    }

    // Collections (Payments)
    const totalCollectedAgg = await Repayment.aggregate([
      { $match: { removed: false, client: { $in: clientIds } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]);
    const monthCollectedAgg = await Repayment.aggregate([
      { $match: { removed: false, client: { $in: clientIds }, date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]);

    // Pending (Repayments)
    const totalPendingAgg = await Repayment.aggregate([
      { $match: { removed: false, client: { $in: clientIds }, status: { $ne: 'paid' } } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);
    const monthPendingAgg = await Repayment.aggregate([
      { $match: { removed: false, client: { $in: clientIds }, status: { $ne: 'paid' }, date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);

    // Status Breakdown (Repayments)
    const statusBreakAgg = await Repayment.aggregate([
      { $match: { removed: false, client: { $in: clientIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' },
          statuses: { $push: { status: '$_id', count: '$count' } }
        }
      },
      {
        $project: {
          statuses: {
            $map: {
              input: '$statuses',
              as: 's',
              in: {
                status: '$$s.status',
                count: '$$s.count',
                percentage: { 
                  $cond: [
                    { $eq: ['$total', 0] }, 
                    0, 
                    { $round: [{ $multiply: [{ $divide: ['$$s.count', '$total'] }, 100] }, 1] }
                  ]
                }
              }
            }
          }
        }
      }
    ]);

    // Plan-wise Analytics (Clients)
    const planWiseMap = {};
    clients.forEach(c => {
      const plan = getPlanCode(c.repaymentType, c.term);
      if (!planWiseMap[plan]) {
        planWiseMap[plan] = { plan, customerCount: 0 };
      }
      planWiseMap[plan].customerCount += 1;
    });

    res.json({
      success: true,
      result: {
        collections: {
          totalCollected: totalCollectedAgg[0]?.total || 0,
          totalPending: totalPendingAgg[0]?.total || 0,
          monthCollected: monthCollectedAgg[0]?.total || 0,
          monthPending: monthPendingAgg[0]?.total || 0
        },
        statusBreakdown: statusBreakAgg[0]?.statuses || [],
        planWise: Object.values(planWiseMap).sort((a, b) => b.customerCount - a.customerCount)
      }
    });

  } catch (error) {
    console.error('[reports]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { adminDashboard, staffDashboard, reports };

