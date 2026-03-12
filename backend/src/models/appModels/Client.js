const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },

  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
    set: (value) => value?.toString().replace(/\D/g, '').slice(0, 10),
    match: [/^[6-9]\d{9}$/, 'Invalid mobile number'],
  },
  country: String,
  address: String,
  email: String,
  loanAmount: {
    type: Number,
    required: true,
  },
  interestRate: {
    type: Number,
    required: true,
  },
  term: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    validate: {
      validator: function (value) {
        if (!value || !this.startDate) return true;
        return value > this.startDate;
      },
      message: 'Ending Date must be after Start Date',
    },
  },
  repaymentType: {
    type: String,
    enum: ['Monthly EMI', 'Weekly', 'Daily'],
    required: true,
  },
  interestType: {
    type: String,
    enum: ['reducing', 'flat'],
    default: 'reducing',
  },
  status: {
    type: String,
    enum: ['active', 'paid', 'defaulted'],
    default: 'active',
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  assigned: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Client', schema);
