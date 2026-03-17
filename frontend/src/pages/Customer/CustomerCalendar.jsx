/**
 * pages/customer/CustomerCalendar.jsx — Webaac Solutions Finance Management
 *
 * Mobile fixes applied:
 *  1. Calendar overflows → mobile switches to week/list view, no horizontal scroll
 *  2. Header (Client/Amount/Term) → stacked cards on xs, clear typography
 *  3. Stats cards (Paid/Pending/Total) → xs={24} stacked, larger tap area
 *  4. Calendar cells → larger min-height on mobile, bigger font
 *  5. Month/Year nav → sticky top bar on mobile with large prev/next buttons
 *  6. Modal → 95vw on mobile, stacked cols
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftOutlined, CalendarOutlined, UserOutlined,
  DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, LeftOutlined, RightOutlined,
} from '@ant-design/icons';
import {
  Avatar, Badge, Button, Calendar, Card, Col, Row,
  Space, Spin, Tag, Typography, Modal, Grid, Divider,
} from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import dayjs from 'dayjs';
import { ErpLayout } from '@/layout';
import { crud } from '@/redux/crud/actions';
import { selectReadItem } from '@/redux/crud/selectors';
import { useDispatch, useSelector } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { useMoney, useDate } from '@/settings';
import { request } from '@/request';
import { repaymentStatusColor } from '@/utils/repaymentStatusColor';

const { useBreakpoint } = Grid;

const BOX_BORDER = '#28a7ab';
const BOX_TEXT   = '#117a8b';
const HEADER_BG  = 'linear-gradient(90deg, rgba(40,167,171,0.14) 0%, rgba(24,144,255,0.06) 100%)';

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalizeStatus = (status) => {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'late payment' || s === 'late_payment') return 'late';
  if (s === 'not-paid'     || s === 'not paid')     return 'default';
  if (s === 'not_started'  || s === 'not started' || s === 'not-started') return 'not-started';
  return s || 'not-started';
};

const getDisplayStatus = (repayment) => {
  const today  = new Date();
  const due    = new Date(repayment?.date);
  const status = normalizeStatus(repayment?.status);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  if (status === 'paid')    return 'paid';
  if (status === 'late')    return 'late';
  if (status === 'partial') return 'partial';
  if (today < due)          return 'not-started';
  return 'default';
};

const LegendDot = ({ color, label }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
    <span style={{ width: 12, height: 12, background: color, borderRadius: 3, display: 'inline-block', flexShrink: 0 }} />
    <span style={{ fontSize: 12 }}>{label}</span>
  </span>
);

// ── Mobile week list view ─────────────────────────────────────────────────────

function WeekListView({ weekDays, eventsByDate, moneyFormatter, onEventClick }) {
  return (
    <div>
      {weekDays.map((day) => {
        const key    = day.format('YYYY-MM-DD');
        const events = eventsByDate[key] || [];
        const isToday = day.isSame(dayjs(), 'day');

        return (
          <div
            key={key}
            style={{
              marginBottom: 10,
              borderRadius: 10,
              border:       events.length ? `1px solid ${BOX_BORDER}44` : '1px solid #f0f0f0',
              overflow:     'hidden',
            }}
          >
            {/* Day header */}
            <div
              style={{
                background:  isToday ? BOX_BORDER : '#f5f5f5',
                color:       isToday ? '#fff' : '#595959',
                padding:     '8px 14px',
                fontWeight:  600,
                fontSize:    13,
                display:     'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{day.format('ddd, DD MMM')}</span>
              {events.length > 0 && (
                <Badge
                  count={events.length}
                  style={{ backgroundColor: isToday ? '#fff' : BOX_BORDER, color: isToday ? BOX_BORDER : '#fff' }}
                />
              )}
            </div>

            {/* Events */}
            {events.length > 0 ? (
              <div style={{ padding: '8px 12px', background: '#fff' }}>
                {events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event.repayment)}
                    style={{
                      display:        'flex',
                      justifyContent: 'space-between',
                      alignItems:     'center',
                      padding:        '10px 12px',
                      marginBottom:   6,
                      borderRadius:   8,
                      background:     `${event.color}18`,
                      border:         `1px solid ${event.color}55`,
                      cursor:         'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 10, height: 10,
                          borderRadius: '50%',
                          background: event.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 14, color: event.color }}>
                        {moneyFormatter({ amount: event.repayment.amount })}
                      </span>
                    </div>
                    <Tag
                      color={event.color}
                      style={{ borderRadius: 20, fontSize: 11, margin: 0 }}
                    >
                      {event.status.replace('-', ' ').toUpperCase()}
                    </Tag>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '10px 14px', color: '#bfbfbf', fontSize: 13 }}>
                No repayments
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CustomerCalendar() {
  const { clientId }       = useParams();
  const translate          = useLanguage();
  const { moneyFormatter } = useMoney();
  const { dateFormat }     = useDate();
  const navigate           = useNavigate();
  const dispatch           = useDispatch();
  const screens            = useBreakpoint();
  const isMobile           = !screens.md;

  const { result: client, isLoading: isClientLoading } = useSelector(selectReadItem);

  const [repayments,         setRepayments]         = useState([]);
  const [isRepaymentsLoading, setIsRepaymentsLoading] = useState(false);
  const [calendarMonth,      setCalendarMonth]      = useState(dayjs());
  const [modalOpen,          setModalOpen]          = useState(false);
  const [selectedRepayment,  setSelectedRepayment]  = useState(null);

  // Mobile: current week
  const [weekStart, setWeekStart] = useState(dayjs().startOf('week'));
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')),
    [weekStart]
  );

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchRepayments = useCallback(async () => {
    setIsRepaymentsLoading(true);
    try {
      const response = await request.get({ entity: `repayment/client/${clientId}` });
      if (response.success) setRepayments(response.result || []);
      else setRepayments([]);
    } catch {
      setRepayments([]);
    } finally {
      setIsRepaymentsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    dispatch(crud.read({ entity: 'client', id: clientId }));
    fetchRepayments();
    const handler = () => fetchRepayments();
    window.addEventListener('repayment-updated', handler);
    return () => window.removeEventListener('repayment-updated', handler);
  }, [clientId, fetchRepayments]);

  // ── Calendar events ──────────────────────────────────────────────────────
  const calendarEvents = useMemo(() =>
    repayments.map((r) => {
      const status = getDisplayStatus(r);
      return {
        id:        r._id,
        date:      dayjs(r.date),
        color:     repaymentStatusColor[status] || repaymentStatusColor['not-started'],
        repayment: r,
        status,
      };
    }),
    [repayments]
  );

  const eventsByDate = useMemo(() => {
    const map = {};
    calendarEvents.forEach((e) => {
      const k = e.date.format('YYYY-MM-DD');
      if (!map[k]) map[k] = [];
      map[k].push(e);
    });
    return map;
  }, [calendarEvents]);

  // ── Totals ───────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const paid = repayments
      .filter((r) => ['paid', 'late'].includes(normalizeStatus(r.status)))
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const pending = repayments
      .filter((r) => !['paid', 'late'].includes(normalizeStatus(r.status)))
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    return { paid, pending, total: paid + pending };
  }, [repayments]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openRepayment = (repayment) => {
    setSelectedRepayment(repayment);
    setModalOpen(true);
  };

  const handleDateClick = (date) => {
    const events = eventsByDate[date.format('YYYY-MM-DD')];
    if (events?.length) openRepayment(events[0].repayment);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <ErpLayout>
      <Spin spinning={isClientLoading}>

        {/* ── Page Header ── */}
        <PageHeader
          onBack={() => navigate('/customer')}
          backIcon={<ArrowLeftOutlined />}
          title={
            <Space>
              <CalendarOutlined style={{ color: BOX_TEXT }} />
              <span style={{ fontSize: isMobile ? 14 : 18 }}>{translate('Repayment Calendar')}</span>
            </Space>
          }
          ghost={false}
          extra={[
            <Button
              key="view-list"
              size={isMobile ? 'small' : 'middle'}
              onClick={() => navigate(`/repayment/client/${clientId}`)}
            >
              {translate('View List')}
            </Button>,
          ]}
          style={{
            padding:      isMobile ? '10px 12px' : '18px 14px',
            borderRadius: 10,
            background:   HEADER_BG,
            marginBottom: 12,
          }}
        />

        {/* ── Client Info ── */}
        <Card
          bordered={false}
          size="small"
          style={{ borderRadius: 12, marginBottom: 12 }}
          bodyStyle={{ padding: isMobile ? '14px 12px' : '16px 20px' }}
        >
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={8}>
              <Space>
                <Avatar size={isMobile ? 40 : 48} icon={<UserOutlined />} style={{ background: BOX_BORDER, flexShrink: 0 }} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>{translate('Client')}</Typography.Text>
                  <div style={{ fontWeight: 700, fontSize: isMobile ? 15 : 17 }}>{client?.name || '—'}</div>
                </div>
              </Space>
            </Col>
            <Col xs={12} sm={8}>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                <DollarOutlined /> {translate('Loan Amount')}
              </Typography.Text>
              <div style={{ fontWeight: 600, fontSize: isMobile ? 14 : 16 }}>
                {moneyFormatter({ amount: client?.loanAmount })}
              </div>
            </Col>
            <Col xs={12} sm={8}>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                <ClockCircleOutlined /> {translate('Term')}
              </Typography.Text>
              <div style={{ fontWeight: 600, fontSize: isMobile ? 14 : 16 }}>
                {client?.term} {translate('Installments')}
              </div>
            </Col>
          </Row>
        </Card>

        {/* ── Summary Stats ── */}
        <Row gutter={[10, 10]} style={{ marginBottom: 12 }}>
          {[
            { label: translate('Paid'),    value: totals.paid,    color: '#52c41a', bg: '#f6ffed', icon: <CheckCircleOutlined />    },
            { label: translate('Pending'), value: totals.pending, color: '#fa8c16', bg: '#fff2e8', icon: <ExclamationCircleOutlined /> },
            { label: translate('Total'),   value: totals.total,   color: '#1890ff', bg: '#e6f7ff', icon: <DollarOutlined />          },
          ].map(({ label, value, color, bg, icon }) => (
            <Col xs={24} sm={8} key={label}>
              <Card
                size="small" bordered={false}
                style={{ background: bg, borderRadius: 10, border: `1px solid ${color}33` }}
                bodyStyle={{ padding: isMobile ? '12px 14px' : '14px 18px' }}
              >
                <Space>
                  <span style={{ color, fontSize: isMobile ? 20 : 22 }}>{icon}</span>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>{label}</Typography.Text>
                    <div style={{ fontWeight: 700, color, fontSize: isMobile ? 15 : 17 }}>
                      {moneyFormatter({ amount: value })}
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        {/* ── Legend ── */}
        <Card
          bordered={false} size="small"
          style={{ borderRadius: 10, marginBottom: 12 }}
          bodyStyle={{ padding: '10px 14px' }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
            <LegendDot color={repaymentStatusColor.paid}           label="Paid"        />
            <LegendDot color={repaymentStatusColor.late}           label="Late"        />
            <LegendDot color={repaymentStatusColor.partial}        label="Partial"     />
            <LegendDot color={repaymentStatusColor.default}        label="Default"     />
            <LegendDot color={repaymentStatusColor['not-started']} label="Not Started" />
          </div>
        </Card>

        {/* ── Calendar ── */}
        <Card bordered={false} style={{ borderRadius: 12 }} bodyStyle={{ padding: isMobile ? '12px 10px' : '20px' }}>
          <Spin spinning={isRepaymentsLoading}>

            {isMobile ? (
              /* ── MOBILE: week navigation + list ── */
              <>
                {/* Week nav bar */}
                <div
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    marginBottom:   14,
                    gap:            8,
                  }}
                >
                  <Button
                    icon={<LeftOutlined />}
                    onClick={() => setWeekStart((p) => p.subtract(1, 'week'))}
                    style={{ minWidth: 44, minHeight: 44 }}
                  />
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: BOX_TEXT }}>
                      {weekStart.format('DD MMM')} – {weekStart.add(6, 'day').format('DD MMM YYYY')}
                    </div>
                    <Button
                      size="small" type="link"
                      onClick={() => setWeekStart(dayjs().startOf('week'))}
                      style={{ padding: 0, fontSize: 12 }}
                    >
                      Today
                    </Button>
                  </div>
                  <Button
                    icon={<RightOutlined />}
                    onClick={() => setWeekStart((p) => p.add(1, 'week'))}
                    style={{ minWidth: 44, minHeight: 44 }}
                  />
                </div>

                <WeekListView
                  weekDays={weekDays}
                  eventsByDate={eventsByDate}
                  moneyFormatter={moneyFormatter}
                  onEventClick={openRepayment}
                />
              </>
            ) : (
              /* ── DESKTOP: full calendar ── */
              <Calendar
                value={calendarMonth}
                onPanelChange={(v) => setCalendarMonth(v)}
                onSelect={handleDateClick}
                fullCellRender={(date) => {
                  if (!date.isSame(calendarMonth, 'month')) {
                    return <div style={{ minHeight: 100, padding: 6, background: '#fafafa' }} />;
                  }

                  const dateKey  = date.format('YYYY-MM-DD');
                  const dayEvents = eventsByDate[dateKey] || [];
                  const visible  = dayEvents.slice(0, 2);
                  const hidden   = Math.max(dayEvents.length - 2, 0);
                  const isToday  = date.isSame(dayjs(), 'day');

                  return (
                    <div
                      onClick={() => dayEvents.length && handleDateClick(date)}
                      style={{
                        minHeight:  100,
                        padding:    6,
                        borderRadius: 8,
                        border:     dayEvents.length
                          ? '1px solid rgba(40,167,171,0.28)'
                          : isToday ? `2px solid ${BOX_BORDER}` : '1px solid #f0f0f0',
                        background: dayEvents.length ? '#fcffff' : '#ffffff',
                        cursor:     dayEvents.length ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography.Text
                          strong
                          style={{
                            fontSize: 12,
                            color: isToday ? BOX_BORDER : undefined,
                            background: isToday ? `${BOX_BORDER}18` : undefined,
                            borderRadius: 20,
                            width: 22, height: 22,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {date.date()}
                        </Typography.Text>
                        {dayEvents.length > 0 && (
                          <Badge
                            count={dayEvents.length}
                            style={{ backgroundColor: BOX_BORDER, boxShadow: 'none', fontSize: 10 }}
                          />
                        )}
                      </div>
                      <Space direction="vertical" size={2} style={{ width: '100%', marginTop: 4 }}>
                        {visible.map((event) => (
                          <div
                            key={event.id}
                            style={{
                              padding:       '3px 6px',
                              borderRadius:  4,
                              background:    event.color,
                              color:         '#fff',
                              fontSize:      11,
                              fontWeight:    500,
                              overflow:      'hidden',
                              textOverflow:  'ellipsis',
                              whiteSpace:    'nowrap',
                              textAlign:     'center',
                            }}
                          >
                            {moneyFormatter({ amount: event.repayment.amount })}
                          </div>
                        ))}
                        {hidden > 0 && (
                          <Typography.Text style={{ color: BOX_TEXT, fontSize: 10 }}>
                            +{hidden} {translate('more')}
                          </Typography.Text>
                        )}
                      </Space>
                    </div>
                  );
                }}
              />
            )}
          </Spin>
        </Card>

        {/* ── Repayment Detail Modal ── */}
        <Modal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setModalOpen(false)}>
              {translate('Close')}
            </Button>,
            <Button
              key="view-full" type="primary"
              onClick={() => { setModalOpen(false); navigate(`/repayment/client/${clientId}`); }}
            >
              {translate('View Full Details')}
            </Button>,
          ]}
          width={isMobile ? '95vw' : 520}
          style={{ top: isMobile ? 20 : 60 }}
          title={translate('Repayment Details')}
        >
          {selectedRepayment && (() => {
            const status = getDisplayStatus(selectedRepayment);
            return (
              <div>
                {/* Status banner */}
                <div
                  style={{
                    background:   `${repaymentStatusColor[status]}18`,
                    border:       `1px solid ${repaymentStatusColor[status]}44`,
                    borderRadius: 8,
                    padding:      '10px 14px',
                    marginBottom: 16,
                    display:      'flex',
                    justifyContent: 'space-between',
                    alignItems:   'center',
                  }}
                >
                  <Typography.Text style={{ fontWeight: 600, fontSize: 15 }}>
                    {moneyFormatter({ amount: selectedRepayment.amount })}
                  </Typography.Text>
                  <Tag
                    color={repaymentStatusColor[status]}
                    style={{ borderRadius: 20, margin: 0 }}
                  >
                    {status.replace('-', ' ').toUpperCase()}
                  </Tag>
                </div>

                <Row gutter={[14, 14]}>
                  {[
                    { label: translate('Due Date'),  value: dayjs(selectedRepayment.date).format(dateFormat) },
                    { label: translate('Amount'),    value: moneyFormatter({ amount: selectedRepayment.amount }) },
                    { label: translate('Principal'), value: moneyFormatter({ amount: selectedRepayment.principal || 0 }) },
                    { label: translate('Interest'),  value: moneyFormatter({ amount: selectedRepayment.interest  || 0 }) },
                    { label: translate('Amount Paid'), value: moneyFormatter({ amount: selectedRepayment.amountPaid || 0 }) },
                    { label: translate('Balance'),   value: moneyFormatter({ amount: selectedRepayment.balance   || 0 }) },
                  ].map(({ label, value }) => (
                    <Col xs={12} key={label}>
                      <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{label}</Typography.Text>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
                    </Col>
                  ))}
                </Row>
              </div>
            );
          })()}
        </Modal>

      </Spin>
    </ErpLayout>
  );
}
