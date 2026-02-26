// Express server for API routes (mimics Next.js API routes pattern)
// This allows local development without Vercel functions
import express from 'express';
import cors from 'cors';
import fs from 'fs';

// Load .env.local into process.env if present (for EXERCISEDB_RAPIDAPI_KEY etc.)
try {
  const envPath = new URL('../.env.local', import.meta.url);
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
} catch (_) {}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import API route handlers
import { POST as sendNotificationPOST } from './app/api/send-notification/route.js';
import { POST as sendGroupEmailPOST } from './app/api/send-group-email/route.js';
import { POST as sendGroupNotificationPOST } from './app/api/send-group-notification/route.js';

// Helper function to handle Next.js-style API routes
const handleAPIRoute = async (handler, req, res) => {
  const request = {
    json: async () => req.body,
    body: req.body
  };
  
  try {
    const nextResponse = await handler(request);
    
    // Handle NextResponse
    if (nextResponse && nextResponse.body) {
      res.status(nextResponse.status || 200);
      
      // Set headers
      if (nextResponse.headers) {
        Object.entries(nextResponse.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }
      
      // Parse and send JSON response
      try {
        const jsonData = JSON.parse(nextResponse.body);
        res.json(jsonData);
      } catch (parseError) {
        res.send(nextResponse.body);
      }
    } else {
      res.status(500).json({ error: 'Invalid response format' });
    }
  } catch (error) {
    console.error('❌ Error in API handler:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// API Routes (matching Next.js app/api structure)
app.post('/api/send-notification', async (req, res) => {
  await handleAPIRoute(sendNotificationPOST, req, res);
});

app.post('/api/send-group-email', async (req, res) => {
  await handleAPIRoute(sendGroupEmailPOST, req, res);
});

app.post('/api/send-group-notification', async (req, res) => {
  await handleAPIRoute(sendGroupNotificationPOST, req, res);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy exercise images/GIFs (same-origin so web avoids CORS; Expo app loads URLs directly)
const EXERCISE_MEDIA_ORIGINS = [
  'https://cdn.exercisedb.dev',
  'https://v2.exercisedb.dev',
  'https://v2.exercisedb.io',
  'https://exercisedb.p.rapidapi.com',
];
app.get('/api/exercise-image', async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    res.status(400).send('Missing url');
    return;
  }
  let targetUrl;
  try {
    targetUrl = decodeURIComponent(rawUrl);
  } catch {
    res.status(400).send('Invalid url');
    return;
  }
  const allowed = EXERCISE_MEDIA_ORIGINS.some(origin => targetUrl.startsWith(origin));
  if (!allowed) {
    res.status(403).send('URL not allowed');
    return;
  }
  const isRapidAPI = targetUrl.startsWith('https://exercisedb.p.rapidapi.com/');
  const apiKey = process.env.EXERCISEDB_RAPIDAPI_KEY || process.env.VITE_EXERCISEDB_RAPIDAPI_KEY || '19a9c82334msh8f9441d42ac9c20p1eb287jsnf6c9f6f8eb4b';
  const fetchOptions = {
    headers: { 'Accept': 'image/*' },
    redirect: 'follow',
  };
  if (isRapidAPI) {
    fetchOptions.headers['x-rapidapi-host'] = 'exercisedb.p.rapidapi.com';
    fetchOptions.headers['x-rapidapi-key'] = apiKey;
  }
  try {
    const response = await fetch(targetUrl, fetchOptions);
    if (!response.ok) {
      res.status(response.status).send('Upstream error');
      return;
    }
    const contentType = response.headers.get('content-type') || 'image/gif';
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    console.error('Exercise image proxy error:', err);
    res.status(502).send('Proxy error');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📡 API routes available at http://localhost:${PORT}/api/*`);
  console.log(`🖼️  Exercise GIFs: run "npm run dev" (not just "npm run start") so this server is up and web can load GIFs via /api/exercise-image`);
});
