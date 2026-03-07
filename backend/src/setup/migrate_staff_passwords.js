/**
 * Migration Script: Create Password Documents for Existing Staff
 * 
 * This script finds all Admin documents with role "staff" that don't have
 * a corresponding AdminPassword document and creates one with a default password.
 * 
 * Usage: 
 *   node src/setup/migrate_staff_passwords.js
 * 
 * To set a specific default password:
 *   DEFAULT_PASSWORD=mysecret123 node src/setup/migrate_staff_passwords.js
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Require models to register them
require('../models/coreModels/Admin');
require('../models/coreModels/AdminPassword');

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'staff123';

async function migrateStaffPasswords() {
  try {
    if (!process.env.DATABASE || typeof process.env.DATABASE !== 'string') {
      console.error('Missing DATABASE in backend/.env (or backend/.env.local).');
      process.exit(1);
    }

    await mongoose.connect(process.env.DATABASE);
    console.log('Connected to MongoDB');

    const Admin = mongoose.model('Admin');
    const AdminPassword = mongoose.model('AdminPassword');

    // Find all staff users
    const staffUsers = await Admin.find({ 
      role: 'staff', 
      removed: false 
    });

    console.log(`\nFound ${staffUsers.length} staff user(s)`);

    if (staffUsers.length === 0) {
      console.log('No staff users to migrate.');
      process.exit(0);
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const staff of staffUsers) {
      try {
        // Check if password document already exists
        const existingPassword = await AdminPassword.findOne({ 
          user: staff._id,
          removed: false 
        });

        if (existingPassword) {
          console.log(`  ⏭️  Skipped: ${staff.email} (password already exists)`);
          skipped++;
          continue;
        }

        // Create salt (plain random string) and hash password
        // IMPORTANT: Use uniqueId for salt (like setup.js), NOT bcrypt.genSaltSync
        // And use bcrypt.hashSync WITHOUT rounds parameter (uses default 10)
        const { generate: uniqueId } = require('shortid');
        const salt = uniqueId();
        const hashedPassword = bcrypt.hashSync(salt + DEFAULT_PASSWORD);

        // Create the password document
        const passwordDoc = new AdminPassword({
          user: staff._id,
          password: hashedPassword,
          salt: salt,
          removed: false,
          emailVerified: true,
          authType: 'email'
        });

        await passwordDoc.save();

        console.log(`  ✅ Created: ${staff.email} (password: ${DEFAULT_PASSWORD})`);
        created++;

      } catch (err) {
        console.error(`  ❌ Error for ${staff.email}: ${err.message}`);
        errors++;
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`\nAll staff users can now login with:`);
    console.log(`  Email: their email address`);
    console.log(`  Password: ${DEFAULT_PASSWORD}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('\n🚫 Migration failed!');
    console.error(error);
    process.exit(1);
  }
}

migrateStaffPasswords();

