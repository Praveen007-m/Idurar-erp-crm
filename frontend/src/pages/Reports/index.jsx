import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Spin, Alert, Divider, Statistic } from 'antd';
import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import useLanguage from '@/locale/useLanguage';
import { useMoney } from '@/settings';
import { DashboardLayout } from '@/layout';
import { PieChartOutlined, LineChartOutlined, DollarCircleOutlined } from '@ant-design/icons';

export default function Reports() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const [loading, setLoading] = useState(true);

  const { result: dashboardData, error } = useFetch(() => 
    request.get({ entity: 'reports' })
  );

  useEffect(() => {
    if (dashboardData || error) setLoading(false);
  }, [dashboardData, error]);

  const data = dashboardData?.result || {};

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;
  if (error) return <Alert message="Error loading reports" type="error" />;

  const statusColumns = [
    { title: translate('Status'), dataIndex: 'status', key: 'status', textWrap: 'word-break' },
    { title: translate('Count'), dataIndex: 'count', key: 'count' },
    { title: translate('Percentage'), dataIndex: 'percentage', key: 'percentage', render: (val) => `${val}%` }
  ];

  const planColumns = [
    { title: translate('Plan Type'), dataIndex: 'plan', key: 'plan', render: (_, r, i) => `Plan Group ${i + 1}` }, // Assuming plan is an object index if not explicit
    { title: translate('Customers'), dataIndex: 'customerCount', key: 'customerCount' }
  ];

  return (
    <DashboardLayout>
      <div style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: 24 }}>{translate('Collection Reports')}</h2>
        
        <Row gutter={[24, 24]}>
          <Col span={6}>
            <Card>
              <Statistic
                title={translate('Total Collected')}
                value={data.collections?.totalCollected || 0}
                prefix={<DollarCircleOutlined />}
                formatter={moneyFormatter}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={translate('Pending Balance')}
                value={data.collections?.totalPending || 0}
                prefix={<DollarCircleOutlined style={{ color: '#ff4d4f' }} />}
                formatter={moneyFormatter}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={translate('Month Collected')}
                value={data.collections?.monthCollected || 0}
                prefix={<LineChartOutlined />}
                formatter={moneyFormatter}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={translate('Month Pending')}
                value={data.collections?.monthPending || 0}
                prefix={<LineChartOutlined style={{ color: '#faad14' }} />}
                formatter={moneyFormatter}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Divider />

        <Row gutter={[24, 24]}>
          <Col span={12}>
            <Card title={<><PieChartOutlined /> {translate('Status Breakdown')}</>} bordered={false}>
              <Table 
                dataSource={data.statusBreakdown || []}
                columns={statusColumns}
                pagination={false}
                rowKey="status"
                size="middle"
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title={<><PieChartOutlined /> {translate('Plan-wise Analytics')}</>} bordered={false}>
              <Table 
                dataSource={data.planWise || []}
                columns={planColumns}
                pagination={false}
                rowKey={(record, index) => index}
                size="middle"
              />
            </Card>
          </Col>
        </Row>
      </div>
    </DashboardLayout>
  );
}
