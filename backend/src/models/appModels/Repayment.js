const mongoose = require('mongoose');

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
  status: {
    type: String,
    enum: ['paid', 'not-paid', 'late payment'],
    default: 'not-paid',
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

repaymentSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Repayment', repaymentSchema);
