import { useParams } from 'react-router-dom';
import { notification } from 'antd';
import { Tag, Row, Col, Card, Table, Dropdown, Modal, Form, Button, Descriptions } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import dayjs from 'dayjs';
import { useMoney, useDate } from '@/settings';
import useLanguage from '@/locale/useLanguage';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { crud } from '@/redux/crud/actions';
import { selectListItems, selectReadItem } from '@/redux/crud/selectors';
import { erp } from '@/redux/erp/actions';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ErpLayout } from '@/layout';
import RepaymentForm from '@/forms/RepaymentForm';

const normalizeRepaymentStatus = (status) => {
    const normalizedStatus = String(status || '').trim().toLowerCase();

    if (normalizedStatus === 'late payment') return 'late';
    if (normalizedStatus === 'not-paid' || normalizedStatus === 'not paid') return 'default';
    if (normalizedStatus === 'not_started' || normalizedStatus === 'not started') return 'not-started';

    return normalizedStatus || 'not-started';
};

const STATUS_COLORS = {
    paid: 'green',
    late: 'gold',
    partial: 'orange',
    default: 'red',
    'not-started': 'default',
};

const STATUS_LABELS = {
    paid: 'Paid',
    late: 'Late Payment',
    partial: 'Partial',
    default: 'Default',
    'not-started': 'Not Started',
};

const allowedTransitions = {
    paid: [],
    'not-started': ['paid', 'default', 'partial'],
    partial: ['paid'],
    default: ['paid', 'partial'],
    late: [],
};

const getDisplayStatus = (item) => {
    const today = new Date();
    const due = new Date(item?.date);
    const status = normalizeRepaymentStatus(item?.status);

    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    if (status === 'paid') return 'paid';
    if (status === 'late') return 'late';
    if (status === 'partial') return 'partial';

    if (today < due) return 'not-started';

    return 'default';
};

export default function ClientRepayment() {
    const { id } = useParams();
    const translate = useLanguage();
    const { dateFormat } = useDate();
    const { moneyFormatter } = useMoney();
    const dispatch = useDispatch();

    const { result: client, isLoading: isClientLoading } = useSelector(selectReadItem);
    const { result: repaymentsResult, isLoading: isRepaymentsLoading } = useSelector(selectListItems);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [currentRepayment, setCurrentRepayment] = useState(null);
    const [form] = Form.useForm();
    const [localRepayments, setLocalRepayments] = useState([]);

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

    const mergeRepaymentIntoState = (repayment) => {
        setLocalRepayments((prev) =>
            prev.map((item) =>
                item._id === repayment._id
                    ? {
                        ...item,
                        ...repayment,
                        client: repayment.client || item.client,
                    }
                    : item
            )
        );
    };

    useEffect(() => {
        if (repaymentsResult?.items) {
            setLocalRepayments(repaymentsResult.items);
        }
    }, [repaymentsResult]);

    useEffect(() => {
        dispatch(crud.read({ entity: 'client', id }));
        fetchRepayments();
    }, [dispatch, id]);

    const fetchRepayments = () => {
        dispatch(crud.list({ entity: 'repayment', options: { filter: 'client', equal: id, items: 100 } }));
    };

    const handleEdit = (record) => {
        setCurrentRepayment(record);
        form.setFieldsValue({
            ...record,
            status: normalizeRepaymentStatus(record.status),
            _originalStatus: normalizeRepaymentStatus(record.status),
            date: record.date ? dayjs(record.date) : null,
            paymentDate: record.paidDate ? dayjs(record.paidDate) : (record.paymentDate ? dayjs(record.paymentDate) : null),
            amountPaid: record.amountPaid ?? 0,
        });
        setIsModalOpen(true);
    };

    const handleDelete = (record) => {
        Modal.confirm({
            title: translate('Are you sure you want to delete this repayment?'),
            onOk: async () => {
                await dispatch(crud.delete({ entity: 'repayment', id: record._id }));
                fetchRepayments();
            },
        });
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            const response = await dispatch(
                crud.update({
                    entity: 'repayment',
                    id: currentRepayment._id,
                    jsonData: formatRepaymentPayload(values),
                })
            );

            if (response?.success || response?.result) {
                mergeRepaymentIntoState(response.result);
                dispatch(crud.list({ entity: 'payment' }));
                dispatch(erp.list({ entity: 'payment' }));
                dispatch(crud.list({ entity: 'repayment', options: { filter: 'client', equal: id, items: 100 } }));
                setIsModalOpen(false);
                setCurrentRepayment(null);
                form.resetFields();
                window.dispatchEvent(new Event('payment-updated'));

                notification.success({
                    message: translate('Repayment updated successfully'),
                });
                return;
            }

            notification.error({
                message: translate('Update failed'),
                description: response?.message || translate('Something went wrong'),
            });
        } catch (error) {
            notification.error({
                message: translate('Update failed'),
                description: error.message || translate('Something went wrong'),
            });
        }
    };

    const handleStatusChange = async (record, newStatus) => {
        mergeRepaymentIntoState({ ...record, status: newStatus });

        const response = await dispatch(
            crud.update({
                entity: 'repayment',
                id: record._id,
                jsonData: {
                    status: newStatus,
                    amountPaid:
                        newStatus === 'paid' || newStatus === 'late' ? record.amount : record.amountPaid,
                    paymentDate:
                        newStatus === 'paid' || newStatus === 'late' ? new Date().toISOString() : null,
                },
            })
        );

        if (response?.success || response?.result) {
            mergeRepaymentIntoState(response.result);
            dispatch(crud.list({ entity: 'payment' }));
            dispatch(erp.list({ entity: 'payment' }));
            dispatch(crud.list({ entity: 'repayment', options: { filter: 'client', equal: id, items: 100 } }));
            window.dispatchEvent(new Event('payment-updated'));
        } else {
            mergeRepaymentIntoState(record);
            notification.error({
                message: translate('Update failed'),
                description: response?.message || translate('Something went wrong'),
            });
        }

        window.dispatchEvent(new Event('repayment-updated'));
    };

    const dataTableColumns = [
        {
            title: translate('Date'),
            dataIndex: 'date',
            render: (date) => dayjs(date).format(dateFormat),
        },
        {
            title: translate('Principal'),
            dataIndex: 'principal',
            render: (principal) => moneyFormatter({ amount: principal }),
        },
        {
            title: translate('Interest'),
            dataIndex: 'interest',
            render: (interest) => moneyFormatter({ amount: interest }),
        },
        {
            title: translate('Total'),
            dataIndex: 'amount',
            render: (amount) => moneyFormatter({ amount }),
        },
        {
            title: translate('Status'),
            dataIndex: 'status',
            render: (value, record) => {
                const displayStatus = getDisplayStatus({ ...record, status: value || record.status });
                const color = STATUS_COLORS[displayStatus] || STATUS_COLORS['not-started'];

                return (
                    <Dropdown
                        menu={{
                            items: (allowedTransitions[displayStatus] || []).map((key) => ({
                                key,
                                label: key === 'not-started' ? 'Not Started' : translate(key),
                            })),
                            onClick: ({ key }) => handleStatusChange(record, key),
                        }}
                        trigger={(allowedTransitions[displayStatus] || []).length > 0 ? ['contextMenu'] : []}
                    >
                        <Tag color={color} style={{ cursor: (allowedTransitions[displayStatus] || []).length > 0 ? 'pointer' : 'default' }}>
                            {STATUS_LABELS[displayStatus] || displayStatus.replace('-', ' ').toUpperCase()}
                        </Tag>
                    </Dropdown>
                );
            },
        },
        {
            title: '',
            key: 'action',
            render: (_, record) => (
                <div style={{ display: 'flex', gap: '10px' }}>
                    <EditOutlined onClick={() => handleEdit(record)} style={{ cursor: 'pointer', color: '#1890ff' }} />
                    <DeleteOutlined onClick={() => handleDelete(record)} style={{ cursor: 'pointer', color: '#ff4d4f' }} />
                </div>
            ),
        },
    ];

    return (
        <ErpLayout>
            <PageHeader
                onBack={() => window.history.back()}
                backIcon={<ArrowLeftOutlined />}
                title={translate('Client Repayments')}
                ghost={false}
                extra={[
                    <Button key="details" type="primary" onClick={() => setDetailsModalOpen(true)}>
                        {translate('Client Details') || 'Client Details'}
                    </Button>
                ]}
            />
            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Card loading={isClientLoading}>
                        <Row gutter={[16, 16]}>
                            <Col xs={12} md={6}>
                                <div className="loan-info-item">
                                    <small style={{ color: '#8c8c8c', fontSize: '12px', display: 'block' }}>{translate('Client')}</small>
                                    <h3 style={{ margin: '4px 0 0', fontSize: '16px', wordBreak: 'break-word' }}>{client?.name}</h3>
                                </div>
                            </Col>
                            <Col xs={12} md={6}>
                                <div className="loan-info-item">
                                    <small style={{ color: '#8c8c8c', fontSize: '12px', display: 'block' }}>{translate('Loan Amount')}</small>
                                    <h3 style={{ margin: '4px 0 0', fontSize: '16px' }}>{moneyFormatter({ amount: client?.loanAmount })}</h3>
                                </div>
                            </Col>
                            <Col xs={12} md={6}>
                                <div className="loan-info-item">
                                    <small style={{ color: '#8c8c8c', fontSize: '12px', display: 'block' }}>{translate('Interest Rate')}</small>
                                    <h3 style={{ margin: '4px 0 0', fontSize: '16px' }}>{client?.interestRate}%</h3>
                                </div>
                            </Col>
                            <Col xs={12} md={6}>
                                <div className="loan-info-item">
                                    <small style={{ color: '#8c8c8c', fontSize: '12px', display: 'block' }}>{translate('Term')}</small>
                                    <h3 style={{ margin: '4px 0 0', fontSize: '16px' }}>{client?.term}</h3>
                                </div>
                            </Col>
                        </Row>
                    </Card>
                </Col>
                <Col span={24}>
                    <Table
                        columns={dataTableColumns}
                        rowKey={(item) => item._id}
                        dataSource={localRepayments}
                        loading={isRepaymentsLoading && localRepayments.length === 0}
                        pagination={false}
                    />
                </Col>
            </Row>

            <Modal
                title={translate('Edit Repayment')}
                open={isModalOpen}
                onOk={handleModalOk}
                onCancel={() => setIsModalOpen(false)}
            >
                <Form form={form} layout="vertical">
                    <RepaymentForm isUpdateForm={true} />
                </Form>
            </Modal>

            <Modal
                title={translate('Client Details') || 'Client Details'}
                open={detailsModalOpen}
                onCancel={() => setDetailsModalOpen(false)}
                footer={[<Button key="close" onClick={() => setDetailsModalOpen(false)}>Close</Button>]}
                width={800}
            >
                {client && (
                    <>
                        <Descriptions title="Basic Info" bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} style={{ marginBottom: 20 }}>
                            <Descriptions.Item label="Name">{client.name}</Descriptions.Item>
                            <Descriptions.Item label="Phone">{client.phone}</Descriptions.Item>
                            <Descriptions.Item label="Email">{client.email || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Address">{client.address || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Assigned Staff">{client.assigned?.name || 'Unknown Staff'}</Descriptions.Item>
                        </Descriptions>

                        <Descriptions title="Loan Info" bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} style={{ marginBottom: 20 }}>
                            <Descriptions.Item label="Loan Amount">{moneyFormatter({ amount: client.loanAmount })}</Descriptions.Item>
                            <Descriptions.Item label="Interest Rate">{client.interestRate}%</Descriptions.Item>
                            <Descriptions.Item label="Term">{client.term}</Descriptions.Item>
                            <Descriptions.Item label="Start Date">{dayjs(client.startDate).format(dateFormat)}</Descriptions.Item>
                            <Descriptions.Item label="Ending Date">{client.endDate ? dayjs(client.endDate).format(dateFormat) : '-'}</Descriptions.Item>
                            <Descriptions.Item label="Repayment Type">{client.repaymentType}</Descriptions.Item>
                            <Descriptions.Item label="Interest Type">{client.interestType}</Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color={client.status === 'active' ? 'blue' : client.status === 'paid' ? 'green' : 'red'}>
                                    {client.status?.toUpperCase()}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>

                        <Descriptions title={<Typography.Text type="secondary">PAYMENT INFO</Typography.Text>} bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                            {(() => {
                                const pd = client.paymentDetails || {};
                                const upiId = pd.upiId || client.upiId;
                                const bankName = pd.bankName || client.bankName;
                                const accountNumber = pd.accountNumber || client.accountNumber;
                                const ifscCode = pd.ifscCode || client.ifscCode;
                                const accountHolderName = pd.accountHolderName || client.accountHolderName;

                                if (upiId) {
                                    return (
                                        <>
                                            <Descriptions.Item label="Payment Mode"><Tag color="purple">UPI</Tag></Descriptions.Item>
                                            <Descriptions.Item label="UPI ID">{upiId}</Descriptions.Item>
                                        </>
                                    );
                                } else if (bankName || accountNumber) {
                                    return (
                                        <>
                                            <Descriptions.Item label="Payment Mode"><Tag color="blue">Bank Transfer</Tag></Descriptions.Item>
                                            {bankName && <Descriptions.Item label="Bank Name">{bankName}</Descriptions.Item>}
                                            {accountNumber && <Descriptions.Item label="Account Number">{accountNumber}</Descriptions.Item>}
                                            {ifscCode && <Descriptions.Item label="IFSC Code">{ifscCode}</Descriptions.Item>}
                                            {accountHolderName && <Descriptions.Item label="Account Holder">{accountHolderName}</Descriptions.Item>}
                                        </>
                                    );
                                } else {
                                    return <Descriptions.Item label="Payment Mode"><Tag color="green">Cash</Tag></Descriptions.Item>;
                                }
                            })()}
                        </Descriptions>
                    </>
                )}
            </Modal>
        </ErpLayout>
    );
}
