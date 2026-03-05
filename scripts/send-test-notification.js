#!/usr/bin/env node
/**
 * Send a test push notification to a token.
 * Usage: node scripts/send-test-notification.js [token] [baseUrl]
 * Example: node scripts/send-test-notification.js 82312080bb6d3ac58eae71ff11ee9674f8c11beadc0185d9c1941ee257ffdd24
 *          node scripts/send-test-notification.js 82312... https://your-app.vercel.app
 */
const token = process.argv[2] || '82312080bb6d3ac58eae71ff11ee9674f8c11beadc0185d9c1941ee257ffdd24';
const baseUrl = process.argv[3] || 'http://localhost:3001';

const url = `${baseUrl.replace(/\/$/, '')}/api/send-notification`;
const body = {
  title: 'Test',
  body: 'Test notification',
  tokens: [token],
};

console.log('Sending test to', url, '...');
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
  .then((r) => r.json())
  .then((data) => {
    console.log('Response:', JSON.stringify(data, null, 2));
  })
  .catch((err) => {
    console.error('Error:', err.message);
    console.log('\nIf local: run "npm run dev" in muscle-up-main first, then run this again.');
    console.log('Or pass your deployed URL: node scripts/send-test-notification.js', token, 'https://your-app.vercel.app');
  });
