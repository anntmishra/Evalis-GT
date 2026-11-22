const test = require('node:test');
const assert = require('node:assert/strict');
const { resolvePublicAppUrl } = require('../server/utils/publicAppUrl');

test('production invitations prefer the stable Vercel production domain', () => {
  assert.equal(resolvePublicAppUrl({
    NODE_ENV: 'production',
    FRONTEND_URL: 'http://localhost:5173',
    VERCEL_PROJECT_PRODUCTION_URL: 'evalis-gt.vercel.app',
  }), 'https://evalis-gt.vercel.app');
});

test('production invitations cannot silently point recipients to localhost', () => {
  assert.throws(() => resolvePublicAppUrl({ NODE_ENV: 'production', FRONTEND_URL: 'http://localhost:5173' }), /points to localhost/);
});

test('local development invitations retain the local frontend address', () => {
  assert.equal(resolvePublicAppUrl({ NODE_ENV: 'development', FRONTEND_URL: 'http://localhost:5173/' }), 'http://localhost:5173');
});
