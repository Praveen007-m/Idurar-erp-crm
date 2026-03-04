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
  phone: String,
  country: String,
  address: String,
  email: String,
  loanAmount: {
    type: Number,
  },
  interestRate: {
    type: Number,
  },
  term: {
    type: String,
  },
  startDate: {
    type: Date,
  },
  repaymentType: {
    type: String,
    enum: ['Monthly EMI', 'Weekly', 'Daily'],
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
