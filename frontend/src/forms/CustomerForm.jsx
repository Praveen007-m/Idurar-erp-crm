import { Form, Input, DatePicker, InputNumber, Select, Button, Row, Col } from 'antd';
import dayjs from 'dayjs';
import {
  validatePhoneNumber,
  handlePhoneInput,
  handlePhoneKeyPress,
  handlePhonePaste,
} from '@/utils/helpers';

import useLanguage from '@/locale/useLanguage';
import useRole from '@/hooks/useRole';
import { request } from '@/request';
import { useState, useEffect } from 'react';

export default function CustomerForm({ isUpdateForm = false, form }) {
  const translate = useLanguage();
  const { isAdmin } = useRole();

  const [staffOptions, setStaffOptions] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  /**
   * Fetch staff list
   */
  useEffect(() => {
    if (!isAdmin) return;

    const fetchStaff = async () => {
      setLoadingStaff(true);

      try {
        const response = await request.get({
          entity: 'admin/listAllStaff',
        });

        if (response.success && response.result) {
          const staff = response.result.map((s) => ({
            value: s._id,
            label: s.name || s.email,
          }));

          setStaffOptions(staff);
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
      } finally {
        setLoadingStaff(false);
      }
    };

    fetchStaff();
  }, [isAdmin]);

  /**
   * Convert assigned object -> assigned _id
   * So dropdown shows correct value in edit mode
   */
  // useEffect(() => {
  //   if (!form || !staffOptions.length) return;

  //   const assigned = form.getFieldValue('assigned');

  //   if (assigned && typeof assigned === 'object') {
  //     form.setFieldsValue({
  //       assigned: assigned._id,
  //     });
  //   }
  // }, [form, staffOptions]);

  /**
   * Prevent empty string values
   */
  const validateEmptyString = (_, value) => {
    if (value && value.trim() === '') {
      return Promise.reject(new Error('Field cannot be empty'));
    }
    return Promise.resolve();
  };

  return (
    <>
      {/* Name */}
      <Form.Item
        label={translate('name')}
        name="name"
        rules={[
          { required: true },
          { validator: validateEmptyString },
        ]}
      >
        <Input />
      </Form.Item>

      {/* Address */}
      <Form.Item
        label={translate('address')}
        name="address"
        rules={[
          { required: true },
          { validator: validateEmptyString },
        ]}
      >
        <Input />
      </Form.Item>

      {/* Phone + Email */}
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            name="phone"
            label={translate('Phone')}
            rules={[
              { required: true },
              { validator: validateEmptyString },
              {
                pattern: validatePhoneNumber,
                message: 'Enter valid 10-digit mobile number starting with 9,8,7,6',
              },
            ]}
          >
            <Input
              maxLength={10}
              inputMode="numeric"
              placeholder="Enter mobile number"
              onInput={handlePhoneInput}
              onKeyPress={handlePhoneKeyPress}
              onPaste={handlePhonePaste}
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            name="email"
            label={translate('email')}
            rules={[
              { type: 'email' },
              { required: true },
              { validator: validateEmptyString },
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>

      {/* Loan Amount + Interest */}
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            label={translate('loanAmount')}
            name="loanAmount"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label={`${translate('interestRate')} (% ${translate('per_month')})`}
            name="interestRate"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      {/* Term + Start Date */}
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            label={translate('term')}
            name="term"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label={translate('startDate')}
            name="startDate"
            rules={[{ required: true }]}
            getValueProps={(value) => ({
              value: value ? dayjs(value) : undefined,
            })}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      {/* Repayment / Interest / Status */}
      <Row gutter={12}>
        <Col span={8}>
          <Form.Item
            label={translate('repaymentType')}
            name="repaymentType"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'Monthly EMI', label: translate('monthly_emi') },
                { value: 'Weekly', label: translate('weekly') },
                { value: 'Daily', label: translate('daily') },
              ]}
            />
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item
            label={translate('interestType')}
            name="interestType"
            initialValue="reducing"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'reducing', label: translate('reducing_balance') },
                { value: 'flat', label: translate('flat_rate') },
              ]}
            />
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item
            label={translate('status')}
            name="status"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'active', label: translate('active') },
                { value: 'paid', label: translate('paid') },
                { value: 'defaulted', label: translate('defaulted') },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Assigned Staff - Admin Only */}
      {isAdmin && (
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label={translate('assignedStaff') || 'Assigned Staff'}
              name="assigned"
              getValueProps={(value) => {
                if (!value) return { value: undefined };
                if (typeof value === "object") return { value: value._id };
                return { value };
              }}
            >
              <Select
                showSearch
                allowClear
                placeholder={translate('select_staff') || 'Select Staff'}
                loading={loadingStaff}
                options={staffOptions}
                optionFilterProp="label"
                filterOption={(input, option) =>
                  (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
        </Row>
      )}

      {/* Save Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 30,
          borderTop: '1px solid #f0f0f0',
          paddingTop: 20,
          marginBottom: 20,
        }}
      >
        <Button type="primary" htmlType="submit">
          {isUpdateForm ? translate('Save') : translate('Submit')}
        </Button>
      </div>
    </>
  );
}
