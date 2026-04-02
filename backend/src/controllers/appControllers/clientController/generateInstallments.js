const mongoose = require('mongoose');
const { buildInstallmentSchedule } = require('@/utils/installmentSchedule');

const hasValue = (value) => value !== undefined && value !== null && value !== '';

const generateInstallments = async (client) => {
    const Repayment = mongoose.model('Repayment');
    const {
        _id: clientId,
        loanAmount,
        interestRate,
        term,
        startDate,
        repaymentType,
        interestType,
        createdBy,
    } = client;

    if (!clientId) {
        throw new Error('[generateInstallments] Client id is required.');
    }

    const missing = [];
    if (!hasValue(loanAmount)) missing.push('loanAmount');
    if (!hasValue(interestRate)) missing.push('interestRate');
    if (!hasValue(term)) missing.push('term');
    if (!hasValue(repaymentType)) missing.push('repaymentType');
    if (!hasValue(startDate)) missing.push('startDate');

    if (missing.length > 0) {
        throw new Error(
            `[generateInstallments] Missing required fields for client ${clientId}: ${missing.join(', ')}.`
        );
    }

    const existingRepayments = await Repayment.countDocuments({
        client: clientId,
        removed: false,
    });

    if (existingRepayments > 0) {
        return [];
    }

    const installmentCount = Number.parseInt(term, 10);
    if (!Number.isFinite(installmentCount) || installmentCount <= 0) {
        throw new Error(`[generateInstallments] Invalid term "${term}" for client ${clientId}.`);
    }

    const installments = buildInstallmentSchedule({
        clientId,
        loanAmount,
        interestRate,
        term,
        startDate,
        repaymentType,
        interestType,
        createdBy,
    });

    return Repayment.insertMany(installments);
};

module.exports = generateInstallments;
