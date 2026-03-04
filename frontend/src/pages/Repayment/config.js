export const fields = {
    client: {
        type: 'async',
        label: 'Client',
        entity: 'client',
        displayLabels: ['name'],
        outputValue: '_id',
        required: true,
    },
    date: {
        type: 'date',
        required: true,
    },
    amount: {
        type: 'currency',
        required: true,
    },
    status: {
        type: 'select',
        options: [
            { value: 'paid', label: 'paid', color: 'green' },
            { value: 'not-paid', label: 'not-paid', color: 'red' },
            { value: 'late payment', label: 'late_payment', color: 'orange' },
        ],
    },
    notes: {
        type: 'textarea',
    },
};
