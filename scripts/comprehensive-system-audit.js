// Comprehensive End-to-End System & API Audit Suite
const http = require('http');

const BASE_URL = 'http://localhost:3000';
let sessionCookie = '';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json, text/html, */*',
        ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
        ...(options.headers || {})
      }
    };

    if (data) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      if (res.headers['set-cookie']) {
        const cookies = res.headers['set-cookie'];
        sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
      }
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runAudit() {
  console.log('===============================================================');
  console.log('     SIDHESHWAR JEWELLERS ERP — COMPREHENSIVE LIVE SYSTEM AUDIT');
  console.log('===============================================================');
  
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  try {
    // 1. Unauthenticated Security Test
    console.log('\n[1/7] Testing Security & Access Control:');
    const unauthStats = await request({ path: '/api/dashboard/stats' });
    assert(unauthStats.statusCode === 401, 'Unauthorized request blocked with 401', `Got: ${unauthStats.statusCode}`);

    // 2. Authentication Flow
    console.log('\n[2/7] Testing Authentication & Session Management:');
    const badLogin = await request({
      path: '/api/auth/login',
      method: 'POST'
    }, { email: 'admin@sidheshwar.com', password: 'WrongPassword' });
    assert(badLogin.statusCode === 401, 'Invalid password rejected', `Got: ${badLogin.statusCode}`);

    const goodLogin = await request({
      path: '/api/auth/login',
      method: 'POST'
    }, { email: 'admin@sidheshwar.com', password: 'Admin@Sidheshwar2026' });
    assert(goodLogin.statusCode === 200 && goodLogin.data.success, 'Valid login successful', JSON.stringify(goodLogin.data));
    assert(!!sessionCookie, 'Session cookie established', sessionCookie);

    const meRes = await request({ path: '/api/auth/me' });
    assert(meRes.statusCode === 200 && meRes.data.user.email === 'admin@sidheshwar.com', 'Session verified via /api/auth/me');

    // 3. Frontend Page Rendering Test
    console.log('\n[3/7] Testing Frontend Page Availability (SSR/HTML):');
    const pages = [
      { path: '/', name: 'Dashboard' },
      { path: '/gold', name: 'Gold Inventory' },
      { path: '/silver', name: 'Silver Inventory' },
      { path: '/used-metal', name: 'Used Metal Purchases' },
      { path: '/finance', name: 'Gold Mortgage Finance' },
      { path: '/sales', name: 'Counter Sales Ledger' },
      { path: '/cash-book', name: 'Daily Cash Book' },
      { path: '/profit-loss', name: 'Profit & Loss Statement' },
      { path: '/settings', name: 'System Settings' },
      { path: '/login', name: 'Login Screen' }
    ];

    for (const p of pages) {
      const res = await request({ path: p.path });
      assert(res.statusCode === 200 && typeof res.data === 'string' && res.data.includes('<!DOCTYPE html>'), `Page [${p.name}] renders 200 OK HTML`);
    }

    // 4. Inventory Module
    console.log('\n[4/7] Testing Inventory Operations:');
    const categories = await request({ path: '/api/inventory/categories?metalType=gold' });
    assert(categories.statusCode === 200 && Array.isArray(categories.data.categories), 'Gold categories retrieved');

    const itemsRes = await request({ path: '/api/inventory/items?metalType=gold' });
    assert(itemsRes.statusCode === 200 && Array.isArray(itemsRes.data.items), 'Gold inventory items retrieved');

    // Test automatic net weight calculation: Gross - Stone = Net
    const testItemPayload = {
      name: `Live Audit Bangle ${Date.now()}`,
      category: categories.data.categories[0]?._id,
      metalType: 'gold',
      purity: '22K',
      pieces: 1,
      grossWeight: 15.500,
      stoneWeight: 0.750,
      huid: 'AUDIT99',
      makingChargesPerGram: 450
    };
    const createItem = await request({
      path: '/api/inventory/items',
      method: 'POST'
    }, testItemPayload);
    assert(createItem.statusCode === 201 && createItem.data.item.netWeight === 14.750, 'Item creation calculates net weight precisely (15.500 - 0.750 = 14.750g)');

    // 5. Finance & Mortgage Engine
    console.log('\n[5/7] Testing Finance & Mortgage Calculation Engine:');
    const calcRes = await request({
      path: '/api/finance/calculate',
      method: 'POST'
    }, {
      principal: 50000,
      monthlyRate: 2,
      interestMode: 'yearly_compound',
      startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      asOfDate: new Date().toISOString().split('T')[0]
    });
    assert(calcRes.statusCode === 200 && calcRes.data.breakdown.totalDueRupees > 50000, 'Mortgage dues engine computes compound interest breakdown');

    const loansRes = await request({ path: '/api/finance/loans' });
    assert(loansRes.statusCode === 200 && Array.isArray(loansRes.data.loans), 'Active loans retrieved successfully');

    // 6. Cash Book & Sales
    console.log('\n[6/7] Testing Cash Book & Sales Operations:');
    const cashBookRes = await request({ path: '/api/cash-book?range=all' });
    assert(cashBookRes.statusCode === 200 && typeof cashBookRes.data.summary.totalCredit === 'number', 'Cash book returns valid financial ledger summary');

    const plRes = await request({ path: '/api/profit-loss?range=all' });
    assert(plRes.statusCode === 200 && typeof plRes.data.netProfit === 'number', 'Profit & Loss statement computes revenue, costs, and net margins');

    // 7. CSV Export Modules
    console.log('\n[7/7] Testing Data Export Streams:');
    const exportGold = await request({ path: '/api/export/inventory?metalType=gold' });
    assert(exportGold.statusCode === 200 && exportGold.headers['content-type'].includes('text/csv'), 'Gold inventory exports formatted CSV');

    const exportLoans = await request({ path: '/api/export/loans' });
    assert(exportLoans.statusCode === 200 && exportLoans.headers['content-type'].includes('text/csv'), 'Loans export produces valid CSV file');

    console.log('\n===============================================================');
    console.log(` AUDIT COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log('===============================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Audit execution error:', err);
    process.exit(1);
  }
}

runAudit();
