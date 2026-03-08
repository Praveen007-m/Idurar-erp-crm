import { Form, Input, InputNumber, Select, DatePicker } from 'antd';
import dayjs from 'dayjs';
import SelectAsync from '@/components/SelectAsync';
import useLanguage from '@/locale/useLanguage';
import { useDate } from '@/settings';

export default function RepaymentForm({ isUpdateForm = false }) {
    const translate = useLanguage();
    const { dateFormat } = useDate();
    const { TextArea } = Input;

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
                <InputNumber style={{ width: '100%' }} />
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
                <InputNumber style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
                label={translate('Interest')}
                name="interest"
                style={{
                    display: 'inline-block',
                    width: 'calc(34%)',
                    paddingLeft: '5px',
                }}
            >
                <InputNumber style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
                label={translate('Payment Date')}
                name="paidDate"
                getValueProps={(value) => ({
                    value: value ? dayjs(value) : undefined,
                })}
            >
                <DatePicker style={{ width: '100%' }} format={dateFormat} placeholder={translate('select_payment_date')} />
            </Form.Item>

            <Form.Item
                label={translate('Status')}
                name="status"
                rules={[{ required: true }]}
                initialValue={'paid'}
            >
                <Select
                    options={[
                        { value: 'paid', label: translate('paid') },
                        { value: 'late', label: translate('late') },
                        { value: 'partial', label: translate('partial') },
                        { value: 'default', label: translate('default') },
                        { value: 'not_started', label: translate('not_started') },
                    ]}
                />
            </Form.Item>

            <Form.Item label={translate('Notes')} name="notes">
                <TextArea />
            </Form.Item>
        </>
    );
}
