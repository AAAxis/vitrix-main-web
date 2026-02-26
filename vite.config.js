import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Load .env.local for EXERCISEDB_RAPIDAPI_KEY
let envVars = {};
try {
  const envPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
} catch (_) {}

// Inline exercise-image proxy plugin for Vite dev server
// This means `npm run dev:client` (vite only) can serve exercise GIFs
// without needing the separate Express server on port 3001.
function exerciseImageProxyPlugin() {
  const ALLOWED_ORIGINS = [
    'https://cdn.exercisedb.dev',
    'https://v2.exercisedb.dev',
    'https://v2.exercisedb.io',
    'https://exercisedb.p.rapidapi.com',
  ];

  return {
    name: 'exercise-image-proxy',
    configureServer(server) {
      server.middlewares.use('/api/exercise-image', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const rawUrl = url.searchParams.get('url');
        if (!rawUrl || typeof rawUrl !== 'string') {
          res.statusCode = 400;
          res.end('Missing url');
          return;
        }

        let targetUrl;
        try {
          targetUrl = decodeURIComponent(rawUrl);
        } catch {
          res.statusCode = 400;
          res.end('Invalid url');
          return;
        }

        const allowed = ALLOWED_ORIGINS.some(origin => targetUrl.startsWith(origin));
        if (!allowed) {
          res.statusCode = 403;
          res.end('URL not allowed');
          return;
        }

        const apiKey = envVars.EXERCISEDB_RAPIDAPI_KEY
          || envVars.VITE_EXERCISEDB_RAPIDAPI_KEY
          || process.env.EXERCISEDB_RAPIDAPI_KEY
          || process.env.VITE_EXERCISEDB_RAPIDAPI_KEY
          || '19a9c82334msh8f9441d42ac9c20p1eb287jsnf6c9f6f8eb4b';

        const isRapidAPI = targetUrl.startsWith('https://exercisedb.p.rapidapi.com/');
        const fetchHeaders = { 'Accept': 'image/*' };
        if (isRapidAPI) {
          fetchHeaders['x-rapidapi-host'] = 'exercisedb.p.rapidapi.com';
          fetchHeaders['x-rapidapi-key'] = apiKey;
        }

        try {
          const response = await fetch(targetUrl, { headers: fetchHeaders, redirect: 'follow' });
          if (!response.ok) {
            res.statusCode = response.status;
            res.end('Upstream error');
            return;
          }
          const contentType = response.headers.get('content-type') || 'image/gif';
          const buffer = Buffer.from(await response.arrayBuffer());
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.end(buffer);
        } catch (err) {
          console.error('Exercise image proxy error:', err);
          res.statusCode = 502;
          res.end('Proxy error');
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), exerciseImageProxyPlugin()],
  server: {
    allowedHosts: true,
    proxy: {
      // Forward other /api calls to Express (if running), but exercise-image
      // is handled by the Vite plugin above so it works without Express too.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})
