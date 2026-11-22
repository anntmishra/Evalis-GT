function normalizeUrl(value) {
  const first = String(value || '').split(',')[0].trim().replace(/\/$/, '');
  if (!first) return null;
  const withProtocol = /^https?:\/\//i.test(first) ? first : `https://${first}`;
  const parsed = new URL(withProtocol);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Public application URL must use HTTP or HTTPS');
  return parsed.origin;
}

function resolvePublicAppUrl(env = process.env) {
  const production = env.NODE_ENV === 'production' || Boolean(env.VERCEL);
  const candidates = production
    ? [env.PUBLIC_APP_URL, env.VERCEL_PROJECT_PRODUCTION_URL, env.VERCEL_URL, env.FRONTEND_URL]
    : [env.PUBLIC_APP_URL, env.FRONTEND_URL, 'http://localhost:5173'];
  const resolved = candidates.map(normalizeUrl).find(Boolean);
  if (!resolved) throw new Error('Set PUBLIC_APP_URL or FRONTEND_URL before sending invitations');
  const host = new URL(resolved).hostname;
  if (production && ['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Invitation email blocked: the production public application URL points to localhost');
  }
  return resolved;
}

module.exports = { resolvePublicAppUrl };
