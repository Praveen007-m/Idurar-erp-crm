const mongoose = require('mongoose');
const Client = require('@/models/appModels/Client');
const Repayment = require('@/models/appModels/Repayment');
const {
  getCollectionTotals,
  getRepaymentTotals,
  getClientStatusSummary,
  getRepaymentMatch,
} = require('@/utils/repaymentMetrics');

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const in7Days = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 59, 999);
  return d;
};

const endOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
};

const notRemoved = { removed: { $ne: true } };

const resolveStaffId = (req) => {
  const staffId = req.admin?._id || req.admin?.id || req.adminId;
  return mongoose.Types.ObjectId.isValid(staffId)
    ? new mongoose.Types.ObjectId(String(staffId))
    : null;
};

const getScopedClients = async (staffId = null) => {
  const query = staffId
    ? { ...notRemoved, assigned: staffId }
    : { ...notRemoved };

  return Client.find(query).select('_id').lean();
};

const getCustomerSummaryForClients = async (clients = []) =>
  getClientStatusSummary({ clientIds: clients.map((client) => client._id) });

const toDateRange = (from, to) => {
  if (!from || !to) return null;

  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return null;
  }

  return { fromDate, toDate };
};

const getDashboardPayload = async ({ clientIds = [] } = {}) => {
  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();
  const today = startOfToday();
  const upcoming = in7Days();

  const [collectionsAll, collectionsMonth, repaymentTotals] = await Promise.all([
    getCollectionTotals({ clientIds }),
    getCollectionTotals({ clientIds, from: monthStart, to: monthEnd }),
    getRepaymentTotals({ clientIds, today, upcoming }),
  ]);

  const totalCollected = collectionsAll.totalCollected;
  const monthCollected = collectionsMonth.totalCollected;
  const pendingAmount = repaymentTotals.pendingBalance;
  const totalExpected = repaymentTotals.totalExpected;
  const efficiency = totalExpected > 0
    ? +((totalCollected / totalExpected) * 100).toFixed(1)
    : 0;

  return {
    totalCollected,
    monthCollected,
    pendingAmount,
    overdueCount: repaymentTotals.overdueCount,
    upcomingCount: repaymentTotals.upcomingCount,
    totalRepayments: repaymentTotals.totalRepayments,
    totalExpected,
    efficiency,
  };
};

const adminDashboard = async (req, res) => {
  try {
    const clients = await getScopedClients();
    const clientIds = clients.map((client) => client._id);

    const [dashboardMetrics, customerSummary] = await Promise.all([
      getDashboardPayload({ clientIds }),
      getCustomerSummaryForClients(clients),
    ]);

    return res.status(200).json({
      success: true,
      result: {
        totalAssigned: customerSummary.total,
        totalCollected: dashboardMetrics.totalCollected,
        pendingAmount: dashboardMetrics.pendingAmount,
        monthCollected: dashboardMetrics.monthCollected,
        overdueCount: dashboardMetrics.overdueCount,
        upcomingCount: dashboardMetrics.upcomingCount,
        efficiency: dashboardMetrics.efficiency,
        totalRepayments: dashboardMetrics.totalRepayments,
        customerSummary,
      },
    });
  } catch (err) {
    console.error('[dashboardController.adminDashboard]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const staffDashboard = async (req, res) => {
  try {
    const staffId = resolveStaffId(req);
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'Invalid staff ID' });
    }

    const clients = await getScopedClients(staffId);
    const clientIds = clients.map((client) => client._id);

    if (!clientIds.length) {
      return res.status(200).json({
        success: true,
        result: {
          totalAssigned: 0,
          totalCollected: 0,
          pendingAmount: 0,
          monthCollected: 0,
          overdueCount: 0,
          upcomingCount: 0,
          performance: { efficiency: 0 },
          customerMetrics: { total: 0, active: 0, completed: 0, defaulted: 0 },
          collections: { totalCollected: 0, totalPending: 0, monthCollected: 0 },
          installments: { overdue: 0, upcoming: 0 },
        },
      });
    }

    const [dashboardMetrics, customerMetrics] = await Promise.all([
      getDashboardPayload({ clientIds }),
      getCustomerSummaryForClients(clients),
    ]);

    return res.status(200).json({
      success: true,
      result: {
        totalAssigned: customerMetrics.total,
        totalCollected: dashboardMetrics.totalCollected,
        pendingAmount: dashboardMetrics.pendingAmount,
        monthCollected: dashboardMetrics.monthCollected,
        overdueCount: dashboardMetrics.overdueCount,
        upcomingCount: dashboardMetrics.upcomingCount,
        performance: { efficiency: dashboardMetrics.efficiency },
        customerMetrics,
        collections: {
          totalCollected: dashboardMetrics.totalCollected,
          totalPending: dashboardMetrics.pendingAmount,
          monthCollected: dashboardMetrics.monthCollected,
        },
        installments: {
          overdue: dashboardMetrics.overdueCount,
          upcoming: dashboardMetrics.upcomingCount,
        },
      },
    });
  } catch (err) {
    console.error('[dashboardController.staffDashboard]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const reports = async (req, res) => {
  try {
    const staffId = req.admin?.role === 'staff' ? resolveStaffId(req) : null;
    const clients = await getScopedClients(staffId);
    const clientIds = clients.map((client) => client._id);
    const monthStart = startOfMonth();
    const monthEnd = endOfMonth();
    const range = toDateRange(req.query.from, req.query.to);

    const [collectionTotals, currentMonthCollections, pendingTotals, currentMonthPending, statusRows, planAnalytics] =
      await Promise.all([
        getCollectionTotals({ clientIds, from: range?.fromDate, to: range?.toDate }),
        getCollectionTotals({ clientIds, from: monthStart, to: monthEnd }),
        getRepaymentTotals({ clientIds, dueFrom: range?.fromDate, dueTo: range?.toDate }),
        getRepaymentTotals({ clientIds, dueFrom: monthStart, dueTo: monthEnd }),
        Repayment.aggregate([
          { $match: getRepaymentMatch({ clientIds, dueFrom: range?.fromDate, dueTo: range?.toDate }) },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              total: { $sum: '$amount' },
              paid: { $sum: '$amountPaid' },
              pending: { $sum: '$balance' },
            },
          },
          { $sort: { count: -1 } },
        ]),
        Repayment.aggregate([
          { $match: getRepaymentMatch({ clientIds, dueFrom: range?.fromDate, dueTo: range?.toDate }) },
          {
            $lookup: {
              from: 'clients',
              localField: 'client',
              foreignField: '_id',
              as: 'clientDoc',
            },
          },
          { $unwind: { path: '$clientDoc', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: { $ifNull: ['$clientDoc.repaymentType', 'Unknown'] },
              customers: { $addToSet: '$client' },
              scheduled: { $sum: '$amount' },
              pending: { $sum: '$balance' },
            },
          },
          {
            $project: {
              _id: 0,
              planGroup: '$_id',
              customers: { $size: '$customers' },
              collected: { $subtract: ['$scheduled', '$pending'] },
              pending: 1,
            },
          },
          { $sort: { customers: -1 } },
        ]),
      ]);

    const grandTotal = statusRows.reduce((sum, row) => sum + row.count, 0);
    const statusBreakdown = statusRows.map((row) => ({
      status: row._id,
      count: row.count,
      total: row.total,
      paid: row.paid,
      pending: row.pending,
      percentage: grandTotal > 0 ? +((row.count / grandTotal) * 100).toFixed(1) : 0,
    }));

    return res.status(200).json({
      success: true,
      result: {
        collections: {
          totalCollected: collectionTotals.totalCollected,
          totalPending: pendingTotals.pendingBalance,
          monthCollected: currentMonthCollections.totalCollected,
          monthPending: currentMonthPending.pendingBalance,
        },
        statusBreakdown,
        planWise: planAnalytics,
        dateRange: range ? { from: req.query.from, to: req.query.to } : null,
      },
    });
  } catch (err) {
    console.error('[dashboardController.reports]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const performanceSummary = async (req, res) => {
  try {
    const staffId = resolveStaffId(req);
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'Invalid staff ID' });
    }

    const clients = await getScopedClients(staffId);
    const clientIds = clients.map((client) => client._id);

    const [dashboardMetrics, customerMetrics] = await Promise.all([
      getDashboardPayload({ clientIds }),
      getCustomerSummaryForClients(clients),
    ]);

    const efficiencyLabel =
      dashboardMetrics.efficiency >= 90 ? 'Excellent' :
      dashboardMetrics.efficiency >= 70 ? 'Good' :
      dashboardMetrics.efficiency >= 50 ? 'Average' :
      'Needs Improvement';

    return res.status(200).json({
      success: true,
      result: {
        totalCollected: dashboardMetrics.totalCollected,
        pendingAmount: dashboardMetrics.pendingAmount,
        monthCollected: dashboardMetrics.monthCollected,
        efficiency: dashboardMetrics.efficiency,
        efficiencyLabel,
        activeCustomers: customerMetrics.active,
        fullyPaid: customerMetrics.completed,
        defaultedCount: customerMetrics.defaulted,
        upcomingCount: dashboardMetrics.upcomingCount,
        collections: {
          totalCollected: dashboardMetrics.totalCollected,
          totalPending: dashboardMetrics.pendingAmount,
          monthCollected: dashboardMetrics.monthCollected,
        },
        customerMetrics,
        installments: { upcoming: dashboardMetrics.upcomingCount },
        performance: { efficiency: dashboardMetrics.efficiency },
      },
    });
  } catch (err) {
    console.error('[dashboardController.performanceSummary]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const dashboardSummary = async (req, res) => {
  try {
    const [summary] = await Repayment.aggregate([
      { $match: { removed: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalGiven: { $sum: '$amount' },
          totalPending: { $sum: '$balance' },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      result: summary || { totalGiven: 0, totalPending: 0 },
    });
  } catch (err) {
    console.error('[dashboardController.dashboardSummary]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  adminDashboard,
  staffDashboard,
  reports,
  performanceSummary,
  dashboardSummary,
};
