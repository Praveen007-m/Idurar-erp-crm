/**
 * Diagnostic Script: Check All Staff Users Password Status
 * 
 * This script checks:
 * 1. All staff users in Admin collection
 * 2. Whether each has a corresponding Password document
 * 3. Whether the password hash is valid
 * 
 * Run: node check_staff_passwords.js
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generate: uniqueId } = require('shortid');

require('./src/models/coreModels/Admin');
require('./src/models/coreModels/AdminPassword');

const DEFAULT_PASSWORD = 'staff123';

async function checkStaffPasswords() {
  try {
    if (!process.env.DATABASE || typeof process.env.DATABASE !== 'string') {
      console.error('Missing DATABASE in backend/.env (or backend/.env.local).');
      process.exit(1);
    }

    await mongoose.connect(process.env.DATABASE);
    console.log('Connected to MongoDB\n');

    const Admin = mongoose.model('Admin');
    const AdminPassword = mongoose.model('AdminPassword');

    // Get all admin users (including owner and staff)
    const allUsers = await Admin.find({ removed: false }).sort({ created: 1 });
    console.log(`Found ${allUsers.length} total users\n`);
    console.log('=== Staff User Analysis ===\n');

    let issues = [];

    for (const user of allUsers) {
      console.log(`User: ${user.email} (${user.name} ${user.surname}) - Role: ${user.role}`);
      
      // Check if password document exists
      const passwordDoc = await AdminPassword.findOne({ user: user._id, removed: false });
      
      if (!passwordDoc) {
        console.log('  ❌ NO PASSWORD DOCUMENT FOUND!');
        issues.push({ email: user.email, _id: user._id, issue: 'no_password_doc' });
        console.log('');
        continue;
      }

      console.log('  ✅ Password document exists');
      console.log(`     Salt: ${passwordDoc.salt}`);
      console.log(`     Hash: ${passwordDoc.password.substring(0, 30)}...`);

      // Test if the password hash is valid
      // Try with the current method (plain salt + password)
      const isValidCurrent = await bcrypt.compare(
        passwordDoc.salt + DEFAULT_PASSWORD, 
        passwordDoc.password
      );

      if (isValidCurrent) {
        console.log(`  ✅ Password is VALID (login will work with: ${DEFAULT_PASSWORD})`);
      } else {
        console.log(`  ❌ Password is INVALID (login will FAIL with: ${DEFAULT_PASSWORD})`);
        
        // Check if it was created with the OLD wrong method
        const isBcryptSalt = passwordDoc.salt && passwordDoc.salt.startsWith('$2');
        if (isBcryptSalt) {
          console.log('     ⚠️  Salt looks like bcrypt format - was created with WRONG method');
          issues.push({ email: user.email, _id: user._id, issue: 'wrong_hash_method' });
        } else {
          issues.push({ email: user.email, _id: user._id, issue: 'unknown' });
        }
      }
      console.log('');
    }

    console.log('=== Summary ===');
    console.log(`Total users checked: ${allUsers.length}`);
    console.log(`Users with issues: ${issues.length}\n`);

    if (issues.length > 0) {
      console.log('Users needing fix:');
      for (const issue of issues) {
        console.log(`  - ${issue.email} (${issue.issue})`);
      }
      console.log('\nTo fix these users, run: node fix_staff_passwords.js');
    } else {
      console.log('All users are configured correctly!');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStaffPasswords();

