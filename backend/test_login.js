/**
 * Test Login Script
 * Run: node test_login.js
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Require models to register them
require('./src/models/coreModels/Admin');
require('./src/models/coreModels/AdminPassword');

async function testLogin() {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log('Connected to MongoDB');

    const Admin = mongoose.model('Admin');
    const AdminPassword = mongoose.model('AdminPassword');

    const email = 'praveen@idurar.com';
    const password = 'staff123';

    // Find user
    const user = await Admin.findOne({ email, removed: false });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    console.log('User found:', user.email);

    // Find password
    const databasePassword = await AdminPassword.findOne({ user: user._id, removed: false });
    if (!databasePassword) {
      console.log('Password document not found!');
      process.exit(1);
    }
    console.log('Password document found');
    console.log('Salt:', databasePassword.salt);
    console.log('Hashed password:', databasePassword.password);

    // Test bcrypt compare
    const isMatch = await bcrypt.compare(databasePassword.salt + password, databasePassword.password);
    console.log('Password match:', isMatch);

    if (isMatch) {
      console.log('\n✅ LOGIN TEST PASSED!');
    } else {
      console.log('\n❌ LOGIN TEST FAILED!');
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin();

