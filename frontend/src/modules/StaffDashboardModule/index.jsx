import { useEffect, useState } from 'react';
import { Row, Col, Statistic, Card, Table, Spin, Alert, Divider, Progress } from 'antd';
import { UserOutlined, DollarCircleOutlined, ClockCircleOutlined, WarningOutlined, CalendarOutlined, BarChartOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { useMoney } from '@/settings';
import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import { useSelector } from 'react-redux';

export default function StaffDashboardModule() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const [loading, setLoading] = useState(true);

  const { result: dashboardData, error } = useFetch(() => 
    request.get({ entity: 'dashboard/staff' })
  );

  useEffect(() => {
    if (dashboardData || error) setLoading(false);
  }, [dashboardData, error]);

  const data = dashboardData?.result || {};

  if (loading) return <Spin size="large" />;
  if (error) return <Alert message="Error loading dashboard" type="error" />;

  const efficiencyProgress = data.performance?.efficiency || 0;

  const summaryColumns = [
    { title: translate('Metric'), dataIndex: 'title', key: 'title' },
    { title: translate('Value'), dataIndex: 'value', key: 'value' }
  ];

  const summaryData = [
    { title: translate('Total Assigned Customers'), value: data.customerMetrics?.total || 0 },
    { title: translate('Active'), value: data.customerMetrics?.active || 0 },
    { title: translate('Completed'), value: data.customerMetrics?.completed || 0 },
    { title: translate('Defaulted'), value: data.customerMetrics?.defaulted || 0 }
  ];

  return (
    <div>
      <Row gutter={[24, 24]}>
        <Col span={8}>
          <Card>
            <Statistic
              title={translate('Total Assigned')}
              value={data.customerMetrics?.total || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={translate('Total Collected')}
              value={data.collections?.totalCollected || 0}
              prefix={<DollarCircleOutlined />}
              formatter={moneyFormatter}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={translate('Pending Amount')}
              value={data.collections?.totalPending || 0}
              prefix={<DollarCircleOutlined />}
              formatter={moneyFormatter}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[24, 24]}>
        <Col span={6}>
          <Card>
            <Statistic
              title={translate('This Month Collected')}
              value={data.collections?.monthCollected || 0}
              formatter={moneyFormatter}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={translate('Overdue Installments')}
              value={data.installments?.overdue || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={translate('Upcoming (7 days)')}
              value={data.installments?.upcoming || 0}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={translate('Efficiency')}
              value={efficiencyProgress}
              suffix="%"
              prefix={<BarChartOutlined />}
            />
            <Progress percent={efficiencyProgress} status="active" />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row>
        <Col span={24}>
          <Card title={translate('Customer Summary')}>
            <Table
              dataSource={summaryData}
              columns={summaryColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

