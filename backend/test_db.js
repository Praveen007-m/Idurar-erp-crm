require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

console.log('Attempting to connect to:', process.env.DATABASE);

mongoose.connect(process.env.DATABASE)
    .then(() => {
        console.log('✅ Connection successful!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection failed!');
        console.error(err);
        process.exit(1);
    });
