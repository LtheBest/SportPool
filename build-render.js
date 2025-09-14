#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building TeamMove for Render deployment...');

try {
  // 1. Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync('dist')) execSync('rm -rf dist');

  // 2. Build client (frontend) with memory optimization
  console.log('🎨 Building client with optimized Vite...');
  
  // Set environment variables for memory-efficient build
  process.env.RENDER = 'true';
  process.env.NODE_ENV = 'production';
  process.env.NODE_OPTIONS = '--max-old-space-size=1024';
  
  try {
    execSync('npm run build:client', { 
      stdio: 'inherit',
      env: { 
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=1024'
      },
      timeout: 300000 // 5 minutes timeout
    });
  } catch (error) {
    console.log('⚠️ Vite build failed, trying alternative build method...');
    
    // Fallback: Build with reduced parallelism
    console.log('🔄 Attempting build with reduced resources...');
    execSync('node --max-old-space-size=1024 ./node_modules/.bin/vite build', {
      stdio: 'inherit',
      cwd: './client',
      timeout: 300000
    });
  }

  // 3. Build server (backend)
  console.log('🛠️ Building server with esbuild...');
  execSync('npm run build:server', { stdio: 'inherit' });

  // 4. Copy static assets and ensure proper structure
  console.log('📁 Organizing build files...');
  
  // Ensure dist/public exists and copy client build
  if (fs.existsSync('dist/public')) {
    console.log('✅ Client build found at dist/public');
  } else {
    throw new Error('❌ Client build not found at dist/public');
  }

  // 5. Create server startup script
  const startupScript = `#!/usr/bin/env node
// Render startup script for TeamMove
import './index.js';
`;
  
  fs.writeFileSync('dist/start.js', startupScript);
  
  // 6. Copy essential files
  console.log('📋 Copying configuration files...');
  
  if (fs.existsSync('package.json')) {
    fs.copyFileSync('package.json', 'dist/package.json');
  }
  
  if (fs.existsSync('shared')) {
    execSync('cp -r shared dist/', { stdio: 'inherit' });
  }

  // 7. Update package.json for Render
  const packageJsonPath = 'dist/package.json';
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Simplify scripts for production
    packageJson.scripts = {
      "start": "node index.js"
    };
    
    // Remove devDependencies to reduce size
    delete packageJson.devDependencies;
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  // 8. Create health check file
  console.log('🏥 Setting up health check...');
  const healthCheckJs = `
// Health check endpoint for Render
export default function healthCheck(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}
  `;
  
  fs.writeFileSync('dist/health.js', healthCheckJs.trim());

  // 9. Verification
  console.log('✅ Build verification...');
  const requiredFiles = [
    'dist/index.js',
    'dist/public/index.html',
    'dist/package.json'
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`❌ Required file missing: ${file}`);
    }
  }

  // 10. Display build summary
  const stats = {
    serverSize: (fs.statSync('dist/index.js').size / 1024).toFixed(2),
    frontendFiles: fs.readdirSync('dist/public').length,
    totalSize: execSync('du -sh dist', { encoding: 'utf8' }).split('\t')[0]
  };

  console.log('\n🎉 Build completed successfully for Render!');
  console.log('📊 Build summary:');
  console.log(`   📦 Server bundle: ${stats.serverSize} KB`);
  console.log(`   📂 Frontend files: ${stats.frontendFiles}`);
  console.log(`   💾 Total size: ${stats.totalSize}`);
  console.log('\n🚀 Ready for Render deployment!');
  console.log('   Deploy command: git push render main');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('\n📝 Next steps:');
console.log('1. Commit and push to your git repository');
console.log('2. Connect your repo to Render');
console.log('3. Configure environment variables in Render dashboard');
console.log('4. Deploy! 🚀');