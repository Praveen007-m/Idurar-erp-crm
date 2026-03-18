/**
 * addAssignedToClients.js  —  Webaac Solutions Finance Management
 * Place in:  backend/
 * Run with:  node addAssignedToClients.js
 *
 * Assigns your 20 clients to your 8 staff members.
 * The staff dashboard and performance pages need this to show real data.
 */

const mongoose = require('mongoose');
const path     = require('path');
const readline = require('readline');

try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch {}

const MONGO_URI =
  process.env.MONGO_URI   || process.env.DATABASE ||
  process.env.DB_URI      || process.env.MONGODB_URI ||
  'mongodb://localhost:27017/idurar';

const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function run() {
  console.log('\nConnecting...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const clients = await db.collection('clients')
    .find({ removed: { $ne: true } })
    .project({ _id: 1, name: 1, status: 1, assignedTo: 1 })
    .sort({ name: 1 })
    .toArray();

  const staff = await db.collection('admins')
    .find({ removed: { $ne: true }, enabled: true })
    .project({ _id: 1, name: 1, surname: 1, email: 1, role: 1 })
    .sort({ name: 1 })
    .toArray();

  console.log('\n══════════════════════════════════════════════');
  console.log('  STAFF / ADMINS (' + staff.length + ' found)');
  console.log('══════════════════════════════════════════════');
  staff.forEach((s, i) => {
    console.log(`  [${i}] ${(s.name + ' ' + (s.surname||'')).trim().padEnd(25)} ${s.role} — ${s.email}`);
  });

  console.log('\n══════════════════════════════════════════════');
  console.log('  CLIENTS (' + clients.length + ' found)');
  console.log('══════════════════════════════════════════════');
  clients.forEach((c, i) => {
    const who = c.assignedTo ? `assigned: ${c.assignedTo}` : 'NOT ASSIGNED';
    console.log(`  [${String(i).padStart(2)}] ${String(c.name).padEnd(30)} (${c.status||'?'}) ${who}`);
  });

  const unassigned = clients.filter((c) => !c.assignedTo);
  console.log(`\n  ${unassigned.length} unassigned clients, ${staff.length} staff members.\n`);

  console.log('  Options:');
  console.log('  1 — Auto round-robin: distribute all unassigned clients evenly across all staff');
  console.log('  2 — Assign ONE client to ONE staff member manually');
  console.log('  3 — Re-assign ALL clients (clears existing assignments first)');
  console.log('  4 — Exit, no changes\n');

  const choice = (await ask('  Choose [1/2/3/4]: ')).trim();

  if (choice === '1' || choice === '3') {
    const targets = choice === '3' ? clients : unassigned;
    if (targets.length === 0) {
      console.log('\n  Nothing to assign. All clients already have staff.');
    } else {
      let count = 0;
      for (let i = 0; i < targets.length; i++) {
        const s = staff[i % staff.length];
        await db.collection('clients').updateOne(
          { _id: targets[i]._id },
          { $set: { assignedTo: s._id } }
        );
        console.log(`  ✔ "${targets[i].name}" → "${s.name} ${s.surname||''}"`);
        count++;
      }
      console.log(`\n  ✅ Done. Assigned ${count} clients.`);
    }

  } else if (choice === '2') {
    const cIdx = parseInt(await ask('  Client index: '), 10);
    const sIdx = parseInt(await ask('  Staff index:  '), 10);
    if (!clients[cIdx] || !staff[sIdx]) {
      console.log('\n  Invalid index.');
    } else {
      await db.collection('clients').updateOne(
        { _id: clients[cIdx]._id },
        { $set: { assignedTo: staff[sIdx]._id } }
      );
      console.log(`\n  ✅ "${clients[cIdx].name}" → "${staff[sIdx].name} ${staff[sIdx].surname||''}"`);
    }

  } else {
    console.log('\n  No changes made.');
  }

  rl.close();
  await mongoose.disconnect();
  console.log('  Done.\n');
}

run().catch((err) => {
  console.error('Error:', err.message);
  rl.close();
  process.exit(1);
});