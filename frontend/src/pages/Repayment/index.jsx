import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ArrowLeftOutlined,
  RedoOutlined,
  CalendarOutlined,
  UserOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Badge,
  Button,
  Calendar,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  notification,
  Row,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';

import { ErpLayout } from '@/layout';
import { crud } from '@/redux/crud/actions';
import { selectListItems } from '@/redux/crud/selectors';
import { erp } from '@/redux/erp/actions';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import RepaymentForm from '@/forms/RepaymentForm';
import { repaymentStatusColor } from '@/utils/repaymentStatusColor';

const BOX_BORDER = '#28a7ab';
const BOX_BG = '#e9f7f8';
const BOX_TEXT = '#117a8b';
const HEADER_BG = 'linear-gradient(90deg, rgba(40,167,171,0.14) 0%, rgba(24,144,255,0.06) 100%)';

const normalizeRepaymentStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus === 'late payment') return 'late';
  if (normalizedStatus === 'not-paid' || normalizedStatus === 'not paid') return 'default';
  if (normalizedStatus === 'not_started' || normalizedStatus === 'not started') return 'not-started';

  return normalizedStatus || 'not-started';
};

const getDisplayStatus = (repayment) => {
  const today = new Date();
  const due = new Date(repayment?.date);
  const status = normalizeRepaymentStatus(repayment?.status);

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  if (status === 'paid') return 'paid';
  if (status === 'late') return 'late';
  if (status === 'partial') return 'partial';

  if (today < due) return 'not-started';

  return 'default';
};

const getRepaymentColor = (repayment) =>
  repaymentStatusColor[getDisplayStatus(repayment)] || repaymentStatusColor['not-started'];

const getStatusClassName = (repayment) => `status-${getDisplayStatus(repayment)}`;

const LegendItem = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginRight: 16 }}>
    <span
      style={{
        width: 14,
        height: 14,
        backgroundColor: color,
        display: 'inline-block',
        marginRight: 6,
        borderRadius: 2,
        border: '1px solid #ccc',
      }}
    />
    <span>{label}</span>
  </div>
);

const displayStatusPriority = {
  default: 1,
  late: 2,
  partial: 3,
  paid: 4,
  'not-started': 5,
};

const roundCurrency = (value) => Number.parseFloat(Number(value || 0).toFixed(2));

const buildRepaymentPayloadFromClient = (client, dueDate) => {
  const installmentCount = Number.parseInt(client?.term, 10);
  const principal = Number.parseFloat(client?.loanAmount || 0);
  const monthlyRate = Number.parseFloat(client?.interestRate || 0) / 100;

  let totalMonths = installmentCount;
  if (client?.repaymentType === 'Weekly') {
    totalMonths = installmentCount / 4;
  } else if (client?.repaymentType === 'Daily') {
    totalMonths = installmentCount / 30;
  }

  let totalInterest = 0;

  if (client?.interestType === 'flat') {
    totalInterest = principal * monthlyRate * totalMonths;
  } else {
    const periodRate = monthlyRate * (totalMonths / installmentCount);
    if (periodRate > 0) {
      const installmentAmount =
        (principal * periodRate * Math.pow(1 + periodRate, installmentCount)) /
        (Math.pow(1 + periodRate, installmentCount) - 1);
      totalInterest = installmentAmount * installmentCount - principal;
    }
  }

  const interestPerInstallment = totalInterest / installmentCount;
  const principalPerInstallment = principal / installmentCount;
  const installmentAmount = principalPerInstallment + interestPerInstallment;

  return {
    client: client._id,
    date: dayjs(dueDate).toISOString(),
    amount: roundCurrency(installmentAmount),
    principal: roundCurrency(principalPerInstallment),
    interest: roundCurrency(interestPerInstallment),
    amountPaid: 0,
  };
};

export default function Repayment() {
  const translate = useLanguage();
  const dispatch = useDispatch();

  const { result: listResult, isLoading } = useSelector(selectListItems);
  // Ensure clients is always an array to prevent "clients.filter is not a function" error
  const clients = Array.isArray(listResult?.items) ? listResult.items : [];

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRepayment, setEditingRepayment] = useState(null);
  const [form] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState('all');
  const [repayments, setRepayments] = useState([]);

  const loadClients = () => {
    dispatch(crud.list({ entity: 'client', options: { page: 1, items: 100 } }));
  };

  useEffect(() => {
    loadClients();
    loadRepayments();
    
    // Listen for repayment updates from ClientRepayment page
    const handleRepaymentUpdate = () => {
      loadRepayments();
    };
    
    window.addEventListener('repayment-updated', handleRepaymentUpdate);
    
    return () => {
      window.removeEventListener('repayment-updated', handleRepaymentUpdate);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getDueDatesForClientInMonth = (client, monthValue) => {
    const term = parseInt(client?.term, 10);
    if (!client?.startDate || Number.isNaN(term) || term <= 0) return [];

    const monthStart = monthValue.startOf('month');
    const monthEnd = monthValue.endOf('month');
    const startDate = dayjs(client.startDate);
    const dueDates = [];

    let unit = 'month';
    if (client?.repaymentType === 'Weekly') unit = 'week';
    if (client?.repaymentType === 'Daily') unit = 'day';

    for (let i = 1; i <= term; i += 1) {
      const dueDate = startDate.add(i, unit);
      if (dueDate.isAfter(monthEnd)) break;
      if (dueDate.isBefore(monthStart)) continue;
      dueDates.push(dueDate.date());
    }

    return dueDates;
  };

  const filteredClients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return clients.filter((client) => {
      const matchName = !query || (client?.name || '').toLowerCase().includes(query);
      const matchStatus = statusFilter === 'all' || client?.status === statusFilter;
      return matchName && matchStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  // Filter clients for staff users - only show their assigned clients
  const filteredClientsByRole = useMemo(() => {
    // This is already handled in the backend, but we can also filter on frontend for extra safety
    return filteredClients;
  }, [filteredClients]);

  const clientsByDay = useMemo(() => {
    const map = {};
    filteredClientsByRole.forEach((client) => {
      const dueDates = getDueDatesForClientInMonth(client, currentDate);
      dueDates.forEach((dayNumber) => {
        if (!map[dayNumber]) map[dayNumber] = [];
        map[dayNumber].push(client);
      });
    });
    return map;
  }, [filteredClientsByRole, currentDate]);

  const loadRepayments = async () => {
    const response = await request.list({
      entity: "repayment",
      options: { items: 500, page: 1 }
    });

    if (response?.success) {
      setRepayments(response.result || []);
    }
  };

  const repaymentMap = useMemo(() => {
    const map = new Map();

    if (!repayments || !Array.isArray(repayments)) return map;

    repayments.forEach((item) => {
      const clientId = item.client?._id || item.client;
      const key = `${clientId}-${dayjs(item.date).format("YYYY-MM-DD")}`;
      const currentRepayment = map.get(key);
      const currentPriority = currentRepayment
        ? displayStatusPriority[getDisplayStatus(currentRepayment)] || displayStatusPriority['not-started']
        : Number.POSITIVE_INFINITY;
      const nextPriority =
        displayStatusPriority[getDisplayStatus(item)] || displayStatusPriority['not-started'];

      if (!currentRepayment || nextPriority < currentPriority) {
        map.set(key, item);
      }
    });

    return map;
  }, [repayments]);

  const getPaymentStatus = useCallback((client, date) => {
    const key = `${client._id}-${date.format("YYYY-MM-DD")}`;
    return repaymentMap.get(key) || null;
  }, [repaymentMap]);

  const totalDueClients = Object.values(clientsByDay).reduce((count, dayItems) => count + dayItems.length, 0);
  const startOfWeek = useMemo(() => currentDate.startOf('week'), [currentDate]);
  const endOfWeek = useMemo(() => currentDate.endOf('week'), [currentDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => startOfWeek.add(index, 'day')),
    [startOfWeek]
  );

  const goToPreviousWeek = useCallback(() => {
    setCurrentDate((prev) => prev.subtract(1, 'week'));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentDate((prev) => prev.add(1, 'week'));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(dayjs());
  }, []);

  const formatRepaymentPayload = (values) => ({
    ...values,
    amountPaid:
      (values.status === 'paid' || values.status === 'late') && !values.amountPaid
        ? values.amount
        : values.amountPaid,
    date: values.date ? dayjs(values.date).toISOString() : undefined,
    paymentDate:
      values.paymentDate
        ? dayjs(values.paymentDate).toISOString()
        : values.status === 'paid' || values.status === 'late'
          ? new Date().toISOString()
          : null,
  });

  const updateRepaymentInState = useCallback((updatedRepayment) => {
    setRepayments((prev) =>
      prev.map((item) => (item._id === updatedRepayment._id ? { ...item, ...updatedRepayment } : item))
    );
  }, []);

  const appendRepaymentToState = useCallback((newRepayment) => {
    setRepayments((prev) => {
      if (prev.some((item) => item._id === newRepayment._id)) {
        return prev;
      }

      return [...prev, newRepayment];
    });
  }, []);

  const openRepaymentEditor = useCallback((repayment) => {
    if (!repayment) return;

    setEditingRepayment(repayment);
    form.setFieldsValue({
      ...repayment,
      status: normalizeRepaymentStatus(repayment.status),
      _originalStatus: normalizeRepaymentStatus(repayment.status),
      date: repayment.date ? dayjs(repayment.date) : null,
      paymentDate: repayment.paidDate ? dayjs(repayment.paidDate) : (repayment.paymentDate ? dayjs(repayment.paymentDate) : null),
      amountPaid: repayment.amountPaid ?? 0,
    });
    setIsEditModalOpen(true);
  }, [form]);

  const handleClientClick = async (client, dueDate, repaymentRecord = null) => {
    if (repaymentRecord?._id) {
      openRepaymentEditor(repaymentRecord);
      return;
    }

    try {
      const formattedDate = dayjs(dueDate).format('YYYY-MM-DD');
      const response = await request.get({
        entity: `/repayment/by-client-date?clientId=${client._id}&date=${formattedDate}`,
      });

      if (response?.success && response?.result) {
        openRepaymentEditor(response.result);
        return;
      }
    } catch (error) {
      const isNotFound = error?.message === 'Repayment not found' || error?.message === 'No repayment found';

      if (!isNotFound) {
        notification.error({
          message: translate('Failed to fetch repayment'),
          description: error?.message,
        });
        return;
      }
    }

    try {
      const createResponse = await request.create({
        entity: 'repayment',
        jsonData: buildRepaymentPayloadFromClient(client, dueDate),
      });

      if (!createResponse?.success || !createResponse?.result) {
        notification.error({
          message: translate('Failed to open repayment'),
          description: createResponse?.message || translate('Something went wrong'),
        });
        return;
      }

      appendRepaymentToState(createResponse.result);
      openRepaymentEditor(createResponse.result);
      window.dispatchEvent(new Event('repayment-updated'));
    } catch (error) {
      notification.error({
        message: translate('Failed to open repayment'),
        description: error?.message || translate('Something went wrong'),
      });
    }
  };

  const handleEditModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Handle virtual repayment (no _id) - CREATE new
      if (!editingRepayment._id || editingRepayment.isVirtual) {
        const createResponse = await request.create({
          entity: 'repayment',
          jsonData: formatRepaymentPayload({
            ...editingRepayment,
            ...values,
          }),
        });

        if (!createResponse?.success || !createResponse?.result) {
          notification.error({
            message: translate('Create failed'),
            description: createResponse?.message || translate('Something went wrong'),
          });
          return;
        }

        appendRepaymentToState(createResponse.result);
        setEditingRepayment(createResponse.result);
        window.dispatchEvent(new Event('repayment-updated'));
        notification.success({
          message: translate('Repayment created successfully'),
        });
      } else {
        // UPDATE existing
        const updateResponse = await request.update({
          entity: 'repayment',
          id: editingRepayment._id,
          jsonData: formatRepaymentPayload(values),
        });

        if (!updateResponse?.success || !updateResponse?.result) {
          notification.error({
            message: translate('Update failed'),
            description: updateResponse?.message || translate('Something went wrong'),
          });
          return;
        }

        updateRepaymentInState(updateResponse.result);
        setEditingRepayment(updateResponse.result);
        window.dispatchEvent(new Event('repayment-updated'));
        notification.success({
          message: translate('Repayment updated successfully'),
        });
      }

      dispatch(erp.list({ entity: 'payment' }));
      setIsEditModalOpen(false);
      form.resetFields();

    } catch (error) {
      notification.error({
        message: translate('Operation failed'),
        description: error?.message || translate('Something went wrong'),
      });
    }
  };

  return (
    <ErpLayout>
      <PageHeader
        onBack={() => window.history.back()}
        backIcon={<ArrowLeftOutlined />}
        title={
          <Space>
            <CalendarOutlined style={{ color: BOX_TEXT }} />
            {translate('Loans Calendar')}
          </Space>
        }
        ghost={false}
        extra={[
          <div key="search-filter-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <Input
              key="search-clients"
              allowClear
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={translate('search')}
              value={searchTerm}
              style={{ width: '100%', minWidth: 150, maxWidth: 210 }}
            />
            <Select
              key="status-filter"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%', minWidth: 100, maxWidth: 150 }}
              options={[
                { label: translate('all'), value: 'all' },
                { label: translate('active'), value: 'active' },
                { label: translate('paid'), value: 'paid' },
                { label: translate('defaulted'), value: 'defaulted' },
              ]}
            />
            <Button key="refresh-clients" icon={<RedoOutlined />} onClick={loadClients}>
              {translate('Refresh')}
            </Button>
          </div>,
        ]}
        style={{
          padding: '18px 14px',
          borderRadius: 10,
          background: HEADER_BG,
          marginBottom: 12,
        }}
      />

      <Spin spinning={isLoading}>
        <Row gutter={[12, 12]} style={{ marginBottom: 8 }}>
          <Col xs={24} md={8}>
            <Card size="small" bordered={false} style={{ background: '#f4fbfc' }}>
              <Space>
                <Avatar size={32} icon={<UserOutlined />} style={{ background: BOX_BORDER }} />
                <div>
                  <Typography.Text type="secondary">{translate('Clients in View')}</Typography.Text>
                  <div style={{ fontWeight: 600 }}>{filteredClients.length}</div>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" bordered={false} style={{ background: '#f4fbfc' }}>
              <Space>
                <Avatar size={32} icon={<CalendarOutlined />} style={{ background: '#1890ff' }} />
                <div>
                  <Typography.Text type="secondary">{translate('Due Entries This Month')}</Typography.Text>
                  <div style={{ fontWeight: 600 }}>{totalDueClients}</div>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" bordered={false} style={{ background: '#f4fbfc' }}>
              <Space>
                <Avatar size={32} icon={<DollarOutlined />} style={{ background: '#13a78f' }} />
                <div>
                  <Typography.Text type="secondary">{translate('Month')}</Typography.Text>
                  <div style={{ fontWeight: 600 }}>
                    {isMobile
                      ? `${weekDays[0].format('DD MMM')} - ${weekDays[6].format('DD MMM YYYY')}`
                      : currentDate.format('MMMM YYYY')}
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <Card bordered={false} style={{ borderRadius: 12 }}>
          {/* Legend - Scrollable on mobile */}
          <div
            className="calendar-legend"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginBottom: 20,
              background: "#fafafa",
              padding: "12px 16px",
              borderRadius: 6,
              border: "1px solid #f0f0f0",
              flexWrap: 'wrap',
              gap: '12px 16px',
              width: '100%',
              overflowX: 'auto'
            }}
          >
            <LegendItem color={repaymentStatusColor.paid} label="Paid" />
            <LegendItem color={repaymentStatusColor.late} label="Late Payment" />
            <LegendItem color={repaymentStatusColor.partial} label="Partial" />
            <LegendItem color={repaymentStatusColor.default} label="Default" />
            <LegendItem color={repaymentStatusColor['not-started']} label="Not Started" />
          </div>
          <div className="calendar-mobile-wrapper repayment-calendar-wrapper">
            <div className="week-nav-bar">
              <button type="button" className="nav-icon-btn" onClick={goToPreviousWeek}>
                ←
              </button>
              <div className="week-center">
                <button type="button" className="today-pill" onClick={goToToday}>
                  Today
                </button>
                <div className="week-range">
                  {startOfWeek.format('DD MMM')} - {endOfWeek.format('DD MMM YYYY')}
                </div>
              </div>
              <button type="button" className="nav-icon-btn" onClick={goToNextWeek}>
                →
              </button>
            </div>
            {isMobile ? (
              <>
                <DatePicker
                  picker="week"
                  value={currentDate}
                  onChange={(date) => {
                    if (date) {
                      setCurrentDate(date);
                    }
                  }}
                  style={{ width: '100%', marginBottom: 12 }}
                />
                <div className="weekly-calendar">
                  {weekDays.map((day) => {
                    const dayClients = filteredClientsByRole.filter((client) => {
                      const repayment = getPaymentStatus(client, day);
                      return Boolean(repayment);
                    });

                    return (
                      <div key={day.format('YYYY-MM-DD')} className="week-day">
                        <div className="week-date">{day.format('DD MMM YYYY')}</div>
                        {dayClients.length ? (
                          dayClients.map((client) => {
                            const repayment = getPaymentStatus(client, day);
                            const repaymentForDisplay = repayment || { status: 'not-started', date: day.toDate() };

                            return (
                              <div
                                key={`${client._id}-${day.format('YYYY-MM-DD')}`}
                                className={`week-entry ${getStatusClassName(repaymentForDisplay)}`}
                                onClick={() => handleClientClick(client, day.format('YYYY-MM-DD'), repayment)}
                                style={{ cursor: 'pointer', opacity: repayment ? 1 : 0.9 }}
                              >
                                {client?.name}
                              </div>
                            );
                          })
                        ) : (
                          <Typography.Text type="secondary">{translate('No repayments')}</Typography.Text>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <Calendar
                fullscreen
                value={currentDate}
                onPanelChange={(value) => setCurrentDate(value)}
                onChange={(value) => setCurrentDate(value)}
                fullCellRender={(date) => {
                  if (!date.isSame(currentDate, 'month')) {
                    return <div style={{ minHeight: 122, padding: 8, background: '#fafafa' }} />;
                  }

                  const dayClients = clientsByDay[date.date()] || [];
                  const visible = dayClients.slice(0, 2);
                  const hiddenCount = Math.max(dayClients.length - visible.length, 0);

                  return (
                    <div
                      className="calendar-cell"
                      style={{
                        minHeight: 122,
                        padding: 8,
                        borderRadius: 8,
                        border: dayClients.length ? '1px solid rgba(40,167,171,0.28)' : '1px solid #f0f0f0',
                        background: dayClients.length ? '#fcffff' : '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography.Text strong style={{ fontSize: 12 }}>
                          {date.date()}
                        </Typography.Text>
                        {dayClients.length ? (
                          <Badge
                            count={dayClients.length}
                            style={{ backgroundColor: BOX_BORDER, boxShadow: 'none', fontSize: 10 }}
                          />
                        ) : null}
                      </div>
                      <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 8 }}>
                        {visible.map((client) => {
                          const repayment = getPaymentStatus(client, date);
                          const repaymentForDisplay = repayment || { status: 'not-started', date: date.toDate() };

                          return (
                            <button
                              type="button"
                              key={`${client._id}-${date.date()}`}
                              className={`calendar-client-entry ${getStatusClassName(repaymentForDisplay)}`}
                              onClick={() => handleClientClick(client, date.format('YYYY-MM-DD'), repayment)}
                            >
                              {client?.name}
                            </button>
                          );
                        })}
                        {hiddenCount > 0 ? (
                          <Typography.Text style={{ color: BOX_TEXT, fontSize: 12 }}>
                            +{hiddenCount} {translate('more')}
                          </Typography.Text>
                        ) : null}
                      </Space>
                    </div>
                  );
                }}
              />
            )}
          </div>
        </Card>
      </Spin>

      <Modal
        title={translate('Edit Repayment')}
        open={isEditModalOpen}
        onOk={handleEditModalOk}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingRepayment(null);
          form.resetFields();
        }}
        width={window.innerWidth < 768 ? '95%' : 720}
        style={{ top: 24 }}
      >
        <Form form={form} layout="vertical">
          <RepaymentForm isUpdateForm={true} />
        </Form>
      </Modal>
    </ErpLayout>
  );
}
