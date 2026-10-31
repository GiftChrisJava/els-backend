// Real app routes, without a database connection or external service calls.
process.env.NODE_ENV = 'test';
process.env.EMAIL_PASSWORD = '';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../dist/app').default;
const { logger } = require('../dist/shared/utils/logger.util');

test('the tracked environment template contains no Supabase server credential', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const template = fs.readFileSync(path.resolve(__dirname, '../.env.example'), 'utf8');
  assert.match(template, /^SUPABASE_SECRET_KEY=\s*$/m);
  assert.doesNotMatch(template, /sb_secret_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(template, /^SUPABASE_SERVICE_ROLE_KEY=.+$/m);
});

test('Render root and health probes return 200 without authentication or error logging', async () => {
  const original = logger.error;
  const errors = [];
  logger.error = (...args) => errors.push(args);
  try {
    for (const path of ['/', '/health']) {
      const get = await request(app).get(path);
      assert.equal(get.status, 200);
      assert.equal(get.body.status, 'healthy');
      assert.equal(typeof get.body.uptime, 'number');
      const head = await request(app).head(path);
      assert.equal(head.status, 200);
      assert.match(head.headers['content-type'], /application\/json/);
      assert.equal(head.text, undefined);
    }
    assert.equal(errors.length, 0);
  } finally { logger.error = original; }
});
