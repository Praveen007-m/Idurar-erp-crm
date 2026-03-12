const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const { buildStaffFilter } = require('@/helpers/staffFilter');
const customPdf = require('@/controllers/pdfController');

const create = require('./create');
const summary = require('./summary');
const update = require('./update');
const remove = require('./remove');
const sendMail = require('./sendMail');

function modelController() {
  const Model = mongoose.model('Payment');
  const methods = createCRUDController('Payment');

  // Override list method with staff filtering
  methods.list = async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.items, 10) || 10;
      const skip = page * limit - limit;

      const { sortBy = 'created', sortValue = -1, filter, equal } = req.query;

      const staffFilter = await buildStaffFilter(req.admin, 'client');
      const fieldsArray = req.query.fields ? req.query.fields.split(',') : [];

      let fields = fieldsArray.length === 0 ? {} : { $or: [] };

      for (const field of fieldsArray) {
        fields.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
      }

      let filterQuery = {
        removed: false,
        ...fields,
      };

      if (filter && equal) {
        filterQuery = {
          ...filterQuery,
          [filter]: equal,
        };
      }

      filterQuery = {
        ...filterQuery,
        ...staffFilter,
      };

      const resultsPromise = Model.find(filterQuery)
        .skip(skip)
        .limit(limit)
        .sort({ [sortBy]: sortValue })
        .populate()
        .exec();

      const countPromise = Model.countDocuments(filterQuery);

      const [result, count] = await Promise.all([resultsPromise, countPromise]);

      const pages = Math.ceil(count / limit);
      const pagination = { page, pages, count };

      console.log('[paymentController.list] payment list response', {
        count,
        page,
        limit,
      });

      if (count > 0) {
        return res.status(200).json({
          success: true,
          result,
          pagination,
          message: 'Successfully found all documents',
        });
      }

      return res.status(203).json({
        success: true,
        result: [],
        pagination,
        message: 'Collection is Empty',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
        error,
      });
    }
  };

  // Override update method with staff filtering
  methods.update = async (req, res) => {
    try {
      // Build staff filter
      const staffFilter = await buildStaffFilter(req.admin, 'client');

      const result = await Model.findOneAndUpdate(
        {
          _id: req.params.id,
          removed: false,
          ...staffFilter,
        },
        req.body,
        {
          new: true,
          runValidators: true,
        }
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
        message: 'Successfully updated Payment',
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
        message: 'Successfully deleted Payment',
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

  methods.download = async (req, res) => {
    try {
      const staffFilter = await buildStaffFilter(req.admin, 'client');

      const result = await Model.findOne({
        _id: req.params.id,
        removed: false,
        ...staffFilter,
      })
        .populate()
        .exec();

      if (!result) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Payment not found',
        });
      }

      const fileId = `payment-${result._id}.pdf`;
      const targetDirectory = path.join(process.cwd(), 'src', 'public', 'download', 'payment');
      const targetLocation = path.join(targetDirectory, fileId);

      fs.mkdirSync(targetDirectory, { recursive: true });

      await customPdf.generatePdf(
        'Payment',
        { filename: 'payment', format: 'A4', targetLocation },
        result,
        async () => {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename=${fileId}`);

          return res.download(targetLocation, fileId, (error) => {
            if (error && !res.headersSent) {
              return res.status(500).json({
                success: false,
                result: null,
                message: "Couldn't download payment pdf",
                error: error.message,
              });
            }
          });
        }
      );
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
        error,
      });
    }
  };

  methods.mail = sendMail;
  methods.create = create;
  methods.update = update;
  methods.delete = remove;
  methods.summary = summary;

  return methods;
}

module.exports = modelController();

