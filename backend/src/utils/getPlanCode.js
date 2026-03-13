const getPlanCode = (repaymentType, term) => {
  const type = String(repaymentType || '').toLowerCase().trim();
  const t = parseInt(term);
  if (type === 'weekly' && t === 10) return 'TEN_WEEKS';
  if (type === 'daily' && t === 100) return 'HUNDRED_DAYS';
  return 'OTHER';
};

module.exports = getPlanCode;

