#!/usr/bin/env node
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

console.log('🚀 Starting Vercel simulation server...');

// Middleware for logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// API Routes - Simulate Vercel's API routing
app.get('/api/health', async (req, res) => {
  try {
    console.log('🏥 Health check requested');
    const { default: healthHandler } = await import('./api/health.ts');
    await healthHandler(req, res);
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({ error: 'Health check failed', message: error.message });
  }
});

app.all('/api/*', async (req, res) => {
  try {
    console.log(`🔄 API Request: ${req.method} ${req.path}`);
    
    // Load the main API handler
    const { default: apiHandler } = await import('./api/index.ts');
    await apiHandler(req, res);
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Static files from public directory
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  console.log(`📁 Serving static files from: ${publicPath}`);
  app.use(express.static(publicPath));
} else {
  console.warn(`⚠️  Public directory not found: ${publicPath}`);
}

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`📄 Serving SPA for: ${req.path}`);
    res.sendFile(indexPath);
  } else {
    console.error(`❌ index.html not found: ${indexPath}`);
    res.status(404).json({ error: 'Not Found', message: 'Application not built' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Unhandled Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Vercel simulation server started!`);
  console.log(`🌐 URL: http://localhost:${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/api/health`);
  console.log(`📋 API available at: http://localhost:${port}/api/*`);
  console.log(`📁 Static files: ${publicPath}`);
  
  // Verify files exist
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`✅ Frontend ready: index.html found`);
  } else {
    console.log(`❌ Frontend not ready: index.html missing`);
    console.log(`   Run: npm run build:client && cp -r dist/public/* public/`);
  }
  
  console.log('\n🎯 Ready for testing! 🎯');
});