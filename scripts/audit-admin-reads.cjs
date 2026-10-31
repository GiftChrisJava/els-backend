// Explicit read-only database verification. Run manually after building.
// Authentication is replaced only inside this process; no public test server.
// Analytics refresh and public news view counters are deliberately excluded.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { appConfig } = require('../dist/config/app.config');
const auth = require('../dist/modules/auth/middlewares/auth.middleware');
const results = [];
async function main() {
  await mongoose.connect(appConfig.database.uri, { serverSelectionTimeoutMS: 15000 });
  assert.equal(mongoose.connection.name, 'energy_solutions_test', 'Audit must target the requested database');
  const user = await mongoose.connection.db.collection('users').findOne({ role: 'system-admin', status: 'active' }, { projection: { _id: 1 } });
  assert.ok(user, 'An existing active system admin is required');
  auth.authenticate = (req, _res, next) => { req.user = { _id: user._id, id: String(user._id), role: req.get('x-audit-role'), permissions: [] }; next(); };
  const app = express();
  app.use(express.json());
  for (const name of ['system', 'sales', 'web']) {
    app.use('/' + name, require(`../dist/modules/admin/${name}-admin/routes/${name}-admin.routes`).default);
  }
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ success: false, message: err.message }));
  const checks = [
    ['/system/dashboard', 'system-admin'], ['/system/users?limit=5', 'system-admin'],
    ['/system/users?emailVerified=true&limit=5', 'system-admin'], ['/system/users?emailVerified=false&limit=5', 'system-admin'],
    ['/system/activity-logs?limit=5', 'system-admin'], ['/system/users/export?format=json', 'system-admin'],
    ['/system/users/export?format=csv', 'system-admin'],
    ['/sales/products?limit=5', 'sales-admin'], ['/sales/categories/tree', 'sales-admin'],
    ['/sales/orders?limit=5', 'sales-admin'], ['/sales/orders/export', 'sales-admin'], ['/sales/customers?limit=5', 'sales-admin'],
    ['/sales/analytics/dashboard', 'sales-admin'], ['/sales/analytics/best-sellers', 'sales-admin'],
    ['/web/dashboard', 'web-admin'], ['/web/services?limit=5', 'web-admin'], ['/web/projects?limit=5', 'web-admin'],
    ['/web/staff?limit=5', 'web-admin'], ['/web/testimonials?limit=5', 'web-admin'], ['/web/slides?limit=5', 'web-admin'],
    ['/web/news?limit=5', 'web-admin'], ['/web/contact-messages?limit=5', 'web-admin'],
    ['/web/customers/emails', 'web-admin'], ['/web/email-campaigns?limit=5', 'web-admin'],
  ];
  for (const [collection, route] of [['products', '/sales/products/'], ['orders', '/sales/orders/'], ['users', '/system/users/'],
    ['services', '/web/services/'], ['projects', '/web/projects/'], ['staff', '/web/staff/'], ['news', '/web/news/']]) {
    const doc = await mongoose.connection.db.collection(collection).findOne({}, { projection: { _id: 1 } });
    if (doc) checks.push([route + doc._id, 'system-admin']);
  }
  for (const [url, role] of checks) {
    const response = await request(app).get(url).set('x-audit-role', role);
    const result = { route: url, role, status: response.status, success: response.status === 200 };
    if (response.status !== 200) result.error = response.body.message || 'Request failed';
    if (url.includes('emailVerified=')) {
      const wanted = url.includes('emailVerified=true');
      result.filterMatches = Array.isArray(response.body.data) && response.body.data.every(row => row.emailVerified === wanted);
      result.success &&= result.filterMatches;
    }
    results.push(result);
    console.log(`${result.success ? 'PASS' : 'FAIL'} ${url}: ${response.status}`);
  }
  const report = { checkedAt: new Date().toISOString(), database: mongoose.connection.name, mode: 'Read-only controllers/services with test authentication; no real login or content mutations', checks: results, passed: results.filter(r => r.success).length, total: results.length };
  fs.mkdirSync(path.resolve(__dirname, '../migration-reports'), { recursive: true });
  fs.writeFileSync(path.resolve(__dirname, '../migration-reports/admin-read-audit.json'), JSON.stringify(report, null, 2));
  assert.equal(report.passed, report.total, 'Some admin reads failed; see report');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
