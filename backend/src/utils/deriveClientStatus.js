// Derive client status from repayment data
const Repayment = require('mongoose').model('Repayment');

const deriveClientStatus = async (clientId) => {
  const repayments = await Repayment.find({ 
    client: clientId, 
    removed: false 
  }).select('status').lean();
  
  const total = repayments.length;
  if (total === 0) return 'not_started';
  
  const paid = repayments.filter(r => r.status === 'paid').length;
  const overdue = repayments.some(r => ['default', 'late'].includes(r.status));
  
  if (paid === total) return 'completed';
  if (overdue) return 'defaulted';
  return 'active';
};

module.exports = deriveClientStatus;

