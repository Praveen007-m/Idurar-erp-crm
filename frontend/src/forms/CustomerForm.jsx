import { Form, Input, DatePicker, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { validatePhoneNumber } from '@/utils/helpers';

import useLanguage from '@/locale/useLanguage';

export default function CustomerForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const validateEmptyString = (_, value) => {
    if (value && value.trim() === '') {
      return Promise.reject(new Error('Field cannot be empty'));
    }

    return Promise.resolve();
  };

  return (
    <>
      <Form.Item
        label={translate('name')}
        name="name"
        rules={[
          {
            required: true,
          },
          {
            validator: validateEmptyString,
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label={translate('address')}
        name="address"
        rules={[
          {
            required: true,
          },
          {
            validator: validateEmptyString,
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="phone"
        label={translate('Phone')}
        rules={[
          {
            required: true,
          },
          {
            validator: validateEmptyString,
          },
          {
            pattern: validatePhoneNumber,
            message: 'Please enter a valid phone number',
          },
        ]}
        style={{
          display: 'inline-block',
          width: 'calc(50%)',
          paddingRight: '5px',
        }}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="email"
        label={translate('email')}
        rules={[
          {
            type: 'email',
          },
          {
            required: true,
          },
          {
            validator: validateEmptyString,
          },
        ]}
        style={{
          display: 'inline-block',
          width: 'calc(50%)',
          paddingLeft: '5px',
        }}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label={translate('loanAmount')}
        name="loanAmount"
        rules={[{ required: true }]}
        style={{
          display: 'inline-block',
          width: 'calc(50%)',
          paddingRight: '5px',
        }}
      >
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item
        label={translate('interestRate') + ' (% ' + translate('per_month') + ')'}
        name="interestRate"
        rules={[{ required: true }]}
        style={{
          display: 'inline-block',
          width: 'calc(50%)',
          paddingLeft: '5px',
        }}
      >
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label={translate('term')}
        name="term"
        rules={[{ required: true }]}
        style={{
          display: 'inline-block',
          width: 'calc(50%)',
          paddingRight: '5px',
        }}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label={translate('startDate')}
        name="startDate"
        rules={[{ required: true }]}
        getValueProps={(value) => ({
          value: value ? dayjs(value) : undefined,
        })}
        style={{
          display: 'inline-block',
          width: 'calc(50%)',
          paddingLeft: '5px',
        }}
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label={translate('repaymentType')}
        name="repaymentType"
        rules={[{ required: true }]}
        style={{
          display: 'inline-block',
          width: 'calc(33%)',
          paddingRight: '5px',
        }}
      >
        <Select
          options={[
            { value: 'Monthly EMI', label: translate('monthly_emi') },
            { value: 'Weekly', label: translate('weekly') },
            { value: 'Daily', label: translate('daily') },
          ]}
        />
      </Form.Item>
      <Form.Item
        label={translate('interestType')}
        name="interestType"
        rules={[{ required: true }]}
        initialValue={'reducing'}
        style={{
          display: 'inline-block',
          width: 'calc(33%)',
          paddingRight: '5px',
          paddingLeft: '5px',
        }}
      >
        <Select
          options={[
            { value: 'reducing', label: translate('reducing_balance') },
            { value: 'flat', label: translate('flat_rate') },
          ]}
        />
      </Form.Item>
      <Form.Item
        label={translate('status')}
        name="status"
        rules={[{ required: true }]}
        style={{
          display: 'inline-block',
          width: 'calc(34%)',
          paddingLeft: '5px',
        }}
      >
        <Select
          options={[
            { value: 'active', label: translate('active') },
            { value: 'paid', label: translate('paid') },
            { value: 'defaulted', label: translate('defaulted') },
          ]}
        />
      </Form.Item>
    </>
  );
}
