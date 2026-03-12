module.exports = function getRepaymentDisplayStatus(repayment) {
  const normalizedStatus = String(repayment.status || '')
    .trim()
    .toLowerCase()
    .replace('late payment', 'late')
    .replace('not-paid', 'default')
    .replace('not-started', 'not-started')
    .replace('not_started', 'not-started');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(repayment.date);
  dueDate.setHours(0, 0, 0, 0);

  const amountPaid = Number(repayment.amountPaid || 0);
  const amount = Number(repayment.amount || 0);
  const paymentDate = repayment.paymentDate || repayment.paidDate;

  if (normalizedStatus === 'late') {
    return 'late';
  }

  if (normalizedStatus === 'partial') {
    return 'partial';
  }

  if (normalizedStatus === 'default') {
    return 'default';
  }

  if (today < dueDate && amountPaid === 0) {
    return 'not-started';
  }

  if (amountPaid >= amount && amount > 0) {
    if (paymentDate) {
      const paidAt = new Date(paymentDate);
      paidAt.setHours(0, 0, 0, 0);

      if (paidAt > dueDate) {
        return 'late';
      }
    }

    return 'paid';
  }

  if (amountPaid > 0 && amountPaid < amount) {
    return 'partial';
  }

  if (today > dueDate && amountPaid === 0) {
    return 'default';
  }

  if (normalizedStatus === 'paid') {
    return 'paid';
  }

  return 'not-started';
};
