const mongoose = require('mongoose');

const Payment = require('@/models/appModels/Payment');
const Repayment = require('@/models/appModels/Repayment');

const toObjectIds = (ids = []) =>
  ids
    .filter(Boolean)
    .map((id) =>
      mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(String(id)) : id
    );

const getPaymentMatch = ({ clientIds, from, to } = {}) => {
  const match = {
    removed: { $ne: true },
    reference: { $exists: true, $ne: null },
  };

  const normalizedIds = toObjectIds(clientIds);
  if (normalizedIds.length) {
    match.client = { $in: normalizedIds };
  }

  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;
  }

  return match;
};

const getRepaymentMatch = ({ clientIds, dueFrom, dueTo } = {}) => {
  const match = { removed: { $ne: true } };

  const normalizedIds = toObjectIds(clientIds);
  if (normalizedIds.length) {
    match.client = { $in: normalizedIds };
  }

  if (dueFrom || dueTo) {
    match.date = {};
    if (dueFrom) match.date.$gte = dueFrom;
    if (dueTo) match.date.$lte = dueTo;
  }

  return match;
};

const getCollectionTotals = async ({ clientIds, from, to } = {}) => {
  const [row] = await Payment.aggregate([
    { $match: getPaymentMatch({ clientIds, from, to }) },
    {
      $group: {
        _id: null,
        totalCollected: { $sum: '$amount' },
      },
    },
  ]);

  return { totalCollected: row?.totalCollected ?? 0 };
};

const getRepaymentTotals = async ({ clientIds, dueFrom, dueTo, today, upcoming } = {}) => {
  const [row] = await Repayment.aggregate([
    { $match: getRepaymentMatch({ clientIds, dueFrom, dueTo }) },
    {
      $group: {
        _id: null,
        pendingBalance: { $sum: '$balance' },
        totalExpected: { $sum: '$amount' },
        totalRepayments: { $sum: 1 },
        overdueCount: {
          $sum: {
            $cond: [{ $in: ['$status', ['default', 'late', 'DEFAULT', 'LATE']] }, 1, 0],
          },
        },
        upcomingCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  ...(today ? [{ $gte: ['$date', today] }] : []),
                  ...(upcoming ? [{ $lte: ['$date', upcoming] }] : []),
                  { $in: ['$status', ['not_started', 'partial', 'NOT_STARTED', 'PARTIAL']] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return {
    pendingBalance: row?.pendingBalance ?? 0,
    totalExpected: row?.totalExpected ?? 0,
    totalRepayments: row?.totalRepayments ?? 0,
    overdueCount: row?.overdueCount ?? 0,
    upcomingCount: row?.upcomingCount ?? 0,
  };
};

const getClientStatusSummary = async ({ clientIds } = {}) => {
  const normalizedIds = toObjectIds(clientIds);
  if (!normalizedIds.length) {
    return { total: 0, active: 0, completed: 0, defaulted: 0 };
  }

  const repaymentRows = await Repayment.aggregate([
    { $match: getRepaymentMatch({ clientIds: normalizedIds }) },
    {
      $group: {
        _id: '$client',
        totalRepayments: { $sum: 1 },
        settledRepayments: {
          $sum: {
            $cond: [{ $gte: ['$amountPaid', '$amount'] }, 1, 0],
          },
        },
        defaultRepayments: {
          $sum: {
            $cond: [{ $eq: ['$status', 'default'] }, 1, 0],
          },
        },
      },
    },
  ]);

  const repaymentMap = new Map(
    repaymentRows.map((row) => [String(row._id), row])
  );

  const summary = { total: normalizedIds.length, active: 0, completed: 0, defaulted: 0 };

  normalizedIds.forEach((clientId) => {
    const row = repaymentMap.get(String(clientId));

    if (!row || row.totalRepayments === 0) {
      summary.active += 1;
      return;
    }

    if (row.settledRepayments >= row.totalRepayments) {
      summary.completed += 1;
      return;
    }

    if (row.defaultRepayments > 0) {
      summary.defaulted += 1;
      return;
    }

    summary.active += 1;
  });

  return summary;
};

module.exports = {
  getCollectionTotals,
  getRepaymentTotals,
  getClientStatusSummary,
  getPaymentMatch,
  getRepaymentMatch,
};
