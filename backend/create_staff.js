require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { generate: uniqueId } = require('shortid');
const mongoose = require('mongoose');

if (!process.env.DATABASE || typeof process.env.DATABASE !== 'string') {
    console.error('Missing DATABASE in backend/.env (or backend/.env.local).');
    process.exit(1);
}

mongoose.connect(process.env.DATABASE);

async function createStaff() {
    try {
        const Admin = require('./src/models/coreModels/Admin');
        const AdminPassword = require('./src/models/coreModels/AdminPassword');

        // Check if staff already exists
        let staff = await Admin.findOne({ email: 'staff@admin.com' });

        if (staff) {
            console.log('Staff user already exists!');
            console.log('Email: staff@admin.com');
            console.log('Password: staff123'); // Assuming standard testing password
            process.exit();
        }

        const newAdminPassword = new AdminPassword();
        const salt = uniqueId();
        const passwordHash = newAdminPassword.generateHash(salt, 'staff123');

        const demoStaff = {
            email: 'staff@admin.com',
            name: 'IDURAR',
            surname: 'Staff',
            enabled: true,
            role: 'staff',
        };

        const result = await new Admin(demoStaff).save();

        const AdminPasswordData = {
            password: passwordHash,
            emailVerified: true,
            salt: salt,
            user: result._id,
        };

        await new AdminPassword(AdminPasswordData).save();

        console.log('👍 Staff user created successfully!');
        console.log('Email: staff@admin.com');
        console.log('Password: staff123');
        process.exit();
    } catch (e) {
        console.log('\n🚫 Error! The Error info is below');
        console.log(e);
        process.exit(1);
    }
}

createStaff();
