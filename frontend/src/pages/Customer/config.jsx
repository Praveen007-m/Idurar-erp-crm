import dayjs from 'dayjs';
import { createElement } from 'react';
import { BASE_URL } from '@/config/serverApiConfig';

const avatarStyle = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  objectFit: 'cover',
  background: '#fff',
};

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

const formatCollectionTime = (time) => {
  if (!time || typeof time !== 'string') return '-';
  const normalized = time.trim();
  const ampmMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (ampmMatch) {
    const hour = Number(ampmMatch[1]);
    const minute = ampmMatch[2];
    const suffix = ampmMatch[3].toUpperCase();
    if (Number.isFinite(hour) && hour >= 1 && hour <= 12) {
      return `${String(hour).padStart(2, '0')}:${minute} ${suffix}`;
    }
  }

  const timeMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!timeMatch) return normalized;

  const hour24 = Number(timeMatch[1]);
  const minute = timeMatch[2];
  if (!Number.isFinite(hour24) || hour24 < 0 || hour24 > 23) return normalized;

  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${minute} ${suffix}`;
};

export const fields = {
  photo: {
    label: 'Photo',
    render: (photo) => (
      photo ? (
        <img
          src={`${BASE_URL}${photo}`}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            objectFit: 'cover',
            background: '#fff'
          }}
        />
      ) : (
        <div className="avatar-placeholder">N/A</div>
      )
    )
  },
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
  collectionTime: {
    label: 'Collection Time',
    render: (time) => formatCollectionTime(time),
    sorter: (a, b) => (a?.collectionTime || '').localeCompare(b?.collectionTime || ''),
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
      const assigned = record?.assigned || record?.assignedTo || null;
      if (!assigned) {
        return 'Unknown Staff';
      }

      if (typeof assigned === 'string') {
        return assigned;
      }

      if (typeof assigned === 'object') {
        if (assigned.name || assigned.email || assigned._id) {
          return assigned.name || assigned.email || assigned._id;
        }

        const nested = assigned?.assigned || assigned?.user || assigned?.staff;
        if (nested && typeof nested === 'object') {
          return nested.name || nested.email || nested._id || 'Unknown Staff';
        }

        return JSON.stringify(assigned);
      }

      return 'Unknown Staff';
    },
  },
};
