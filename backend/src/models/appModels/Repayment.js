const mongoose = require('mongoose');

/**
 * Helper function to calculate payment status based on payment details
 * @param {Number} paidAmount - The amount that has been paid
 * @param {Number} installmentAmount - The total installment amount due
 * @param {Date} dueDate - The due date of the installment
 * @param {Date} paidDate - The date when payment was made (optional)
 * @returns {String} paymentStatus - one of: paid, late, partial, default, not_started
 */
const calculatePaymentStatus = (paidAmount, installmentAmount, dueDate, paidDate = null) => {
  const today = new Date();
  const due = new Date(dueDate);
  
  // Set times to midnight for date-only comparison
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  // If paidAmount equals or exceeds installmentAmount
  if (paidAmount >= installmentAmount) {
    // Check if paid after due date
    if (paidDate) {
      const paid = new Date(paidDate);
      paid.setHours(0, 0, 0, 0);
      if (paid > due) {
        return 'late';
      }
    }
    return 'paid';
  }

  // If paidAmount is greater than 0 but less than installmentAmount (partial payment)
  if (paidAmount > 0 && paidAmount < installmentAmount) {
    return 'partial';
  }

  // If paidAmount is 0
  if (paidAmount === 0) {
    // Check if due date has passed
    if (today > due) {
      return 'default';
    }
    // If due date is in the future
    return 'not_started';
  }

  // Default fallback
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
  principal: {
    type: Number,
    default: 0,
  },
  interest: {
    type: Number,
    default: 0,
  },
  // Status field - now using consistent values
  status: {
    type: String,
    enum: ['paid', 'late', 'partial', 'default', 'not_started'],
    default: 'not_started',
  },
  // New paymentStatus field with more granular statuses
  paymentStatus: {
    type: String,
    enum: ['paid', 'late', 'partial', 'default', 'not_started'],
    default: 'not_started',
  },
  // Track the date when payment was made
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

// Middleware to auto-calculate paymentStatus before saving
// Only auto-calculate if status is NOT manually set (empty/null)
repaymentSchema.pre('save', function(next) {
  const paidAmount = this.amount || 0;
  const installmentAmount = this.amount || 0;
  
  // Calculate paymentStatus based on payment details
  this.paymentStatus = calculatePaymentStatus(
    paidAmount,
    installmentAmount,
    this.date,
    this.paidDate
  );

  // Only auto-calculate status if it's empty or null (manual override)
  // If status was manually set, preserve it
  if (!this.status) {
    this.status = this.paymentStatus;
  }

  this.updated = new Date();
  next();
});

// Also handle findOneAndUpdate to preserve manually set status
repaymentSchema.pre('findOneAndUpdate', function(next) {
  // Get the update object
  const update = this.getUpdate();
  
  // If status OR paymentStatus is being explicitly set in the update, don't override
  // We only calculate if neither is in the update
  if (update.status === undefined && update.paymentStatus === undefined) {
    const paidAmount = update.amount || 0;
    const installmentAmount = update.amount || update.installmentAmount || 0;
    
    // Get the date from update or use current
    const date = update.date ? new Date(update.date) : new Date();
    const paidDate = update.paidDate ? new Date(update.paidDate) : null;
    
    // Calculate and set status only if not manually set
    const calculatedStatus = calculatePaymentStatus(
      paidAmount,
      installmentAmount,
      date,
      paidDate
    );
    
    this.set({ paymentStatus: calculatedStatus });
  }
  
  this.set({ updated: new Date() });
  next();
});

repaymentSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Repayment', repaymentSchema);
module.exports.calculatePaymentStatus = calculatePaymentStatus;
