// Derive client status from repayment data
const Repayment = require('mongoose').model('Repayment');

const deriveClientStatus = async (clientId) => {
  const repayments = await Repayment.find({ 
    client: clientId, 
    removed: false 
  }).select('status').lean();
  
  const total = repayments.length;
  if (total === 0) return 'not_started';
  
  const settled = repayments.filter(r => ['paid', 'late'].includes(r.status)).length;
  const overdue = repayments.some(r => r.status === 'default');
  
  if (settled === total) return 'paid';
  if (overdue) return 'defaulted';
  return 'active';
};

module.exports = deriveClientStatus;

