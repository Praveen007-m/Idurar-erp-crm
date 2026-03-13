import { useEffect, useState } from 'react';
import { Row, Col, Statistic, Card, Progress, Table, Spin, Alert, Divider } from 'antd';
import { PieChartOutlined, DollarCircleOutlined, ClockCircleOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { useMoney } from '@/settings';
import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';

// Charts optional - use Progress bars instead



export default function AdminDashboardModule() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const [loading, setLoading] = useState(true);

  const { result: dashboardData, error } = useFetch(() => 
    request.get('/dashboard/admin')
  );

  useEffect(() => {
    if (dashboardData || error) setLoading(false);
  }, [dashboardData, error]);

  const statusConfig = (dashboardData?.result?.statusBreakdown || []).map(s => ({
    type: s.status,
    value: s.percentage || 0
  }));

  const planColumns = [
    { title: translate('Plan'), dataIndex: 'planCode', key: 'planCode' },
    { title: translate('Customers'), dataIndex: 'customerCount', key: 'customerCount' },
    { title: translate('Collected'), dataIndex: 'collected', render: v => moneyFormatter({ amount: v }), key: 'collected' },
    { title: translate('Pending'), dataIndex: 'pending', render: v => moneyFormatter({ amount: v }), key: 'pending' }
  ];

  const staffColumns = [
    { title: translate('Staff'), dataIndex: 'name', key: 'name' },
    { title: translate('Customers'), dataIndex: 'customerCount', key: 'customerCount' },
    { title: translate('Collected'), dataIndex: 'collected', render: v => moneyFormatter({ amount: v }), key: 'collected' },
    { title: translate('Pending'), dataIndex: 'pending', render: v => moneyFormatter({ amount: v }), key: 'pending' }
  ];

  if (loading) return <Spin size="large" />;
  if (error) return <Alert message="Error loading dashboard" type="error" />;

  const data = dashboardData.result;

  return (
    <div>
      <Row gutter={[24, 24]}>
        <Col span={6}>
          <Card>
            <Statistic
              title={translate('Total Customers')}
              value={data.customerMetrics.total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={translate('Active Customers')}
              value={data.customerMetrics.active}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={translate('Completed')}
              value={data.customerMetrics.completed}
              prefix={<PieChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={translate('Defaulted')}
              value={data.customerMetrics.defaulted}
              prefix={<ClockCircleOutlined />}
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
              title={translate('Total Collected')}
              value={data.collections.totalCollected}
              prefix={<DollarCircleOutlined />}
              formatter={moneyFormatter}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={translate('Total Pending')}
              value={data.collections.totalPending}
              prefix={<DollarCircleOutlined />}
              formatter={moneyFormatter}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={translate('This Month Collected')}
              value={data.collections.monthCollected}
              prefix={<DollarCircleOutlined />}
              formatter={moneyFormatter}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={translate('This Month Pending')}
              value={data.collections.monthPending}
              prefix={<DollarCircleOutlined />}
              formatter={moneyFormatter}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={12}>
          <Card title={translate('Status Breakdown')}>
            <div>
              {(statusConfig || []).map(s => (
                <div key={s.type} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>{s.type}</span>
                    <span>{s.value}%</span>
                  </div>
                  <Progress percent={s.value} />
                </div>
              ))}
              {statusConfig.length === 0 && <Spin />}
            </div>

          </Card>
        </Col>
        <Col span={12}>
          <Card title={translate('Plan-wise Analytics')} >
            <Table
              dataSource={data.planWise || []}
              columns={planColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={24}>
          <Card title={translate('Staff-wise Analytics')}>
            <Table
              dataSource={data.staffWise || []}
              columns={staffColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

