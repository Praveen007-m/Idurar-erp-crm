const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

const summary = require('./summary');
const generateInstallments = require('./generateInstallments');

function modelController() {
  const Model = mongoose.model('Client');
  const methods = createCRUDController('Client');

  methods.create = async (req, res) => {
    try {

      // If logged in user is staff assign client automatically
      if (req.admin.role === "staff") {
        req.body.assigned = req.admin._id;
      } else if (!req.body.assigned) {
        req.body.assigned = req.admin._id;
      }

      const result = await Model.create(req.body);

      // Generate installments automatically
      await generateInstallments(result);

      return res.status(200).json({
        success: true,
        result,
        message: "Successfully created Client",
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        result: null,
        message: "Error creating Client",
        error: err,
      });
    }
  };

  methods.list = async (req, res) => {
    try {

      let filter = { removed: false };

      if (req.admin.role === "staff") {
        filter.assigned = req.admin._id;
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.items) || 10;
      const skip = (page - 1) * limit;

      const result = await Model.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ created: -1 })
        .exec();

      const count = await Model.countDocuments(filter);

      return res.status(200).json({
        success: true,
        result: result,
        pagination: {
          page,
          pages: Math.ceil(count / limit),
          count,
        },
        message: "Successfully fetched Clients",
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        result: null,
        message: "Error fetching Clients",
        error: err,
      });
    }
  };

  methods.update = async (req, res) => {
    try {
      let filter = { _id: req.params.id, removed: false };

      if (req.admin.role === "staff") {
        filter.assigned = req.admin._id;
      }

      const result = await Model.findOneAndUpdate(filter, req.body, {
        new: true,
        runValidators: true,
      }).exec();

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
      let filter = { _id: req.params.id, removed: false };

      if (req.admin.role === "staff") {
        filter.assigned = req.admin._id;
      }

      const result = await Model.findOneAndUpdate(
        filter,
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
