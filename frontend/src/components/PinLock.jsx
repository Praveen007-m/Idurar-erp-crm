import React, { useState } from 'react';
import { Form, Input, Button, message, Card, Typography, Space, Divider } from 'antd';
import { KeyOutlined, SecurityScanOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const PinLock = ({ onUnlock }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    // Simulate API call or validation
    setTimeout(() => {
      if (values.pin === '1234') { // Default PIN - can be made configurable
        sessionStorage.setItem('dashboard_unlocked', 'true');
        onUnlock();
        message.success('Dashboard unlocked successfully!');
      } else {
        message.error('Incorrect PIN. Please try again.');
        form.resetFields();
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: '450px',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
        bodyStyle={{
          padding: '48px 40px',
        }}
      >
        {/* Header Section */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '8px',
            background: '#f5f7fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            border: '1px solid #e0e0e0'
          }}>
            <SecurityScanOutlined style={{
              fontSize: '36px',
              color: '#1890ff'
            }} />
          </div>
          <Title level={2} style={{
            margin: '0 0 12px 0',
            color: '#262626',
            fontWeight: '600',
            fontSize: '24px'
          }}>
            Dashboard Access
          </Title>
          <Paragraph style={{
            color: '#8c8c8c',
            fontSize: '14px',
            margin: 0,
            lineHeight: '1.6'
          }}>
            Enter your PIN to access the dashboard securely
          </Paragraph>
        </div>

        <Divider style={{ margin: '24px 0' }} />

        {/* Form Section */}
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            label={<span style={{ color: '#595959', fontSize: '14px', fontWeight: '500' }}>PIN</span>}
            name="pin"
            rules={[
              { required: true, message: 'Please enter your PIN' },
              { pattern: /^\d{4}$/, message: 'PIN must be exactly 4 digits' }
            ]}
            style={{ marginBottom: '24px' }}
          >
            <Input.Password
              placeholder="Enter 4-digit PIN"
              maxLength={4}
              size="large"
              style={{
                fontSize: '20px',
                letterSpacing: '6px',
                textAlign: 'center',
                borderRadius: '6px',
                border: '1px solid #d9d9d9',
                height: '44px',
                fontWeight: '500'
              }}
              onFocus={(e) => {
                e.target.parentElement.parentElement.style.borderColor = '#1890ff';
              }}
              onBlur={(e) => {
                e.target.parentElement.parentElement.style.borderColor = '#d9d9d9';
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{
                height: '44px',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: '500',
              }}
              icon={!loading && <KeyOutlined style={{ marginRight: '4px' }} />}
            >
              {loading ? 'Verifying...' : 'Unlock Dashboard'}
            </Button>
          </Form.Item>
        </Form>

        {/* Footer Section */}
        <div style={{
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid #f0f0f0',
          textAlign: 'center'
        }}>
          <Text style={{
            color: '#8c8c8c',
            fontSize: '13px',
            lineHeight: '1.6'
          }}>
            <SecurityScanOutlined style={{ marginRight: '6px' }} />
            PIN required on every login for enhanced security
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default PinLock;