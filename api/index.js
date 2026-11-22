// Vercel serverless function handler
// This file routes all API requests to our Express serverless handler

// Vercel's Node 26 runtime no longer exposes SlowBuffer. Some transitive JWT
// dependencies still read it while loading, so install the compatibility alias
// before the Express application imports authentication modules.
require('../server/utils/nodeRuntimeCompat');

const app = require('../server/serverless-robust');

module.exports = app;
