const mongoose = require('mongoose');
const { buildStaffFilter } = require('@/helpers/staffFilter');

const Model = mongoose.model('Invoice');

const read = async (req, res) => {
  // Build staff filter
  const staffFilter = await buildStaffFilter(req.admin, 'client');

  // Find document by id
  const result = await Model.findOne({
    _id: req.params.id,
    removed: false,
    ...staffFilter,
  })
    .populate('createdBy', 'name')
    .exec();
  // If no results found, return document not found
  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  } else {
    // Return success resposne
    return res.status(200).json({
      success: true,
      result,
      message: 'we found this document ',
    });
  }
};

module.exports = read;
