#!/usr/bin/env node
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

console.log('🚀 Starting Render Development Server...');
console.log('📋 This server simulates the exact Render.com environment');

// Trust proxy (like Render does)
app.set('trust proxy', 1);

// Security headers (like Render)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// CORS headers for API routes
app.use('/api/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Load and initialize the actual application
let appInitialized = false;
let appModule = null;

async function initializeApp() {
  if (!appInitialized) {
    try {
      console.log('🔧 Initializing TeamMove application...');
      
      // Set environment variables for development that match production
      process.env.NODE_ENV = 'production';
      process.env.APP_URL = `http://localhost:${port}`;
      
      // Import the compiled server if it exists, otherwise use tsx to run TypeScript
      if (fs.existsSync('./dist/index.js')) {
        console.log('📦 Using compiled server from dist/index.js');
        appModule = await import('./dist/index.js');
      } else {
        console.log('📝 Using TypeScript server (compiling on the fly)');
        // Use tsx to import TypeScript directly
        const { spawn } = await import('child_process');
        
        // Start the TypeScript server as a child process
        const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
          stdio: 'pipe',
          env: {
            ...process.env,
            NODE_ENV: 'production',
            PORT: (port + 1).toString(), // Use a different port for the backend
            APP_URL: `http://localhost:${port}`
          }
        });

        // Proxy API requests to the TypeScript server
        const { createProxyMiddleware } = await import('http-proxy-middleware');
        
        app.use('/api', createProxyMiddleware({
          target: `http://localhost:${port + 1}`,
          changeOrigin: true,
          onError: (err, req, res) => {
            console.error('Proxy error:', err.message);
            res.status(500).json({ error: 'Backend service unavailable' });
          }
        }));

        // Handle server process
        serverProcess.stdout.on('data', (data) => {
          console.log(`[Backend] ${data.toString().trim()}`);
        });

        serverProcess.stderr.on('data', (data) => {
          console.error(`[Backend Error] ${data.toString().trim()}`);
        });

        // Wait for server to be ready
        await new Promise((resolve) => {
          setTimeout(resolve, 3000); // Give the server time to start
        });
      }

      appInitialized = true;
      console.log('✅ TeamMove application initialized');
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      throw error;
    }
  }
}

// Health check endpoint (available immediately)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'render-dev-simulation',
    version: '1.0.0'
  });
});

// Initialize app on first request if not using compiled version
app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api') || appInitialized || fs.existsSync('./dist/index.js')) {
    return next();
  }

  try {
    await initializeApp();
    next();
  } catch (error) {
    console.error('App initialization failed:', error);
    res.status(500).json({ error: 'Application initialization failed' });
  }
});

// Static files from dist/public (like Render)
const publicPath = path.join(__dirname, 'dist', 'public');
if (fs.existsSync(publicPath)) {
  console.log(`📁 Serving static files from: ${publicPath}`);
  app.use(express.static(publicPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true
  }));
} else {
  console.warn(`⚠️  Build directory not found: ${publicPath}`);
  console.warn('   Run: npm run build:render');
}

// Catch-all for SPA routing (like Render)
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    console.log(`📄 Serving SPA for: ${req.path}`);
    res.sendFile(indexPath);
  } else {
    console.error(`❌ index.html not found: ${indexPath}`);
    res.status(404).send(`
      <h1>TeamMove - Build Required</h1>
      <p>Please run the build command:</p>
      <pre>npm run build:render</pre>
      <p>Then restart this server.</p>
    `);
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(port, '0.0.0.0', async () => {
  console.log(`✅ Render Development Server started!`);
  console.log(`🌐 URL: http://localhost:${port}`);
  console.log(`🏥 Health: http://localhost:${port}/api/health`);
  console.log(`📁 Static: ${publicPath}`);
  
  // Try to initialize if we have a compiled version
  if (fs.existsSync('./dist/index.js')) {
    try {
      await initializeApp();
    } catch (error) {
      console.error('Failed to initialize compiled app:', error);
    }
  }
  
  console.log('\n🎯 This environment simulates Render.com exactly!');
  console.log('📋 Test your deployment before pushing to production');
  
  // Check if build exists
  if (!fs.existsSync(publicPath)) {
    console.log('\n⚠️  No build found. Run: npm run build:render');
  } else {
    console.log('\n✅ Build found and ready to serve');
  }
});