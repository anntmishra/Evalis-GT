const asyncHandler = require('express-async-handler');
const axios = require('axios');

const DEFAULT_MODEL = 'gemini-2.5-flash';
const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// @desc    Proxy a generateContent request to Google Gemini, keeping the API key server-side
// @route   POST /api/ai/gemini/generate
// @access  Private
const generateContent = asyncHandler(async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    res.status(503);
    throw new Error('Gemini API key is not configured on the server');
  }

  const { contents, generationConfig, model } = req.body;

  if (!contents) {
    res.status(400);
    throw new Error('Missing required field: contents');
  }

  const targetModel = model || DEFAULT_MODEL;
  const url = `${GOOGLE_API_BASE}/${targetModel}:generateContent?key=${apiKey}`;

  const response = await axios.post(
    url,
    { contents, ...(generationConfig ? { generationConfig } : {}) },
    { timeout: 30000 }
  );

  res.json(response.data);
});

module.exports = { generateContent };
