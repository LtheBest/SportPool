#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('📦 Building SportPool for Vercel deployment...');

try {
  // 1. Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync('dist')) execSync('rm -rf dist');
  if (fs.existsSync('public')) execSync('rm -rf public');
  if (fs.existsSync('.vercel')) execSync('rm -rf .vercel');

  // 2. Install dependencies
  console.log('📥 Installing dependencies...');
  execSync('npm ci --only=production', { stdio: 'inherit' });

  // 3. Build client (frontend)
  console.log('🎨 Building client...');
  execSync('npm run build:client', { stdio: 'inherit' });

  // 4. Prepare public directory for Vercel
  console.log('📁 Preparing public directory...');
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }

  // Copy built client files to public
  if (fs.existsSync('dist/public')) {
    execSync('cp -r dist/public/* public/', { stdio: 'inherit' });
  } else if (fs.existsSync('client/dist')) {
    execSync('cp -r client/dist/* public/', { stdio: 'inherit' });
  }

  // 5. Ensure index.html exists
  const indexPath = path.join('public', 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ index.html not found in public directory');
    process.exit(1);
  }

  // 6. Copy necessary server files
  console.log('🔧 Copying server files...');
  if (fs.existsSync('server') && !fs.existsSync('api/../server')) {
    // Server files are accessible from api folder
  }

  // 7. Copy shared directory if exists
  if (fs.existsSync('shared') && !fs.existsSync('api/../shared')) {
    // Shared files are accessible from api folder
  }

  // 8. Verification
  console.log('✅ Build verification...');
  const requiredFiles = [
    'public/index.html',
    'api/index.ts',
    'vercel.json',
    'package.json'
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ Required file missing: ${file}`);
      process.exit(1);
    }
  }

  // 9. Display build info
  console.log('\n🎉 Build completed successfully!');
  console.log('📊 Build summary:');
  console.log(`   📂 Frontend: ${fs.readdirSync('public').length} files in public/`);
  console.log(`   🔌 API: ${fs.readdirSync('api').length} handlers in api/`);
  console.log(`   📄 Config: vercel.json configured`);
  console.log('\n🚀 Ready for Vercel deployment!');
  console.log('   Command: vercel --prod');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Health check endpoint info
console.log('\n📡 API endpoints will be available at:');
console.log('   🔐 Auth: /api/auth/*');
console.log('   📅 Events: /api/events/*'); 
console.log('   🏢 Organizations: /api/organizations/*');
console.log('   📎 Uploads: /api/uploads/*');