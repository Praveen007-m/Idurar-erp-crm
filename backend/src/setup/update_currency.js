require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

if (!process.env.DATABASE || typeof process.env.DATABASE !== 'string') {
    console.error('Missing DATABASE in backend/.env');
    process.exit(1);
}

mongoose.connect(process.env.DATABASE)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

async function updateSettings() {
    try {
        const Setting = require('../models/coreModels/Setting');

        // Mongoose will lowercase settingKey because of the schema definition
        await Setting.findOneAndUpdate(
            { settingKey: 'default_currency_code' },
            { settingValue: 'INR' },
            { upsert: true }
        );
        await Setting.findOneAndUpdate(
            { settingKey: 'currency_name' },
            { settingValue: 'Indian Rupee' },
            { upsert: true }
        );
        await Setting.findOneAndUpdate(
            { settingKey: 'currency_symbol' },
            { settingValue: '₹' },
            { upsert: true }
        );

        console.log('👍 Currency settings updated to INR (₹) successfully!');
        process.exit(0);
    } catch (e) {
        console.error('🚫 Error updating settings:', e);
        process.exit(1);
    }
}

// Small delay to ensure connection is ready if needed, 
// though mongoose.connect() is buffered.
setTimeout(updateSettings, 1000);
