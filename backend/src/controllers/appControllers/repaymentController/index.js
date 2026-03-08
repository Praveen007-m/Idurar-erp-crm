const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const { buildStaffFilter } = require('@/helpers/staffFilter');

function modelController() {
  const Model = mongoose.model('Repayment');
  const methods = createCRUDController('Repayment');

  // Override list method with staff filtering
  methods.list = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.items) || 10;
      const skip = page * limit - limit;

      const { sortBy = 'date', sortValue = -1, filter, equal } = req.query;

      // Build staff filter
      const staffFilter = await buildStaffFilter(req.admin, 'client');

      const fieldsArray = req.query.fields ? req.query.fields.split(',') : [];

      let fields;
      fields = fieldsArray.length === 0 ? {} : { $or: [] };

      for (const field of fieldsArray) {
        fields.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
      }

      // Query the database for a list of all results
      const resultsPromise = Model.find({
        removed: false,
        ...staffFilter,
        [filter]: equal,
        ...fields,
      })
        .skip(skip)
        .limit(limit)
        .sort({ [sortBy]: sortValue })
        .populate()
        .exec();

      // Counting the total documents
      const countPromise = Model.countDocuments({
        removed: false,
        ...staffFilter,
        [filter]: equal,
        ...fields,
      });

      // Resolving both promises
      const [result, count] = await Promise.all([resultsPromise, countPromise]);

      // Calculating total pages
      const pages = Math.ceil(count / limit);

      // Getting Pagination Object
      const pagination = { page, pages, count };
      if (count > 0) {
        return res.status(200).json({
          success: true,
          result,
          pagination,
          message: 'Successfully found all documents',
        });
      } else {
        return res.status(203).json({
          success: true,
          result: [],
          pagination,
          message: 'Collection is Empty',
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
        error: error,
      });
    }
  };

  // Override create method to ensure staff can only create repayments for their clients
  methods.create = async (req, res) => {
    try {
      // Build staff filter to validate client access
      const staffFilter = await buildStaffFilter(req.admin, 'client');
      
      // If staff, verify the client is assigned to them
      if (req.admin.role === 'staff' && req.body.client) {
        const clientIds = await mongoose.model('Client').find({
          assigned: req.admin._id,
          removed: false
        }).select('_id');
        
        const clientIdStrings = clientIds.map(id => id.toString());
        if (!clientIdStrings.includes(req.body.client.toString())) {
          return res.status(403).json({
            success: false,
            result: null,
            message: 'You can only create repayments for your assigned clients',
          });
        }
      }

      // Check for duplicate repayment - prevent creating multiple repayments for same client and date
      if (req.body.client && req.body.date) {
        const repaymentDate = new Date(req.body.date);
        // Normalize to start of day for comparison
        repaymentDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(repaymentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const existingRepayment = await Model.findOne({
          client: req.body.client,
          date: {
            $gte: repaymentDate,
            $lt: nextDay
          },
          removed: false
        });
        
        if (existingRepayment) {
          return res.status(400).json({
            success: false,
            result: null,
            message: 'A repayment already exists for this client on this date',
          });
        }
      }

      const result = await Model.create(req.body);
      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully created Repayment',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
        error: error,
      });
    }
  };

  // Override update method with staff filtering
  methods.update = async (req, res) => {
    try {
      // Build staff filter
      const staffFilter = await buildStaffFilter(req.admin, 'client');

      // Find the existing repayment first
      const existingRepayment = await Model.findOne({
        _id: req.params.id,
        removed: false,
        ...staffFilter,
      }).populate('client').exec();

      if (!existingRepayment) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'No document found',
        });
      }

      // If updating date or client, find and update all duplicates
      const { date, client } = req.body;
      
      if (date || client) {
        const newDate = date ? new Date(date) : existingRepayment.date;
        const newClient = client || existingRepayment.client._id;

        // Find all repayments with the same date and client
        const duplicates = await Model.find({
          _id: { $ne: req.params.id },
          client: newClient,
          date: {
            $gte: new Date(newDate.setHours(0, 0, 0, 0)),
            $lt: new Date(new Date(newDate).setHours(23, 59, 59, 999))
          },
          removed: false,
        });

        // Update all duplicates with the new values
        const updateData = { ...req.body, updated: new Date() };
        if (duplicates.length > 0) {
          const duplicateIds = duplicates.map(d => d._id);
          await Model.updateMany(
            { _id: { $in: duplicateIds } },
            updateData
          );
        }
      }

      const result = await Model.findOneAndUpdate(
        {
          _id: req.params.id,
          removed: false,
          ...staffFilter,
        },
        { 
          ...req.body,
          updated: new Date() 
        },
        {
          new: true,
          runValidators: true,
        }
      ).populate().exec();

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
        message: 'Successfully updated Repayment',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
        error: error,
      });
    }
  };

  // Override delete method with staff filtering
  methods.delete = async (req, res) => {
    try {
      // Build staff filter
      const staffFilter = await buildStaffFilter(req.admin, 'client');

      const result = await Model.findOneAndUpdate(
        {
          _id: req.params.id,
          removed: false,
          ...staffFilter,
        },
        { removed: true },
        { new: true }
      ).exec();

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
        message: 'Successfully deleted Repayment',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
        error: error,
      });
    }
  };

  // Override read method with staff filtering
  methods.read = async (req, res) => {
    try {
      // Build staff filter
      const staffFilter = await buildStaffFilter(req.admin, 'client');

      const result = await Model.findOne({
        _id: req.params.id,
        removed: false,
        ...staffFilter,
      }).populate().exec();

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
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
        error: error,
      });
    }
  };

  return methods;
}

module.exports = modelController();

