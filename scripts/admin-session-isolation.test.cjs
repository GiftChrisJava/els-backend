// Real authentication middleware; token/session/user lookups are isolated fakes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Session } = require('../dist/modules/auth/models/session.model');
const { User } = require('../dist/modules/auth/models/user.model');
const { TokenService } = require('../dist/modules/auth/services/token.service');
const { authenticate } = require('../dist/modules/auth/middlewares/auth.middleware');
require('../dist/shared/utils/logger.util').logger.error = () => {};

test('concurrent requests keep four admin identities and sessions separate', async () => {
  const roles = ['system-admin', 'sales-admin', 'web-admin', 'helpdesk'];
  const users = roles.map((role, i) => ({ _id: String(i + 1).repeat(24), role, status: 'active' }));
  const activity = [];
  const original = { verify: TokenService.prototype.verifyAccessToken, session: Session.findActiveSession, user: User.findById };
  TokenService.prototype.verifyAccessToken = async token => ({ userId: users[Number(token)]._id });
  Session.findActiveSession = async token => ({ _id: 'session-' + token, updateActivity: async () => { activity.push(token); } });
  User.findById = id => ({ select: async () => { await new Promise(resolve => setTimeout(resolve, Math.random() * 10)); return users.find(user => user._id === id); } });
  try {
    await Promise.all(Array.from({ length: 32 }, async (_, index) => {
      const identity = index % 4;
      const req = { headers: { authorization: 'Bearer ' + identity } };
      await authenticate(req, {}, error => { if (error) throw error; });
      assert.equal(req.user._id, users[identity]._id);
      assert.equal(req.role, roles[identity]);
      assert.equal(req.sessionId, 'session-' + identity);
    }));
    assert.equal(activity.length, 32);
  } finally {
    TokenService.prototype.verifyAccessToken = original.verify;
    Session.findActiveSession = original.session;
    User.findById = original.user;
  }
});
