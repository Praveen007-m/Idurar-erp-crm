import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Spin, Alert, Statistic } from 'antd';
import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import useLanguage from '@/locale/useLanguage';
import { useMoney } from '@/settings';
import { DashboardLayout } from '@/layout';
import { TeamOutlined, TrophyOutlined } from '@ant-design/icons';

export default function Performance() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const [loading, setLoading] = useState(true);

  const { result: dashboardData, error } = useFetch(() => 
    request.get({ entity: 'dashboard/admin' })
  );

  useEffect(() => {
    if (dashboardData || error) setLoading(false);
  }, [dashboardData, error]);

  const data = dashboardData?.result || {};

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;
  if (error) return <Alert message="Error loading performance" type="error" />;

  const staffWise = data.staffWise || [];

  const columns = [
    { 
      title: translate('Rank'), 
      key: 'rank', 
      width: 80,
      render: (_, __, i) => i === 0 ? <TrophyOutlined style={{ color: '#gold', fontSize: 18 }} /> : i + 1 
    },
    { title: translate('Staff Name'), dataIndex: 'name', key: 'name' },
    { title: translate('Assigned Customers'), dataIndex: 'customerCount', key: 'customerCount', align: 'center' },
    { 
      title: translate('Total Collected'), 
      dataIndex: 'collected', 
      key: 'collected',
      render: (val) => <span style={{ color: '#3f8600' }}>{moneyFormatter({ amount: val })}</span>,
      sorter: (a, b) => a.collected - b.collected,
      defaultSortOrder: 'descend'
    },
    { 
      title: translate('Pending Amount'), 
      dataIndex: 'pending', 
      key: 'pending',
      render: (val) => <span style={{ color: '#cf1322' }}>{moneyFormatter({ amount: val })}</span>,
      sorter: (a, b) => a.pending - b.pending
    }
  ];

  return (
    <DashboardLayout>
      <div style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: 24 }}>{translate('Staff Performance View')}</h2>
        
        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title={translate('Active Staff Handling Customers')}
                value={staffWise.length}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title={translate('Top Performer')}
                value={staffWise[0]?.name || 'N/A'}
                prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
        </Row>

        <Card title={translate('Staff Collections & Efficiency')} bordered={false}>
          <Table 
            dataSource={staffWise}
            columns={columns}
            pagination={false}
            rowKey="name"
            size="middle"
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
