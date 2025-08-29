#!/usr/bin/env node
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

console.log('🚀 Starting Vercel simulation server (with TypeScript compilation)...');

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

// Simple health check without dependencies
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'SportPool API is running',
    version: '1.0.0',
    frontend: fs.existsSync(path.join(__dirname, 'public', 'index.html')) ? 'ready' : 'not_built'
  });
});

// Simulate main API handler
app.all('/api/*', (req, res) => {
  console.log(`🔄 API Request: ${req.method} ${req.path}`);
  
  // For testing purposes, return a mock response
  const endpoint = req.path.replace('/api/', '');
  
  res.json({
    status: 'success',
    endpoint: endpoint,
    method: req.method,
    message: `API endpoint ${endpoint} is working`,
    timestamp: new Date().toISOString(),
    note: 'This is a simulation response - actual implementation will handle real requests'
  });
});

// Static files from public directory
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  console.log(`📁 Serving static files from: ${publicPath}`);
  app.use(express.static(publicPath));
} else {
  console.warn(`⚠️  Public directory not found: ${publicPath}`);
}

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`📄 Serving SPA for: ${req.path}`);
    res.sendFile(indexPath);
  } else {
    console.error(`❌ index.html not found: ${indexPath}`);
    res.status(404).json({ 
      error: 'Not Found', 
      message: 'Frontend not built. Run: npm run build:client && cp -r dist/public/* public/' 
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Unhandled Server Error',
    message: err.message
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
  console.log('📝 Note: This is a simulation server to test Vercel-like behavior');
});