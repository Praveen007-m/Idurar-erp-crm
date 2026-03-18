/**
 * testApiEndpoints.js  —  Webaac Solutions Finance Management
 * Place in:  backend/
 * Run with:  node testApiEndpoints.js
 *
 * Tests all dashboard/reports endpoints directly and prints the response.
 * This tells us exactly what the frontend will receive.
 */

const http = require('http');

const BASE = 'http://localhost:8888';

// ── get a JWT token first ─────────────────────────────────────────────────────
function post(path, body) {
  return new Promise((resolve, reject) => {
    const data    = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port:     8888,
      path,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port:     8888,
      path,
      method:   'GET',
      headers:  token ? { Authorization: `Bearer ${token}` } : {},
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  API ENDPOINT TESTER');
  console.log('══════════════════════════════════════════════════\n');

  // Step 1: Login to get token
  console.log('1. Logging in as admin@admin.com ...');
  let token;
  try {
    const login = await post('/api/login', {
      email:    'admin@admin.com',
      password: 'admin123',
    });
    console.log('   Status:', login.status);
    if (login.body?.result?.token) {
      token = login.body.result.token;
      console.log('   ✅ Got token\n');
    } else if (login.body?.token) {
      token = login.body.token;
      console.log('   ✅ Got token\n');
    } else {
      console.log('   ❌ No token in response:', JSON.stringify(login.body).slice(0, 200));
      console.log('   Try updating the password in this script.\n');
    }
  } catch (err) {
    console.log('   ❌ Login failed:', err.message);
    console.log('   Is the backend running on port 8888?\n');
    return;
  }

  // Step 2: Test each endpoint
  const endpoints = [
    '/api/reports',
    '/api/dashboard/admin',
    '/api/dashboard/staff',
    '/api/staff/performance',
    '/api/dashboard/performance-summary',
  ];

  for (const ep of endpoints) {
    console.log(`\n── GET ${ep}`);
    try {
      const res = await get(ep, token);
      console.log('   Status :', res.status);
      if (res.status === 200) {
        const result = res.body?.result ?? res.body;
        // Print summary of what came back
        if (result?.summary) {
          console.log('   summary.totalCollected:', result.summary.totalCollected);
          console.log('   summary.pendingBalance:', result.summary.pendingBalance);
          console.log('   statusBreakdown count :', result.statusBreakdown?.length ?? 'N/A');
        } else if (result?.totalCollected !== undefined) {
          console.log('   totalCollected:', result.totalCollected);
          console.log('   pendingAmount :', result.pendingAmount ?? result.pendingBalance);
          console.log('   overdueCount  :', result.overdueCount);
          console.log('   efficiency    :', result.efficiency);
        } else if (result?.staffWise) {
          console.log('   staffWise count:', result.staffWise.length);
          console.log('   topPerformer  :', result.topPerformer);
          result.staffWise.slice(0, 2).forEach(s => {
            console.log(`   → ${s.name}: clients=${s.customerCount} collected=${s.totalCollected}`);
          });
        } else {
          console.log('   Response:', JSON.stringify(result).slice(0, 300));
        }
        console.log('   ✅ OK');
      } else if (res.status === 404) {
        console.log('   ❌ 404 NOT FOUND — route is not registered in backend');
      } else if (res.status === 403) {
        console.log('   ❌ 403 FORBIDDEN — role check failed (checkRole middleware)');
      } else if (res.status === 401) {
        console.log('   ❌ 401 UNAUTHORIZED — JWT not accepted');
      } else {
        console.log('   ❌ Error:', JSON.stringify(res.body).slice(0, 300));
      }
    } catch (err) {
      console.log('   ❌ Request failed:', err.message);
    }
  }

  console.log('\n══════════════════════════════════════════════════\n');
}

run().catch(console.error);