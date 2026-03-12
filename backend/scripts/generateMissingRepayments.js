require('module-alias/register');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const mongoose = require('mongoose');

require('../src/models/appModels/Client');
require('../src/models/appModels/Repayment');

const Client = mongoose.model('Client');
const Repayment = mongoose.model('Repayment');
const generateInstallments = require('@/controllers/appControllers/clientController/generateInstallments');

async function run() {
    await mongoose.connect(process.env.DATABASE);

    const clients = await Client.find({ removed: false }).exec();

    for (const client of clients) {
        const existing = await Repayment.countDocuments({
            client: client._id,
            removed: false,
        });

        if (existing === 0) {
            console.log(`Generating repayments for: ${client.name}`);
            await generateInstallments(client);
        }
    }

    await mongoose.disconnect();
}

run()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
