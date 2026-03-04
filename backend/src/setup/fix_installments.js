require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const moment = require('moment');

if (!process.env.DATABASE || typeof process.env.DATABASE !== 'string') {
    console.error('Missing DATABASE in backend/.env');
    process.exit(1);
}

mongoose.connect(process.env.DATABASE);

async function fixInstallments() {
    try {
        const Client = require('../models/appModels/Client');
        const Repayment = require('../models/appModels/Repayment');

        const clients = await Client.find({ removed: false });

        for (const client of clients) {
            console.log(`Fixing installments and interest type for client: ${client.name}`);

            // FORCIBLY update to REDUCING as per user's expected total paid logic
            client.interestType = 'reducing';
            await client.save();

            const { loanAmount, interestRate, term, startDate, repaymentType, interestType } = client;

            if (!loanAmount || !interestRate || !term || !repaymentType) continue;

            const numUnits = parseInt(term);
            if (isNaN(numUnits)) continue;

            const P = loanAmount;
            const monthlyRate = interestRate / 100;
            let numMonths = numUnits;

            if (repaymentType === 'Weekly') numMonths = numUnits / 4;
            else if (repaymentType === 'Daily') numMonths = numUnits / 30;

            let totalInterest = 0;
            // Note: We use the already updated client.interestType which is 'reducing'
            const periodRate = monthlyRate * (numMonths / numUnits);
            if (periodRate > 0) {
                const installmentAmount = (P * periodRate * Math.pow(1 + periodRate, numUnits)) / (Math.pow(1 + periodRate, numUnits) - 1);
                totalInterest = (installmentAmount * numUnits) - P;
            }

            const installmentAmount = (P + totalInterest) / numUnits;
            const interestPerInstallment = totalInterest / numUnits;
            const principalPerInstallment = P / numUnits;

            const installments = Array.from({ length: numUnits }, (_, i) => ({
                amount: parseFloat(installmentAmount.toFixed(2)),
                principal: parseFloat(principalPerInstallment.toFixed(2)),
                interest: parseFloat(interestPerInstallment.toFixed(2)),
            }));

            // Find existing repayments for this client and update
            const existingRepayments = await Repayment.find({ client: client._id, removed: false }).sort({ date: 1 });

            for (let i = 0; i < existingRepayments.length; i++) {
                if (installments[i]) {
                    await Repayment.findByIdAndUpdate(existingRepayments[i]._id, installments[i]);
                }
            }

            console.log(`✅ ${client.name} updated: Total Repayment = ${(P + totalInterest).toFixed(2)}, Installment = ${installmentAmount.toFixed(2)}`);
        }

        console.log('👍 All clients updated to REDUCING interest type and installments fixed!');
        process.exit();
    } catch (e) {
        console.error('🚫 Error updating installments:', e);
        process.exit(1);
    }
}

fixInstallments();
