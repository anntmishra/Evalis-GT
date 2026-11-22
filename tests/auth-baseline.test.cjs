const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');

// Load the real middleware with isolated dependencies: no database, provider calls,
// environment files, or background timers. These are boundary tests, not login E2E.
function loadAuth(environment) {
  const unexpected = () => { throw new Error('Unexpected external dependency call'); };
  const dependencies = {
    jsonwebtoken: { verify: () => { throw new Error('Invalid token'); } },
    'express-async-handler': handler => handler,
    sequelize: { Op: { or: Symbol('or') } },
    '../models': { Tenant: { findOne: unexpected } },
    '../utils/clerk': { verifyClerkToken: async () => null },
    '../utils/tenant': { resolveTenantId: unexpected },
    '../utils/logger': { logger: { warn() {}, debug() {}, info() {} } },
  };
  const context = {
    module: { exports: {} },
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unstubbed dependency: ${name}`);
      return dependencies[name];
    },
    process: { env: { NODE_ENV: environment, JWT_SECRET: 'test-only' } },
    setInterval() {},
    console: { log() {}, error() {} },
  };
  vm.runInNewContext(readFileSync(resolve(__dirname, '../server/middleware/authMiddleware.js'), 'utf8'), context);
  return context.module.exports;
}

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; } };
}

for (const environment of ['development', 'test', 'production']) {
  for (const authorization of [undefined, 'Basic credentials', 'Bearer ', 'Bearer invalid']) {
    test(`${environment}: rejects ${authorization === undefined ? 'missing authorization' : authorization}`, async () => {
      const { protect } = loadAuth(environment);
      const req = { headers: authorization === undefined ? {} : { authorization } };
      const res = response();
      let passed = false;
      await assert.rejects(protect(req, res, () => { passed = true; }), /Not authorized/);
      assert.equal(res.statusCode, 401);
      assert.equal(passed, false);
      assert.equal(req.user, undefined);
      assert.equal(req.admin, undefined);
    });
  }
}

test('student cannot use admin or faculty-only middleware', () => {
  const auth = loadAuth('test');
  for (const middleware of [auth.admin, auth.teacher, auth.requireRole(['dean'])]) {
    const res = response();
    assert.throws(() => middleware({ user: { role: 'student' } }, res, () => assert.fail('Access granted')), /Not authorized/);
    assert.equal(res.statusCode, 403);
  }
});

test('faculty subroles retain access to teacher middleware', () => {
  const { teacher } = loadAuth('test');
  for (const role of ['teacher', 'hod', 'dean', 'assistant_dean', 'programme_coordinator', 'coe']) {
    let passed = false;
    teacher({ user: { role } }, response(), () => { passed = true; });
    assert.equal(passed, true, role);
  }
});

test('only Master Admin and COE can manage manual or imported accounts', () => {
  const { adminOrCoe } = loadAuth('test');
  for (const role of ['admin', 'master_admin', 'coe']) {
    let passed = false;
    adminOrCoe({ user: { role } }, response(), () => { passed = true; });
    assert.equal(passed, true, role);
  }
  for (const role of ['student', 'teacher', 'hod', 'dean', 'assistant_dean', 'programme_coordinator']) {
    const res = response();
    assert.throws(() => adminOrCoe({ user: { role } }, res, () => assert.fail('Access granted')), /Master Admin or COE/);
    assert.equal(res.statusCode, 403, role);
  }
});
