const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { SystemAdminService } = require('../dist/modules/admin/system-admin/services/system-admin.service');
const { SystemAdminController } = require('../dist/modules/admin/system-admin/controllers/system-admin.controller');
const { SalesAdminController } = require('../dist/modules/admin/sales-admin/controllers/sales-admin.controller');
const sales = require('../dist/modules/admin/sales-admin/services/sales-admin.service').default;
const { User } = require('../dist/modules/auth/models/user.model');
const validators = require('../dist/modules/admin/system-admin/validators/system-admin.validator');
const app = express();
const controller = new SystemAdminController();
app.get('/users', controller.getAllUsers);
app.get('/orders/export', new SalesAdminController().exportOrders);
app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ message: err.message }));

test('verification filters reach MongoDB for both true and false', async () => {
  const original = { count: User.countDocuments, find: User.find };
  let seen = [];
  User.countDocuments = async query => { seen.push(query); return 0; };
  User.find = query => { seen.push(query); const chain = { select: () => chain, populate: () => chain, sort: () => chain, limit: () => chain, skip: async () => [] }; return chain; };
  try {
    for (const value of [true, false]) {
      seen = [];
      const response = await request(app).get('/users?emailVerified=' + value);
      assert.equal(response.status, 200);
      assert.ok(seen.length === 2 && seen.every(query => query.emailVerified === value));
    }
    seen = [];
    assert.equal((await request(app).get('/users?emailVerified=invalid')).status, 400);
    assert.equal(seen.length, 0);
  } finally { User.countDocuments = original.count; User.find = original.find; }
});

test('user CSV exports escape quotes, commas, newlines and nested metadata', () => {
  const csv = new SystemAdminService().convertToCSV([{ toObject: () => ({ name: 'A "name", test\nline', metadata: { value: 'one,two' }, empty: null }) }]);
  assert.equal(csv, 'name,metadata,empty\n"A ""name"", test\nline","{""value"":""one,two""}",');
});

test('invalid admin roles/statuses return validation errors before persistence', () => {
  assert.ok(validators.updateUserSchema.validate({ role: 'imaginary-admin' }).error);
  assert.ok(validators.updateUserSchema.validate({ status: 'imaginary-status' }).error);
  assert.ok(validators.changeRoleSchema.validate({ role: 'imaginary-admin' }).error);
  assert.ok(validators.bulkUpdateSchema.validate({ userIds: ['111111111111111111111111'], updates: { role: 'imaginary-admin' } }).error);
  for (const role of ['system-admin', 'sales-admin', 'web-admin', 'helpdesk']) assert.equal(validators.updateUserSchema.validate({ role }).error, undefined);
});

test('empty order exports produce a valid header-only CSV rather than 404', async () => {
  const original = sales.exportOrders;
  sales.exportOrders = async () => [];
  try {
    const response = await request(app).get('/orders/export');
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /text\/csv/);
    assert.equal(response.text, '"Order Number","Date","Customer","Email","Total","Status","Payment Status","Payment Method","Items"');
  } finally { sales.exportOrders = original; }
});

test('CMS slide lists preserve backend pagination, including an empty requested page', async () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../../esl-cms/src/app/web-admin/slides/actions.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const pagination = { page: 2, limit: 10, total: 17, totalPages: 2 };
  const context = { exports: {}, console, URLSearchParams, require: () => ({ apiRequest: async () => ({ success: true, data: [], pagination }) }) };
  vm.runInNewContext(code, context);
  const result = await context.exports.getSlides({ page: 2 });
  assert.equal(result.success, true);
  assert.equal(result.pagination.page, 2);
  assert.equal(result.pagination.total, 17);
  assert.equal(result.pagination.hasPrev, true);
  assert.equal(result.pagination.hasNext, false);
});
