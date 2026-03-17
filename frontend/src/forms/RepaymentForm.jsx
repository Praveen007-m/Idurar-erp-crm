/**
 * RepaymentForm.jsx — Webaac Solutions Finance Management
 * Fixes:
 *  - Mobile responsive layout (xs breakpoints)
 *  - Proper status normalization
 *  - amountPaid not watched (prevents cursor-jump)
 *  - Hidden fields rendered so form.setFieldValue works
 *  - paymentDate required for paid/late
 */
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Row,
  Col,
  Button,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useCallback } from 'react';
import SelectAsync from '@/components/SelectAsync';
import useLanguage from '@/locale/useLanguage';
import { useDate } from '@/settings';

const STATUS_OPTIONS = [
  { label: 'Paid',        value: 'paid'        },
  { label: 'Default',     value: 'default'     },
  { label: 'Partial',     value: 'partial'     },
  { label: 'Not Started', value: 'not_started' },
  { label: 'Late',        value: 'late'        },
];

const STATUS_COLOR = {
  paid:        'green',
  late:        'volcano',
  partial:     'orange',
  default:     'red',
  not_started: 'default',
};

const normalizeRepaymentStatus = (status) => {
  const s = String(status || '').trim().toLowerCase().replace(/[\s-]/g, '_');
  if (s === 'late_payment') return 'late';
  if (s === 'not_paid')     return 'default';
  return s || 'not_started';
};

const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

export default function RepaymentForm({ isUpdateForm = false }) {
  const translate      = useLanguage();
  const { dateFormat } = useDate();
  const { TextArea }   = Input;
  const form           = Form.useFormInstance();

  /* ── Watched values (amountPaid intentionally NOT watched — prevents cursor-jump) */
  const amount            = Form.useWatch('amount',            form);
  const status            = Form.useWatch('status',            form);
  const originalStatus    = Form.useWatch('_originalStatus',   form);
  const additionalPayment = Form.useWatch('additionalPayment', form);
  const paymentDate       = Form.useWatch('paymentDate',       form);
  const dueDate           = Form.useWatch('date',              form);
  const client            = Form.useWatch('client',            form);

  /* ── Safe numerics */
  const totalAmount  = round2(Number(amount) || 0);
  const paidAmount   = round2(Number(form.getFieldValue('amountPaid')) || 0);
  const addPayment   = round2(Number(additionalPayment) || 0);
  const originalPaid = round2(Number(form.getFieldValue('_originalAmountPaid')) || 0);

  const normalizedStatus         = normalizeRepaymentStatus(status);
  const normalizedOriginalStatus = normalizeRepaymentStatus(originalStatus || status);

  const isStatusReadonly = ['paid', 'late'].includes(normalizedOriginalStatus);
  const isFirstPartial   = normalizedStatus === 'partial' && originalPaid <= 0;
  const balanceAmount    = round2(Math.max(0, totalAmount - (paidAmount + addPayment)));

  /* ── Status options */
  const statusOptions = useMemo(() => {
    if (!isUpdateForm) return STATUS_OPTIONS;
    switch (normalizedOriginalStatus) {
      case 'not_started': return STATUS_OPTIONS.filter(o => ['paid', 'partial', 'default'].includes(o.value));
      case 'default':     return STATUS_OPTIONS.filter(o => ['paid', 'partial'].includes(o.value));
      case 'partial':     return STATUS_OPTIONS.filter(o => ['paid'].includes(o.value));
      case 'paid':        return STATUS_OPTIONS.filter(o => o.value === 'paid');
      case 'late':        return STATUS_OPTIONS.filter(o => o.value === 'late');
      default:            return STATUS_OPTIONS;
    }
  }, [isUpdateForm, normalizedOriginalStatus]);

  /* ── Effects */
  useEffect(() => {
    if (isUpdateForm && normalizedOriginalStatus === 'paid') {
      form.setFieldValue('status', 'paid');
    }
  }, [form, isUpdateForm, normalizedOriginalStatus]);

  useEffect(() => {
    if (['paid', 'late'].includes(normalizedStatus) && totalAmount > 0) {
      form.setFieldValue('amountPaid', totalAmount);
    }
  }, [form, normalizedStatus, totalAmount]);

  useEffect(() => {
    if (
      normalizedStatus === 'paid' && paymentDate && dueDate &&
      dayjs(paymentDate).isAfter(dueDate)
    ) {
      form.setFieldValue('status', 'late');
    }
  }, [form, normalizedStatus, paymentDate, dueDate]);

  useEffect(() => {
    if (isStatusReadonly && normalizedStatus !== normalizedOriginalStatus) {
      form.setFieldValue('status', normalizedOriginalStatus);
    }
  }, [form, isStatusReadonly, normalizedStatus, normalizedOriginalStatus]);

  useEffect(() => {
    if (!isUpdateForm) return;
    const initialPaid = form.getFieldValue('amountPaid') ?? 0;
    form.setFieldValue('_originalAmountPaid', initialPaid);
  }, [isUpdateForm, client, dueDate]);

  /* ── Partial payment */
  const handlePartialPayment = useCallback(() => {
    const remainingBalance = totalAmount - paidAmount;
    if (addPayment <= 0) {
      form.setFields([{ name: 'additionalPayment', errors: ['Additional payment must be greater than 0'] }]);
      return;
    }
    if (paidAmount + addPayment > totalAmount) {
      form.setFields([{ name: 'additionalPayment', errors: [`Exceeds remaining balance: ${remainingBalance.toFixed(2)}`] }]);
      return;
    }
    form.setFieldsValue({ amountPaid: round2(paidAmount + addPayment), additionalPayment: undefined });
  }, [paidAmount, addPayment, totalAmount, form]);

  return (
    <>
      {/* Status badge (read-only display) */}
      {isUpdateForm && normalizedStatus && (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>Current Status:</span>
          <Tag color={STATUS_COLOR[normalizedStatus] || 'default'} style={{ borderRadius: 12, fontSize: 13, margin: 0 }}>
            {STATUS_OPTIONS.find(o => o.value === normalizedStatus)?.label || normalizedStatus}
          </Tag>
        </div>
      )}

      {/* CLIENT */}
      <Form.Item label={translate('Client')} name="client" rules={[{ required: true }]}>
        <SelectAsync
          entity="client"
          displayLabels={['name']}
          placeholder={translate('select_client')}
          disabled={isUpdateForm}
        />
      </Form.Item>

      {/* DUE DATE + TOTAL AMOUNT */}
      <Row gutter={[12, 0]}>
        <Col xs={24} sm={12}>
          <Form.Item
            label={translate('Due Date')}
            name="date"
            rules={[{ required: true }]}
            initialValue={dayjs()}
            getValueProps={(v) => ({ value: v ? dayjs(v) : undefined })}
          >
            <DatePicker style={{ width: '100%' }} format={dateFormat} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item label={translate('Total Amount')} name="amount" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      {/* PRINCIPAL + INTEREST */}
      <Row gutter={[12, 0]}>
        <Col xs={12}>
          <Form.Item label={translate('Principal')} name="principal">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={12}>
          <Form.Item label={translate('Interest')} name="interest">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      {/* STATUS */}
      <Form.Item label={translate('Status')} name="status" rules={[{ required: true }]} initialValue="not_started">
        <Select options={statusOptions} disabled={isStatusReadonly} />
      </Form.Item>

      {/* Hidden tracking fields — must be rendered for setFieldValue to work */}
      <Form.Item name="_originalStatus"     hidden noStyle><Input /></Form.Item>
      <Form.Item name="_originalAmountPaid" hidden noStyle><Input /></Form.Item>

      {/* ── PARTIAL FLOW ──────────────────────────────────────────────────── */}
      {normalizedStatus === 'partial' && (
        <>
          {isFirstPartial ? (
            <Form.Item
              label={translate('Amount Paid')}
              name="amountPaid"
              rules={[{ required: true, message: 'Enter payment amount' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter first payment"
                precision={2}
                controls={false}
                min={0}
                max={totalAmount}
              />
            </Form.Item>
          ) : (
            <Row gutter={[12, 0]} align="middle">
              <Col xs={24} sm={8}>
                <Form.Item label={translate('Amount Paid')} name="amountPaid">
                  <InputNumber disabled precision={2} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={16} sm={10}>
                <Form.Item label={translate('Additional Payment')} name="additionalPayment">
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="Enter additional amount"
                  />
                </Form.Item>
              </Col>
              <Col xs={8} sm={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Form.Item style={{ marginBottom: 24, width: '100%' }}>
                  <Button
                    type="primary"
                    onClick={handlePartialPayment}
                    disabled={!additionalPayment || addPayment <= 0}
                    block
                  >
                    {translate('Pay')}
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          )}
          <Form.Item label={translate('Balance')}>
            <InputNumber value={balanceAmount} readOnly disabled precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </>
      )}

      {/* ── PAID / LATE FLOW ──────────────────────────────────────────────── */}
      {['paid', 'late'].includes(normalizedStatus) && (
        <>
          <Form.Item
            label={translate('Payment Date')}
            name="paymentDate"
            rules={[{ required: true, message: 'Payment date is required' }]}
            getValueProps={(v) => ({ value: v ? dayjs(v) : undefined })}
          >
            <DatePicker style={{ width: '100%' }} format={dateFormat} />
          </Form.Item>
          {/* amountPaid hidden — managed by effect */}
          <Form.Item name="amountPaid" hidden noStyle><InputNumber /></Form.Item>
        </>
      )}

      {/* amountPaid hidden for not_started / default (no interaction needed) */}
      {['not_started', 'default'].includes(normalizedStatus) && (
        <Form.Item name="amountPaid" hidden noStyle><InputNumber /></Form.Item>
      )}

      {/* NOTES */}
      <Form.Item label={translate('Notes')} name="notes">
        <TextArea rows={3} />
      </Form.Item>
    </>
  );
}
