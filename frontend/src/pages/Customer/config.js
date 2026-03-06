export const fields = {
  name: {
    type: 'string',
  },
  address: {
    type: 'string',
  },
  phone: {
    type: 'phone',
  },
  email: {
    type: 'email',
  },
  loanAmount: {
    type: 'currency',
  },
  interestRate: {
    type: 'number',
  },
  term: {
    type: 'string',
  },
  startDate: {
    type: 'date',
  },
  repaymentType: {
    type: 'select',
    options: [
      { value: 'Monthly EMI', label: 'Monthly EMI' },
      { value: 'Weekly', label: 'Weekly' },
      { value: 'Daily', label: 'Daily' },
    ],
  },
  status: {
    type: 'select',
    options: [
      { value: 'active', label: 'Active', color: 'blue' },
      { value: 'paid', label: 'Paid', color: 'green' },
      { value: 'defaulted', label: 'Defaulted', color: 'red' },
    ],
  },
};
