/**
 * Set Individual Staff Passwords
 * Run: node set_passwords.js
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generate: uniqueId } = require('shortid');

require('./src/models/coreModels/Admin');
require('./src/models/coreModels/AdminPassword');

async function setPasswords() {
  try {
    if (!process.env.DATABASE || typeof process.env.DATABASE !== 'string') {
      console.error('Missing DATABASE in backend/.env');
      process.exit(1);
    }

    await mongoose.connect(process.env.DATABASE);
    console.log('Connected to MongoDB\n');

    const Admin = mongoose.model('Admin');
    const AdminPassword = mongoose.model('AdminPassword');

    // Set individual passwords for each staff
    const users = [
      { email: 'praveen@idurar.com', password: 'praveen123' },
      { email: 'raj@idurar.com', password: 'raj123' }
    ];

    for (const u of users) {
      const user = await Admin.findOne({ email: u.email, removed: false });
      
      if (!user) {
        console.log(`User not found: ${u.email}`);
        continue;
      }

      // Generate new salt and hash
      const salt = uniqueId();
      const hashedPassword = bcrypt.hashSync(salt + u.password);

      await AdminPassword.findOneAndUpdate(
        { user: user._id },
        { password: hashedPassword, salt: salt }
      );

      console.log(`✅ Set password for: ${u.email} -> ${u.password}`);
    }

    // Verify the passwords work
    console.log('\n--- Verification ---');
    for (const u of users) {
      const user = await Admin.findOne({ email: u.email, removed: false });
      if (user) {
        const dbPass = await AdminPassword.findOne({ user: user._id, removed: false });
        const isValid = await bcrypt.compare(dbPass.salt + u.password, dbPass.password);
        console.log(`${u.email}: ${isValid ? '✅ LOGIN WORKS' : '❌ FAILED'}`);
      }
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setPasswords();

