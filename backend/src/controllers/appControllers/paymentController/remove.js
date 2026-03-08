const mongoose = require('mongoose');
const { getStaffClientIds } = require('@/helpers/staffFilter');

const Model = mongoose.model('Payment');
const Invoice = mongoose.model('Invoice');

const remove = async (req, res) => {
  // Build staff filter for payment lookup
  let staffFilter = {};
  if (req.admin && req.admin.role === 'staff') {
    const clientIds = await getStaffClientIds(req.admin);
    if (!clientIds || clientIds.length === 0) {
      return res.status(403).json({
        success: false,
        result: null,
        message: 'You do not have permission to delete payments',
      });
    }
    // Get invoices belonging to these clients
    const invoices = await Invoice.find({
      client: { $in: clientIds },
      removed: false,
    }).select('_id');
    const invoiceIds = invoices.map((inv) => inv._id);
    staffFilter = { invoice: { $in: invoiceIds } };
  }

  // Find document by id and updates with the required fields
  const previousPayment = await Model.findOne({
    _id: req.params.id,
    removed: false,
    ...staffFilter,
  });

  if (!previousPayment) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  }

  const { _id: paymentId, amount: previousAmount } = previousPayment;
  const { id: invoiceId, total, discount, credit: previousCredit } = previousPayment.invoice;

  // Find the document by id and delete it
  let updates = {
    removed: true,
  };
  // Find the document by id and delete it
  const result = await Model.findOneAndUpdate(
    { _id: req.params.id, removed: false },
    { $set: updates },
    {
      new: true, // return the new result instead of the old one
    }
  ).exec();
  // If no results found, return document not found

  let paymentStatus =
    total - discount === previousCredit - previousAmount
      ? 'paid'
      : previousCredit - previousAmount > 0
      ? 'partially'
      : 'unpaid';

  const updateInvoice = await Invoice.findOneAndUpdate(
    { _id: invoiceId },
    {
      $pull: {
        payment: paymentId,
      },
      $inc: { credit: -previousAmount },
      $set: {
        paymentStatus: paymentStatus,
      },
    },
    {
      new: true, // return the new result instead of the old one
    }
  ).exec();

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Deleted the document ',
  });
};
module.exports = remove;
