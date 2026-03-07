/**
 * Bcrypt Test
 */
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');

require('./src/models/coreModels/Admin');
require('./src/models/coreModels/AdminPassword');

async function test() {
  await mongoose.connect(process.env.DATABASE);
  const Admin = mongoose.model('Admin');
  const AdminPassword = mongoose.model('AdminPassword');

  const user = await Admin.findOne({ email: 'praveen@idurar.com' });
  const pw = await AdminPassword.findOne({ user: user._id });
  
  const password = 'staff123';
  const salt = pw.salt;
  const storedHash = pw.password;
  
  // Test bcrypt compare the same way authUser.js does
  const isMatch = await bcrypt.compare(salt + password, storedHash);
  
  console.log('Password:', password);
  console.log('Salt:', salt);
  console.log('Stored Hash:', storedHash);
  console.log('Test Hash (salt+password):', bcrypt.hashSync(salt + password, 10));
  console.log('Is Match:', isMatch);
  
  if (isMatch) {
    console.log('\n✅ LOGIN WILL WORK!');
  } else {
    console.log('\n❌ LOGIN WILL FAIL!');
  }
  
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });

