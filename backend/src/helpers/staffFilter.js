/**
 * Staff Filter Helper
 * Provides utilities for filtering data based on staff assignments
 */

const mongoose = require('mongoose');

/**
 * Get the list of client IDs assigned to the current staff user
 * @param {Object} admin - The admin user object from req.admin
 * @returns {Promise<Array>} - Array of client IDs
 */
async function getStaffClientIds(admin) {
  const Client = mongoose.model('Client');
  
  // If not staff (admin/owner), return null to indicate no filtering needed
  if (!admin || admin.role !== 'staff') {
    return null;
  }

  // Get all clients assigned to this staff member
  const clients = await Client.find({
    assigned: admin._id,
    removed: false
  }).select('_id');

  return clients.map(c => c._id);
}

/**
 * Build filter query for staff-based data access
 * @param {Object} admin - The admin user object from req.admin
 * @param {string} clientFieldName - The field name in the model that references Client (default: 'client')
 * @returns {Object} - Filter object to be used in Mongoose queries
 */
async function buildStaffFilter(admin, clientFieldName = 'client') {
  // If not set or not staff (admin/owner), return empty filter to show all data
  if (!admin || admin.role === 'admin' || admin.role === 'owner' || admin.role === 'superadmin') {
    return {};
  }

  // For staff users, filter by assigned clients
  const clientIds = await getStaffClientIds(admin);
  
  if (!clientIds || clientIds.length === 0) {
    // Staff has no assigned clients - return filter that matches nothing
    return { [clientFieldName]: { $in: [null, false] } };
  }

  return { [clientFieldName]: { $in: clientIds } };
}

/**
 * Check if user has access to a specific client
 * @param {Object} admin - The admin user object
 * @param {string|ObjectId} clientId - The client ID to check
 * @returns {Promise<boolean>}
 */
async function hasAccessToClient(admin, clientId) {
  if (!admin || admin.role !== 'staff') {
    return true; // Admins have access to all
  }

  const Client = mongoose.model('Client');
  const client = await Client.findOne({
    _id: clientId,
    assigned: admin._id,
    removed: false
  });

  return !!client;
}

module.exports = {
  getStaffClientIds,
  buildStaffFilter,
  hasAccessToClient
};

