import { useEffect, useState } from 'react';
import { Row, Col, Card, Spin, Alert, Divider, Statistic, Progress } from 'antd';
import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import useLanguage from '@/locale/useLanguage';
import { useMoney } from '@/settings';
import { DashboardLayout } from '@/layout';
import { DollarCircleOutlined, BarChartOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';

export default function PerformanceSummary() {
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

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;
  if (error) return <Alert message="Error loading performance data" type="error" />;

  const efficiencyProgress = data.performance?.efficiency || 0;

  return (
    <DashboardLayout>
      <div style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: 24 }}>{translate('My Performance Summary')}</h2>
        
        <Row gutter={[24, 24]}>
          <Col span={8}>
            <Card>
              <Statistic
                title={translate('Total Collected')}
                value={data.collections?.totalCollected || 0}
                prefix={<DollarCircleOutlined style={{ color: '#52c41a' }} />}
                formatter={moneyFormatter}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title={translate('Pending Amount')}
                value={data.collections?.totalPending || 0}
                prefix={<SyncOutlined style={{ color: '#faad14' }} />}
                formatter={moneyFormatter}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title={translate('This Month Collected')}
                value={data.collections?.monthCollected || 0}
                prefix={<CheckCircleOutlined />}
                formatter={moneyFormatter}
              />
            </Card>
          </Col>
        </Row>

        <Divider />

        <Row gutter={[24, 24]}>
          <Col span={12}>
            <Card title={<><BarChartOutlined /> {translate('Overall Efficiency')}</>} bordered={false}>
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Progress 
                  type="dashboard" 
                  percent={efficiencyProgress} 
                  strokeColor={efficiencyProgress > 80 ? '#52c41a' : efficiencyProgress > 50 ? '#1890ff' : '#cf1322'}
                  format={percent => `${percent}%`}
                  size={200}
                />
                <h3 style={{ marginTop: 20 }}>
                  {efficiencyProgress > 80 
                    ? translate('Excellent Collection Rate') 
                    : efficiencyProgress > 50 
                      ? translate('Average Collection Rate') 
                      : translate('Needs Improvement')}
                </h3>
                <p style={{ color: '#888' }}>
                  {translate('Efficiency is calculated as collected amount versus expected installments.')}
                </p>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title={translate('Account Actions Breakdown')} bordered={false}>
              <Row gutter={[16, 16]}>
                 <Col span={12}>
                   <Statistic title={translate('Active Customers')} value={data.customerMetrics?.active || 0} valueStyle={{ color: '#1890ff' }} />
                 </Col>
                 <Col span={12}>
                   <Statistic title={translate('Fully Paid Customers')} value={data.customerMetrics?.completed || 0} valueStyle={{ color: '#52c41a' }} />
                 </Col>
                 <Col span={12}>
                   <Statistic title={translate('Defaulted Accounts')} value={data.customerMetrics?.defaulted || 0} valueStyle={{ color: '#cf1322' }} />
                 </Col>
                 <Col span={12}>
                   <Statistic title={translate('Upcoming Installments')} value={data.installments?.upcoming || 0} />
                 </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    </DashboardLayout>
  );
}
