/**
 * Server Restart Helper
 * 
 * This script provides a clean way to restart the server with improved settings
 * for handling connection overload issues.
 */

require('dotenv').config();
const path = require('path');
const { spawn } = require('child_process');
const colors = require('colors');

// Environment variable overrides for better performance
process.env.MAX_CONNECTIONS = process.env.MAX_CONNECTIONS || '100';
process.env.NODE_OPTIONS = `--max-http-header-size=16384 ${process.env.NODE_OPTIONS || ''}`;

console.log('Starting server with improved connection settings:'.yellow);
console.log('- Max connections:'.cyan, process.env.MAX_CONNECTIONS);
console.log('- Node options:'.cyan, process.env.NODE_OPTIONS);

// Path to server.js
const serverPath = path.join(__dirname, 'server.js');

// Start the server process
const serverProcess = spawn('node', [serverPath], {
  env: process.env,
  stdio: 'inherit'
});

// Handle server process events
serverProcess.on('error', (err) => {
  console.error('Failed to start server:'.red, err.message);
});

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down server gracefully...'.yellow);
  serverProcess.kill('SIGINT');
  
  // Give the server a moment to clean up connections
  setTimeout(() => {
    console.log('Server shutdown complete.'.green);
    process.exit(0);
  }, 2000);
}); 