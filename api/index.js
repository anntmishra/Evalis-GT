// Vercel serverless function handler
// This file routes all API requests to our Express serverless handler

// Use minimal version for debugging
const app = require('../server/serverless-minimal');

module.exports = app;
