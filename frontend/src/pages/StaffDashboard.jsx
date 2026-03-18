/**
 * StaffDashboard.jsx — Webaac Solutions Finance Management
 * Place: frontend/src/pages/StaffDashboard.jsx
 *
 * API: GET /api/dashboard/staff
 * Response: { success, result: { customerMetrics, collections, installments, performance } }
 *
 * Uses same useFetch + request pattern as other pages in this project.
 */
import { useEffect, useState } from 'react';
import {
  Row, Col, Card, Spin, Alert, Statistic,
  Progress, Typography, Grid, Table, Space,
} from 'antd';
import {
  TeamOutlined, DollarCircleOutlined,
  WarningOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import useLanguage from '@/locale/useLanguage';
import { useMoney } from '@/settings';
import { DashboardLayout } from '@/layout';

const { useBreakpoint } = Grid;

export default function StaffDashboard() {
  const translate          = useLanguage();
  const { moneyFormatter } = useMoney();
  const screens            = useBreakpoint();
  const isMobile           = !screens.md;
  const [loading, setLoading] = useState(true);

  const { result: dashboardData, error } = useFetch(() =>
    request.get({ entity: 'dashboard/staff' })
  );

  useEffect(() => {
    if (dashboardData || error) setLoading(false);
  }, [dashboardData, error]);

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <Alert message="Error loading dashboard" type="error" showIcon style={{ margin: 24 }} />
    </DashboardLayout>
  );

  // useFetch returns full API response as `result`
  // dashboardData = { success, result: { customerMetrics, collections, ... } }
  const data       = dashboardData?.result ?? dashboardData ?? {};
  const col        = data.collections      ?? {};
  const cust       = data.customerMetrics  ?? {};
  const inst       = data.installments     ?? {};
  const efficiency = data.performance?.efficiency ?? 0;

  const summaryRows = [
    { key: '1', metric: translate('Total Assigned Customers'), value: cust.total     ?? 0 },
    { key: '2', metric: translate('Active'),                   value: cust.active    ?? 0 },
    { key: '3', metric: translate('Completed'),                value: cust.completed ?? 0 },
    { key: '4', metric: translate('Defaulted'),                value: cust.defaulted ?? 0 },
  ];

  const summaryColumns = [
    { title: translate('Metric'), dataIndex: 'metric', key: 'metric' },
    {
      title: translate('Value'), dataIndex: 'value', key: 'value', align: 'right',
      render: (v) => <Typography.Text strong>{v}</Typography.Text>,
    },
  ];

  const cardStyle = {
    borderRadius: 10,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    height: '100%',
  };
  const bodyPad = { body: { padding: isMobile ? '14px 12px' : '20px 16px' } };

  return (
    <DashboardLayout>
      <div style={{ padding: isMobile ? '12px 10px' : '24px' }}>

        <Typography.Title
          level={isMobile ? 4 : 3}
          style={{ marginBottom: isMobile ? 14 : 24, marginTop: 0 }}
        >
          {translate('Dashboard')}
        </Typography.Title>

        {/* Row 1 — top 3 KPIs */}
        <Row gutter={[10, 10]} style={{ marginBottom: 10 }}>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={cardStyle} styles={bodyPad}>
              <Statistic
                title={<span style={{ fontSize: isMobile ? 11 : 13, color: '#8c8c8c' }}>{translate('Total Assigned')}</span>}
                value={cust.total ?? 0}
                prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff', fontSize: isMobile ? 20 : 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card bordered={false} style={cardStyle} styles={bodyPad}>
              <Statistic
                title={<span style={{ fontSize: isMobile ? 11 : 13, color: '#8c8c8c' }}>{translate('Total Collected')}</span>}
                value={col.totalCollected ?? 0}
                prefix={<DollarCircleOutlined style={{ color: '#52c41a' }} />}
                formatter={moneyFormatter}
                valueStyle={{ color: '#52c41a', fontSize: isMobile ? 16 : 22 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card bordered={false} style={cardStyle} styles={bodyPad}>
              <Statistic
                title={<span style={{ fontSize: isMobile ? 11 : 13, color: '#8c8c8c' }}>{translate('Pending Amount')}</span>}
                value={col.totalPending ?? 0}
                prefix={<DollarCircleOutlined style={{ color: '#ff4d4f' }} />}
                formatter={moneyFormatter}
                valueStyle={{ color: '#ff4d4f', fontSize: isMobile ? 16 : 22 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Row 2 — secondary KPIs */}
        <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={cardStyle} styles={bodyPad}>
              <Statistic
                title={<span style={{ fontSize: isMobile ? 11 : 13, color: '#8c8c8c' }}>{translate('This Month Collected')}</span>}
                value={col.monthCollected ?? 0}
                prefix={<DollarCircleOutlined style={{ color: '#1890ff' }} />}
                formatter={moneyFormatter}
                valueStyle={{ color: '#1890ff', fontSize: isMobile ? 14 : 20 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={cardStyle} styles={bodyPad}>
              <Statistic
                title={<span style={{ fontSize: isMobile ? 11 : 13, color: '#8c8c8c' }}>{translate('Overdue Installments')}</span>}
                value={inst.overdue ?? 0}
                prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: '#ff4d4f', fontSize: isMobile ? 20 : 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={cardStyle} styles={bodyPad}>
              <Statistic
                title={<span style={{ fontSize: isMobile ? 11 : 13, color: '#8c8c8c' }}>{translate('Upcoming (7 Days)')}</span>}
                value={inst.upcoming ?? 0}
                prefix={<CalendarOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14', fontSize: isMobile ? 20 : 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={cardStyle} styles={bodyPad}>
              <div style={{ fontSize: isMobile ? 11 : 13, color: '#8c8c8c', marginBottom: 6 }}>
                {translate('Efficiency')}
              </div>
              <Typography.Text
                strong
                style={{ fontSize: isMobile ? 18 : 22, color: efficiency >= 70 ? '#52c41a' : '#ff4d4f' }}
              >
                {efficiency}%
              </Typography.Text>
              <Progress
                percent={Math.min(efficiency, 100)}
                showInfo={false}
                strokeColor={efficiency >= 70 ? '#52c41a' : '#ff4d4f'}
                size="small"
                style={{ marginTop: 6, marginBottom: 0 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Customer Summary table */}
        <Card
          title={translate('Customer Summary')}
          bordered={false}
          style={{ borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <Table
            rowKey="key"
            dataSource={summaryRows}
            columns={summaryColumns}
            pagination={false}
            size="small"
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
