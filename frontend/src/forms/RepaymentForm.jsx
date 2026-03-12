import { Form, Input, InputNumber, Select, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo } from 'react';
import SelectAsync from '@/components/SelectAsync';
import useLanguage from '@/locale/useLanguage';
import { useDate } from '@/settings';

const STATUS_OPTIONS = [
    { label: 'Paid', value: 'paid' },
    { label: 'Default', value: 'default' },
    { label: 'Partial', value: 'partial' },
    { label: 'Not Started', value: 'not_started' },
];

const normalizeRepaymentStatus = (status) => {
    const normalizedStatus = String(status || '').trim().toLowerCase();

    if (normalizedStatus === 'late payment') return 'late';
    if (normalizedStatus === 'not-started' || normalizedStatus === 'not started') return 'not_started';

    return normalizedStatus || 'not_started';
};

const allowedTransitions = {
    paid: [],
    not_started: ['paid', 'default', 'partial'],
    partial: ['paid'],
    default: ['paid', 'partial'],
    late: [],
};

export default function RepaymentForm({ isUpdateForm = false }) {
    const translate = useLanguage();
    const { dateFormat } = useDate();
    const { TextArea } = Input;
    const form = Form.useFormInstance();
    const amount = Form.useWatch('amount', form);
    const status = Form.useWatch('status', form);
    const amountPaid = Form.useWatch('amountPaid', form);
    const originalStatus = Form.useWatch('_originalStatus', form);
    const normalizedOriginalStatus = normalizeRepaymentStatus(originalStatus || status);
    const normalizedStatus = normalizeRepaymentStatus(status);
    const totalAmount = Number(amount) || 0;
    const paidAmount = Number(amountPaid) || 0;
    const balanceAmount = Math.max(0, totalAmount - paidAmount);

    const statusOptions = useMemo(() => {
        if (!isUpdateForm) {
            return STATUS_OPTIONS.filter((option) => option.value !== 'late');
        }

        const allowedStatuses = allowedTransitions[normalizedOriginalStatus] || [];
        const currentStatusOption = STATUS_OPTIONS.find((option) => option.value === normalizedOriginalStatus);
        const transitionOptions = STATUS_OPTIONS.filter((option) => allowedStatuses.includes(option.value));
        const mergedOptions = currentStatusOption ? [currentStatusOption, ...transitionOptions] : transitionOptions;

        return mergedOptions.filter(
            (option, index, options) => options.findIndex((item) => item.value === option.value) === index
        );
    }, [isUpdateForm, normalizedOriginalStatus]);

    useEffect(() => {
        if (isUpdateForm && normalizedOriginalStatus === 'paid' && normalizedStatus !== 'paid') {
            form.setFieldValue('status', 'paid');
        }
    }, [form, isUpdateForm, normalizedOriginalStatus, normalizedStatus]);

    useEffect(() => {
        if (normalizedStatus === 'paid' && totalAmount > 0) {
            form.setFieldValue('amountPaid', totalAmount);
        }
    }, [form, normalizedStatus, totalAmount]);

    return (
        <>
            <Form.Item
                label={translate('Client')}
                name="client"
                rules={[{ required: true }]}
            >
                <SelectAsync
                    entity={'client'}
                    displayLabels={['name']}
                    placeholder={translate('select_client')}
                    disabled={isUpdateForm}
                />
            </Form.Item>

            <Form.Item
                label={translate('Date')}
                name="date"
                rules={[{ required: true }]}
                initialValue={dayjs()}
                getValueProps={(value) => ({
                    value: value ? dayjs(value) : undefined,
                })}
            >
                <DatePicker style={{ width: '100%' }} format={dateFormat} />
            </Form.Item>

            <Form.Item
                label={translate('Total Amount')}
                name="amount"
                rules={[{ required: true }]}
                style={{
                    display: 'inline-block',
                    width: 'calc(33%)',
                    paddingRight: '5px',
                }}
            >
                <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>

            <Form.Item
                label={translate('Principal')}
                name="principal"
                style={{
                    display: 'inline-block',
                    width: 'calc(33%)',
                    paddingRight: '5px',
                    paddingLeft: '5px',
                }}
            >
                <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>

            <Form.Item
                label={translate('Interest')}
                name="interest"
                style={{
                    display: 'inline-block',
                    width: 'calc(25%)',
                    paddingRight: '5px',
                    paddingLeft: '5px',
                }}
            >
                <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>

            <Form.Item
                label={translate('Status')}
                name="status"
                rules={[{ required: true }]}
                initialValue={'not_started'}
            >
                <Select
                    options={statusOptions}
                    disabled={isUpdateForm && statusOptions.length === 0}
                />
            </Form.Item>

            {normalizedStatus === 'partial' && (
                <Form.Item
                    label={translate('Amount Paid')}
                    name="amountPaid"
                    preserve
                    rules={[
                        { required: true, message: translate('Amount Paid is required') },
                        {
                            validator: (_, value) => {
                                const currentTotalAmount = Number(form.getFieldValue('amount')) || 0;
                                const currentPaidAmount = Number(value) || 0;

                                if (currentPaidAmount <= 0) {
                                    return Promise.reject(new Error(translate('Amount Paid must be greater than 0')));
                                }

                                if (currentPaidAmount >= currentTotalAmount) {
                                    return Promise.reject(
                                        new Error(translate('Amount Paid must be less than Total Amount'))
                                    );
                                }

                                if (currentPaidAmount > currentTotalAmount) {
                                    return Promise.reject(
                                        new Error(translate('Amount Paid cannot exceed Total Amount'))
                                    );
                                }

                                return Promise.resolve();
                            },
                        },
                    ]}
                >
                    <InputNumber min={0} max={amount || undefined} style={{ width: '100%' }} />
                </Form.Item>
            )}

            {normalizedStatus === 'partial' && (
                <Form.Item label={translate('Balance')}>
                    <InputNumber value={balanceAmount} readOnly disabled style={{ width: '100%' }} />
                </Form.Item>
            )}

            {normalizedStatus === 'paid' && (
                <Form.Item
                    label={translate('Payment Date')}
                    name="paymentDate"
                    preserve
                    rules={[{ required: true, message: translate('select_payment_date') }]}
                    getValueProps={(value) => ({
                        value: value ? dayjs(value) : undefined,
                    })}
                >
                    <DatePicker
                        style={{ width: '100%' }}
                        format={dateFormat}
                        placeholder={translate('select_payment_date')}
                    />
                </Form.Item>
            )}

            <Form.Item label={translate('Notes')} name="notes">
                <TextArea />
            </Form.Item>
        </>
    );
}
