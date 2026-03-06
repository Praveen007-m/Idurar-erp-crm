const mongoose = require('mongoose');
const moment = require('moment');

const generateInstallments = async (client) => {
    const Repayment = mongoose.model('Repayment');
    const { loanAmount, interestRate, term, startDate, repaymentType, interestType } = client;

    if (!loanAmount || !interestRate || !term || !repaymentType) return;

    const installments = [];
    const numUnits = parseInt(term);
    if (isNaN(numUnits)) return;

    const P = loanAmount;
    const monthlyRate = interestRate / 100;

    let durationUnit = 'months';
    let numMonths = numUnits;

    if (repaymentType === 'Monthly EMI') {
        durationUnit = 'months';
        numMonths = numUnits;
    } else if (repaymentType === 'Weekly') {
        durationUnit = 'weeks';
        numMonths = numUnits / 4;
    } else if (repaymentType === 'Daily') {
        durationUnit = 'days';
        numMonths = numUnits / 30;
    }

    let totalInterest = 0;

    if (interestType === 'flat') {
        // Flat Interest: Interest = Principal * (Rate per month) * (Total Months)
        totalInterest = P * monthlyRate * numMonths;
    } else {
        // Reducing Balance (EMI formula) to get Total Interest
        // But we then SPREAD it equally as per user requirement "should be fixed for every month"
        const periodRate = monthlyRate * (numMonths / numUnits);
        if (periodRate > 0) {
            const installmentAmount = (P * periodRate * Math.pow(1 + periodRate, numUnits)) / (Math.pow(1 + periodRate, numUnits) - 1);
            totalInterest = (installmentAmount * numUnits) - P;
        } else {
            totalInterest = 0;
        }
    }

    const installmentAmount = (P + totalInterest) / numUnits;
    const interestPerInstallment = totalInterest / numUnits;
    const principalPerInstallment = P / numUnits;

    for (let i = 1; i <= numUnits; i++) {
        const dueDate = moment(startDate).add(i, durationUnit).toDate();
        installments.push({
            client: client._id,
            date: dueDate,
            amount: installmentAmount.toFixed(2),
            principal: principalPerInstallment.toFixed(2),
            interest: interestPerInstallment.toFixed(2),
            status: 'not-paid',
            createdBy: client.createdBy,
        });
    }

    await Repayment.insertMany(installments);
};

module.exports = generateInstallments;
