// Exercise every registered admin route with real role/upload/validation middleware.
// Only authentication identity and final controllers are replaced: no DB writes,
// storage uploads, real sessions or email delivery occur in this test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const auth = require('../dist/modules/auth/middlewares/auth.middleware');
auth.authenticate = (req, res, next) => {
  const role = req.get('x-test-role');
  if (!role) return res.sendStatus(401);
  req.user = { _id: '111111111111111111111111', role, permissions: [] };
  next();
};
require('../dist/shared/utils/logger.util').logger.warn = () => {};
const roles = ['system-admin', 'sales-admin', 'web-admin', 'helpdesk', 'customer', null];
for (const [moduleName, role] of [['system', 'sales-admin'], ['sales', 'sales-admin'], ['web', 'web-admin']]) {
  const folder = `${moduleName}-admin`;
  const router = require(`../dist/modules/admin/${folder}/routes/${folder}.routes`).default;
  const routes = router.stack.filter(layer => layer.route);
  const restrictedSystemPaths = ['/health', '/users/:userId/role', '/users/bulk-update'];
  for (const layer of routes) {
    const final = layer.route.stack.at(-1);
    final.handle = (_req, res) => res.sendStatus(204);
  }
  const app = express();
  app.use(express.json(), router);
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ message: err.message }));
  test(`${moduleName}: ${routes.length} routes enforce the role matrix (six identities each)`, async () => {
    for (const layer of routes) {
      const route = layer.route;
      const method = Object.keys(route.methods)[0];
      const url = route.path.replace(/:[^/]+/g, '222222222222222222222222');
      const sysOnly = moduleName === 'system' && (method === 'delete' || restrictedSystemPaths.includes(route.path));
      for (const identity of roles) {
        let req = request(app)[method](url);
        if (identity) req = req.set('x-test-role', identity);
        const response = await req.send({});
        const allowed = identity === 'system-admin' || (!sysOnly && identity === role);
        const label = `${identity || 'anonymous'} ${method.toUpperCase()} ${moduleName}${url}: ${JSON.stringify(response.body)}`;
        if (!identity) assert.equal(response.status, 401, label);
        else if (!allowed) assert.equal(response.status, 403, label);
        // An empty mutation body may fail validation before reaching the stub.
        else assert.ok([204, 400, 422].includes(response.status), `${response.status}: ${label}`);
      }
    }
  });
}

test('CMS role landing paths handle every admin and reject inherited object keys', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../esl-cms/src/lib/auth/roles.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {} };
  vm.runInNewContext(code, context);
  for (const role of roles.slice(0, 4)) assert.equal(context.exports.getLandingPath(role), `/${role}/dashboard`);
  for (const role of [null, undefined, 'customer', '__proto__', 'constructor', 'toString']) assert.equal(context.exports.getLandingPath(role), '/login');
  for (const requested of ['//example.com', 'https://example.com', '/\\example.com']) {
    assert.equal(context.exports.resolveRedirectPath(requested, 'web-admin'), '/web-admin/dashboard');
  }
});

test('CMS module guards and navigation allow system admins into sales and web workspaces', () => {
  const root = path.resolve(__dirname, '../../esl-cms/src');
  for (const role of ['sales-admin', 'web-admin', 'helpdesk']) {
    const source = fs.readFileSync(path.join(root, 'app', role, 'layout.tsx'), 'utf8');
    assert.match(source, new RegExp(`allowedRoles=\\{\\["${role}", "system-admin"\\]\\}`));
  }
  const sidebar = fs.readFileSync(path.join(root, 'components/layout/sidebar.tsx'), 'utf8');
  for (const role of ['sales-admin', 'web-admin']) assert.ok(sidebar.includes(`roles: ["${role}", "system-admin"]`));
});
