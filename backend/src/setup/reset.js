require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
if (!process.env.DATABASE || typeof process.env.DATABASE !== 'string') {
  console.error('Missing DATABASE in backend/.env (or backend/.env.local).');
  process.exit(1);
}

mongoose.connect(process.env.DATABASE);

async function deleteData() {
  const Admin = require('../models/coreModels/Admin');
  const AdminPassword = require('../models/coreModels/AdminPassword');
  const Setting = require('../models/coreModels/Setting');
  const PaymentMode = require('../models/appModels/PaymentMode');
  const Taxes = require('../models/appModels/Taxes');

  await Admin.deleteMany();
  await AdminPassword.deleteMany();
  await PaymentMode.deleteMany();
  await Taxes.deleteMany();
  console.log('👍 Admin Deleted. To setup demo admin data, run\n\n\t npm run setup\n\n');
  await Setting.deleteMany();
  console.log('👍 Setting Deleted. To setup Setting data, run\n\n\t npm run setup\n\n');

  process.exit();
}

deleteData();
