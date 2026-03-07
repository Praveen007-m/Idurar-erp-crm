/**
 * Fix Script: Regenerate Staff Passwords
 * 
 * This script:
 * 1. Finds all staff users in Admin collection
 * 2. Creates missing Password documents with correct hashing
 * 3. Regenerates Password documents that use the wrong hashing method
 * 
 * Run: node fix_staff_passwords.js
 * 
 * To set a specific password:
 *   STAFF_PASSWORD=mysecret123 node fix_staff_passwords.js
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generate: uniqueId } = require('shortid');

require('./src/models/coreModels/Admin');
require('./src/models/coreModels/AdminPassword');

const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'staff123';

async function fixStaffPasswords() {
  try {
    if (!process.env.DATABASE || typeof process.env.DATABASE !== 'string') {
      console.error('Missing DATABASE in backend/.env (or backend/.env.local).');
      process.exit(1);
    }

    await mongoose.connect(process.env.DATABASE);
    console.log('Connected to MongoDB\n');

    const Admin = mongoose.model('Admin');
    const AdminPassword = mongoose.model('AdminPassword');

    // Get all staff users (role: staff)
    const staffUsers = await Admin.find({ role: 'staff', removed: false }).sort({ created: 1 });
    
    if (staffUsers.length === 0) {
      console.log('No staff users found.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`Found ${staffUsers.length} staff user(s)\n`);
    console.log(`Password to set: ${STAFF_PASSWORD}\n`);

    let created = 0;
    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    for (const staff of staffUsers) {
      try {
        // Check if password document exists
        const existingPassword = await AdminPassword.findOne({ 
          user: staff._id,
          removed: false 
        });

        // Check if salt looks like bcrypt format (wrong method)
        const isWrongMethod = existingPassword && 
                              existingPassword.salt && 
                              existingPassword.salt.startsWith('$2');

        if (!existingPassword) {
          // Create new password document
          const salt = uniqueId();
          const hashedPassword = bcrypt.hashSync(salt + STAFF_PASSWORD);

          const passwordDoc = new AdminPassword({
            user: staff._id,
            password: hashedPassword,
            salt: salt,
            removed: false,
            emailVerified: true,
            authType: 'email'
          });

          await passwordDoc.save();
          console.log(`  ✅ Created: ${staff.email}`);
          created++;
        } 
        else if (isWrongMethod) {
          // Regenerate with correct method
          const salt = uniqueId();
          const hashedPassword = bcrypt.hashSync(salt + STAFF_PASSWORD);

          await AdminPassword.findOneAndUpdate(
            { user: staff._id },
            { 
              password: hashedPassword,
              salt: salt
            }
          );
          
          console.log(`  🔧 Fixed: ${staff.email} (regenerated with correct hash)`);
          fixed++;
        } 
        else {
          // Test if current password works
          const isValid = await bcrypt.compare(
            existingPassword.salt + STAFF_PASSWORD, 
            existingPassword.password
          );

          if (isValid) {
            console.log(`  ⏭️  Skipped: ${staff.email} (already correct)`);
            skipped++;
          } else {
            // Different password - regenerate anyway
            const salt = uniqueId();
            const hashedPassword = bcrypt.hashSync(salt + STAFF_PASSWORD);

            await AdminPassword.findOneAndUpdate(
              { user: staff._id },
              { 
                password: hashedPassword,
                salt: salt
              }
            );
            
            console.log(`  🔧 Fixed: ${staff.email} (password mismatch, regenerated)`);
            fixed++;
          }
        }

      } catch (err) {
        console.error(`  ❌ Error for ${staff.email}: ${err.message}`);
        errors++;
      }
    }

    console.log('\n--- Fix Summary ---');
    console.log(`Created: ${created}`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`\nAll staff users can now login with:`);
    console.log(`  Email: their email address`);
    console.log(`  Password: ${STAFF_PASSWORD}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('\n🚫 Fix failed!');
    console.error(error);
    process.exit(1);
  }
}

fixStaffPasswords();

