import dayjs from 'dayjs';

const calculateFallbackEndDate = (startDate, term, repaymentType) => {
  if (!startDate || !term || !repaymentType) return null;

  const start = dayjs(startDate);
  const parsedTerm = Number.parseInt(term, 10);
  const normalizedRepaymentType = String(repaymentType).toLowerCase();

  if (!start.isValid() || !Number.isFinite(parsedTerm) || parsedTerm <= 0) return null;

  if (normalizedRepaymentType === 'weekly') {
    return start.add(parsedTerm, 'week');
  }

  if (normalizedRepaymentType === 'daily') {
    return start.add(parsedTerm, 'day');
  }

  if (normalizedRepaymentType === 'monthly emi' || normalizedRepaymentType === 'monthly') {
    return start.add(parsedTerm, 'month');
  }

  return null;
};

const getComputedEndDate = (record) => {
  if (record?.endDate) {
    const stored = dayjs(record.endDate);
    if (stored.isValid()) return stored;
  }

  return calculateFallbackEndDate(record?.startDate, record?.term, record?.repaymentType);
};

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
  endDate: {
    label: 'Ending Date',
    render: (_, record) => {
      const endDate = getComputedEndDate(record);
      return endDate ? endDate.format('DD/MM/YYYY') : '-';
    },
    sorter: (a, b) => {
      const aEndDate = getComputedEndDate(a);
      const bEndDate = getComputedEndDate(b);

      const aValue = aEndDate ? aEndDate.valueOf() : 0;
      const bValue = bEndDate ? bEndDate.valueOf() : 0;

      return aValue - bValue;
    },
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
  assigned: {
    type: 'related',
    relation: 'Admin',
    label: 'Assigned Staff',
    render: (text, record) => {
      // Handle populated assigned staff object
      if (record.assigned && typeof record.assigned === 'object') {
        return record.assigned.name || record.assigned.email || '-';
      }
      // Handle null or undefined
      return '-';
    },
  },
};
