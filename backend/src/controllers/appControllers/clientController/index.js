const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

const summary = require('./summary');
const generateInstallments = require('./generateInstallments');

const calculateClientEndDate = ({ startDate, term, repaymentType }) => {
  const normalizedStart = new Date(startDate);
  const parsedTerm = Number.parseInt(term, 10);

  if (Number.isNaN(normalizedStart.getTime())) {
    throw new Error('Invalid startDate');
  }

  if (!Number.isFinite(parsedTerm) || parsedTerm <= 0) {
    throw new Error('Invalid term');
  }

  const normalizedRepaymentType = String(repaymentType || '').toLowerCase();
  const endDate = new Date(normalizedStart);

  if (normalizedRepaymentType === 'weekly') {
    endDate.setDate(endDate.getDate() + parsedTerm * 7);
  } else if (normalizedRepaymentType === 'daily') {
    endDate.setDate(endDate.getDate() + parsedTerm);
  } else if (normalizedRepaymentType === 'monthly emi' || normalizedRepaymentType === 'monthly') {
    endDate.setMonth(endDate.getMonth() + parsedTerm);
  } else {
    throw new Error('Invalid repaymentType');
  }

  if (endDate <= normalizedStart) {
    throw new Error('Ending Date must be after Start Date');
  }

  return endDate;
};

function modelController() {
  const Model = mongoose.model('Client');
  const methods = createCRUDController('Client');

  methods.create = async (req, res) => {
    try {
      if (req.admin.role === "staff") {
        return res.status(403).json({
          success: false,
          result: null,
          message: "Permission denied: Staff cannot create customers",
        });
      }

      delete req.body.endDate;

      if (!req.body.assigned) {
        req.body.assigned = req.admin._id;
      }

      try {
        req.body.endDate = calculateClientEndDate({
          startDate: req.body.startDate,
          term: req.body.term,
          repaymentType: req.body.repaymentType,
        });
      } catch (validationError) {
        return res.status(422).json({
          success: false,
          result: null,
          message: validationError.message,
        });
      }

      const result = await Model.create(req.body);

      // Generate installments automatically (non-blocking)
      // We use a separate try/catch so that if installment generation fails,
      // the client creation still succeeds and returns 200
      try {
        console.log('[Client Create] Generating installments for client:', result._id);
        console.log('[Client Create] Client loan details:', {
          loanAmount: result.loanAmount,
          interestRate: result.interestRate,
          term: result.term,
          startDate: result.startDate,
          repaymentType: result.repaymentType,
          interestType: result.interestType
        });
        
        await generateInstallments(result);
        console.log('[Client Create] Installments generated successfully');
      } catch (installmentError) {
        // Log the error but don't fail the client creation
        console.error('[Client Create] Error generating installments:', installmentError.message);
        console.error('[Client Create] Stack trace:', installmentError.stack);
      }

      // Convert Mongoose document to plain object to avoid circular references
      const clientData = result.toObject();

      return res.status(200).json({
        success: true,
        result: clientData,
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
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.items, 10) || 10;
      const skip = page * limit - limit;
      const { sortBy = 'created', sortValue = -1, filter, equal, q, fields } = req.query;

      const fieldsArray = fields ? fields.split(',') : [];
      let searchFields = fieldsArray.length === 0 ? {} : { $or: [] };

      if (q) {
        for (const field of fieldsArray) {
          searchFields.$or.push({ [field]: { $regex: new RegExp(q, 'i') } });
        }
      }

      let filterQuery = {
        removed: false,
        ...searchFields,
      };

      if (filter && equal) {
        filterQuery[filter] = equal;
      }

      if (req.admin.role === "staff") {
        filterQuery.assigned = req.admin._id;
      }

      const resultsPromise = Model.find(filterQuery)
        .populate('assigned', 'name email role')
        .skip(skip)
        .limit(limit)
        .sort({ [sortBy]: sortValue })
        .exec();

      const countPromise = Model.countDocuments(filterQuery);

      const [result, count] = await Promise.all([resultsPromise, countPromise]);
      const pages = Math.ceil(count / limit);
      const pagination = { page, pages, count };

      if (count > 0) {
        return res.status(200).json({
          success: true,
          result,
          pagination,
          message: 'Successfully fetched Clients',
        });
      }

      return res.status(203).json({
        success: true,
        result: [],
        pagination,
        message: 'Collection is Empty',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        result: null,
        message: 'Error fetching Clients',
        error: err,
      });
    }
  };

  methods.update = async (req, res) => {
    try {
      if (req.admin.role === "staff") {
        return res.status(403).json({
          success: false,
          result: null,
          message: "Permission denied: Staff cannot update customers",
        });
      }

      let filter = { _id: req.params.id, removed: false };

      delete req.body.endDate;

      const existingClient = await Model.findOne(filter).exec();

      if (!existingClient) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'No document found ',
        });
      }

      const loanFieldsChanged = ['loanAmount', 'interestRate', 'term', 'startDate', 'repaymentType', 'interestType'].some(
        (field) => req.body[field] !== undefined
      );

      const shouldRecalculateEndDate =
        req.body.term !== undefined ||
        req.body.startDate !== undefined ||
        req.body.repaymentType !== undefined ||
        !existingClient.endDate;

      if (shouldRecalculateEndDate) {
        const payloadWithExisting = {
          ...existingClient.toObject(),
          ...req.body,
        };

        try {
          req.body.endDate = calculateClientEndDate({
            startDate: payloadWithExisting.startDate,
            term: payloadWithExisting.term,
            repaymentType: payloadWithExisting.repaymentType,
          });
        } catch (validationError) {
          return res.status(422).json({
            success: false,
            result: null,
            message: validationError.message,
          });
        }
      }

      const result = await Model.findOneAndUpdate(filter, req.body, {
        new: true,
        runValidators: true,
      }).populate('assigned', 'name email').exec();

      if (loanFieldsChanged) {
        // Delete existing unpaid installments and regenerate
        const Repayment = mongoose.model('Repayment');
        await Repayment.deleteMany({ client: result._id, status: 'default' });
        // Non-blocking installment generation
        try {
          await generateInstallments(result);
        } catch (installmentError) {
          console.error('Error regenerating installments:', installmentError.message);
        }
      }

      // Convert to plain object to avoid circular references
      const clientData = result.toObject();

      return res.status(200).json({
        success: true,
        result: clientData,
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
      if (req.admin.role === "staff") {
        return res.status(403).json({
          success: false,
          result: null,
          message: "Permission denied: Staff cannot delete customers",
        });
      }

      let filter = { _id: req.params.id, removed: false };

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

      // Convert to plain object to avoid circular references
      const deletedData = result.toObject();

      return res.status(200).json({
        success: true,
        result: deletedData,
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

  methods.read = async (req, res) => {
    try {
      let filter = { _id: req.params.id, removed: false };

      if (req.admin.role === "staff") {
        filter.assigned = req.admin._id;
      }

      const result = await Model.findOne(filter)
        .populate('assigned', 'name email role')
        .exec();

      if (!result) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'No document found',
        });
      }

      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully found document',
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
