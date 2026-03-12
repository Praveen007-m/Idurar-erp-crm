const mongoose = require('mongoose');

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus === 'not-started' || normalizedStatus === 'not started') {
    return 'not_started';
  }

  if (normalizedStatus === 'late payment') {
    return 'late';
  }

  return normalizedStatus;
};

const computeBalance = (doc = {}) =>
  Math.max(0, normalizeNumber(doc.amount) - normalizeNumber(doc.amountPaid));

const computeStatus = (doc = {}) => {
  const today = new Date();
  const dueDate = doc.date ? new Date(doc.date) : new Date();
  const paidAmount = normalizeNumber(doc.amountPaid);
  const totalAmount = normalizeNumber(doc.amount);
  const paymentDate = doc.paymentDate || doc.paidDate || null;

  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  if (paidAmount >= totalAmount && totalAmount > 0) {
    if (paymentDate) {
      const normalizedPaymentDate = new Date(paymentDate);
      normalizedPaymentDate.setHours(0, 0, 0, 0);

      if (normalizedPaymentDate > dueDate) {
        return 'late';
      }
    }

    return 'paid';
  }

  if (paidAmount > 0) {
    return 'partial';
  }

  if (today > dueDate) {
    return 'default';
  }

  return 'not_started';
};

const repaymentSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    required: true,
    autopopulate: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  amount: {
    type: Number,
    required: true,
  },
  amountPaid: {
    type: Number,
    default: 0,
  },
  balance: {
    type: Number,
    default: 0,
  },
  remainingBalance: {
    type: Number,
  },
  principal: {
    type: Number,
    default: 0,
  },
  interest: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['paid', 'default', 'late', 'partial', 'not_started'],
    default: 'not_started',
  },
  paymentDate: {
    type: Date,
    default: null,
  },
  paidDate: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

repaymentSchema.pre('init', function (doc) {
  this._original = doc;
});

repaymentSchema.pre('save', function(next) {
  if (!this.isNew && this._original?.status === 'paid' && this.isModified()) {
    return next(new Error('Paid repayments cannot be modified'));
  }

  this.amountPaid = normalizeNumber(this.amountPaid);
  this.balance = computeBalance(this);
  this.remainingBalance = this.balance;
  this.status = computeStatus(this);

  if (this.paymentDate && !this.paidDate) {
    this.paidDate = this.paymentDate;
  }

  this.updated = new Date();
  next();
});

repaymentSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update = this.getUpdate() || {};
    const nextUpdate = update.$set ? { ...update.$set } : { ...update };
    const currentDocument = await this.model.findOne(this.getQuery()).lean();

    if (nextUpdate.paymentDate && !nextUpdate.paidDate) {
      nextUpdate.paidDate = nextUpdate.paymentDate;
    }

    const mergedUpdate = {
      ...(currentDocument || {}),
      ...nextUpdate,
    };

    if (normalizeStatus(currentDocument?.status) === 'paid') {
      return next(new Error('Paid repayments cannot be modified'));
    }

    mergedUpdate.amountPaid = normalizeNumber(mergedUpdate.amountPaid);
    mergedUpdate.balance = computeBalance(mergedUpdate);
    mergedUpdate.remainingBalance = mergedUpdate.balance;
    nextUpdate.amountPaid = mergedUpdate.amountPaid;
    nextUpdate.balance = mergedUpdate.balance;
    nextUpdate.remainingBalance = mergedUpdate.remainingBalance;
    nextUpdate.status = computeStatus(mergedUpdate);

    nextUpdate.updated = new Date();

    if (update.$set) {
      this.setUpdate({ ...update, $set: nextUpdate });
    } else {
      this.setUpdate(nextUpdate);
    }

    next();
  } catch (error) {
    next(error);
  }
});

repaymentSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Repayment', repaymentSchema);
module.exports.calculateStatus = computeStatus;
module.exports.computeStatus = computeStatus;
module.exports.computeBalance = computeBalance;
