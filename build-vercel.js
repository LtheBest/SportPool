#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('📦 Building SportPool for Vercel...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    console.log('🧹 Cleaning dist directory...');
    execSync('rm -rf dist', { stdio: 'inherit' });
  }

  // Build client
  console.log('🎨 Building client...');
  execSync('vite build', { stdio: 'inherit' });

  // Build server
  console.log('🚀 Building server...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });

  // Copy shared folder to dist if it exists
  if (fs.existsSync('shared')) {
    console.log('📁 Copying shared folder...');
    execSync('cp -r shared dist/', { stdio: 'inherit' });
  }

  // Verify build
  const distPublicPath = path.resolve(process.cwd(), 'dist', 'public');
  const indexPath = path.join(distPublicPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    throw new Error(`❌ Build verification failed: ${indexPath} not found`);
  }

  console.log('✅ Build completed successfully!');
  console.log(`📂 Client files: ${distPublicPath}`);
  console.log(`🖥️  Server file: ${path.resolve(process.cwd(), 'dist', 'index.js')}`);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}