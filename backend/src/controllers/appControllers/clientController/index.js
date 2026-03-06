const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

const summary = require('./summary');
const generateInstallments = require('./generateInstallments');

function modelController() {
  const Model = mongoose.model('Client');
  const methods = createCRUDController('Client');

  methods.update = async (req, res) => {
    try {
      const result = await Model.findOneAndUpdate(
        { _id: req.params.id, removed: false },
        req.body,
        { new: true, runValidators: true }
      ).exec();

      if (!result) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'No document found ',
        });
      }

      // Check if loan-related fields changed
      const loanFieldsChanged = ['loanAmount', 'interestRate', 'term', 'startDate', 'repaymentType', 'interestType'].some(
        (field) => req.body[field] !== undefined
      );

      if (loanFieldsChanged) {
        // Delete existing unpaid installments and regenerate
        const Repayment = mongoose.model('Repayment');
        await Repayment.deleteMany({ client: result._id, status: 'not-paid' });
        await generateInstallments(result);
      }

      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully updated Client and regenerated installments if needed',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        result: null,
        message: 'Oops there is an Error',
        error: err,
      });
    }
  };

  methods.delete = async (req, res) => {
    try {
      const result = await Model.findOneAndUpdate(
        { _id: req.params.id, removed: false },
        { removed: true },
        { new: true }
      ).exec();

      if (!result) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'No document found ',
        });
      }

      // Soft delete associated repayments
      const Repayment = mongoose.model('Repayment');
      await Repayment.updateMany({ client: result._id }, { removed: true });

      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully deleted Client and associated repayments',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        result: null,
        message: 'Oops there is an Error',
        error: err,
      });
    }
  };

  methods.summary = (req, res) => summary(Model, req, res);
  return methods;
}

module.exports = modelController();
