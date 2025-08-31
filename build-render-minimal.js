#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building SportPool for Render (Minimal Memory Mode)...');

/**
 * Execute command with memory constraints and proper error handling
 */
function execWithMemoryLimit(command, options = {}) {
  const defaultOptions = {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=768',
      GENERATE_SOURCEMAP: 'false',
    },
    timeout: 600000, // 10 minutes
    ...options
  };
  
  return execSync(command, defaultOptions);
}

try {
  // 1. Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync('dist')) execSync('rm -rf dist');

  // 2. Pre-build checks
  console.log('🔍 Pre-build verification...');
  
  // Check if we have enough memory
  const memInfo = execSync('cat /proc/meminfo | grep MemAvailable', { encoding: 'utf8' });
  const availableMemKB = parseInt(memInfo.split(/\s+/)[1]);
  const availableMemMB = Math.floor(availableMemKB / 1024);
  
  console.log(`💾 Available memory: ${availableMemMB} MB`);
  
  if (availableMemMB < 512) {
    console.log('⚠️  Low memory detected. Using ultra-minimal build mode...');
    process.env.NODE_OPTIONS = '--max-old-space-size=384';
  }

  // 3. Build client step by step
  console.log('🎨 Building client with maximum optimization...');
  
  // Set all optimization flags
  process.env.RENDER = 'true';
  process.env.NODE_ENV = 'production';
  process.env.GENERATE_SOURCEMAP = 'false';
  process.env.DISABLE_ESLINT_PLUGIN = 'true';
  
  // Try multiple build strategies
  let buildSuccess = false;
  const buildStrategies = [
    // Strategy 1: Normal Vite build with memory limit
    () => {
      console.log('📦 Trying normal Vite build...');
      execWithMemoryLimit('npm run build:client');
    },
    
    // Strategy 2: Direct vite command with memory optimization
    () => {
      console.log('🔄 Trying direct Vite with memory optimization...');
      execWithMemoryLimit('node --max-old-space-size=512 ./node_modules/.bin/vite build', {
        cwd: './client'
      });
    },
    
    // Strategy 3: Build in smaller chunks (if we implement this)
    () => {
      console.log('⚡ Trying incremental build...');
      // First, just bundle without minification
      execWithMemoryLimit('node --max-old-space-size=512 ./node_modules/.bin/vite build --minify false', {
        cwd: './client'
      });
      
      // Then minify separately if possible
      if (fs.existsSync('dist/public')) {
        console.log('🗜️  Post-processing minification...');
        // Could implement terser separately here if needed
      }
    }
  ];
  
  for (let i = 0; i < buildStrategies.length && !buildSuccess; i++) {
    try {
      console.log(`\n🎯 Build attempt ${i + 1}/${buildStrategies.length}`);
      buildStrategies[i]();
      buildSuccess = true;
      console.log('✅ Client build succeeded!');
    } catch (error) {
      console.log(`❌ Build attempt ${i + 1} failed: ${error.message}`);
      if (i === buildStrategies.length - 1) {
        throw new Error('All build strategies failed');
      }
      console.log('🔄 Trying next build strategy...');
    }
  }

  // 4. Build server (backend) - this should be lighter
  console.log('🛠️ Building server...');
  execWithMemoryLimit('npm run build:server');

  // 5. Verify and organize build output
  console.log('📁 Verifying build output...');
  
  const requiredFiles = [
    'dist/index.js',
    'dist/public/index.html'
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`❌ Required file missing: ${file}`);
    }
  }

  // 6. Copy necessary files
  console.log('📋 Copying configuration files...');
  
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Create production package.json
    const prodPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      type: "module",
      scripts: {
        "start": "node index.js"
      },
      dependencies: {
        // Only include runtime dependencies
        ...(packageJson.dependencies || {})
      }
    };
    
    fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));
  }
  
  if (fs.existsSync('shared')) {
    execSync('cp -r shared dist/', { stdio: 'inherit' });
  }

  // 7. Create health check
  console.log('🏥 Setting up health check...');
  const healthCheck = `export default function healthCheck(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    build: 'render-minimal'
  });
}`;
  
  fs.writeFileSync('dist/health.js', healthCheck);

  // 8. Build summary
  const stats = {
    serverSize: (fs.statSync('dist/index.js').size / 1024).toFixed(2),
    frontendFiles: fs.readdirSync('dist/public').length,
    totalSize: execSync('du -sh dist 2>/dev/null || echo "Unknown"', { encoding: 'utf8' }).split('\t')[0]
  };

  console.log('\n🎉 Minimal build completed successfully!');
  console.log('📊 Build summary:');
  console.log(`   📦 Server bundle: ${stats.serverSize} KB`);
  console.log(`   📂 Frontend files: ${stats.frontendFiles}`);
  console.log(`   💾 Total size: ${stats.totalSize}`);
  console.log('\n🚀 Optimized for Render deployment!');

} catch (error) {
  console.error('\n💥 Build failed:', error.message);
  console.error('📋 Debug information:');
  
  // Try to provide helpful debug info
  if (fs.existsSync('dist')) {
    console.error('📁 Partial build contents:');
    try {
      execSync('find dist -type f | head -10', { stdio: 'inherit' });
    } catch (e) {
      console.error('Could not list dist contents');
    }
  }
  
  console.error('\n💡 Troubleshooting tips:');
  console.error('1. Check available memory: free -m');
  console.error('2. Try building locally first');
  console.error('3. Review the Render build logs');
  console.error('4. Consider using a higher memory plan on Render');
  
  process.exit(1);
}

console.log('\n📝 Next steps:');
console.log('1. Commit all changes to git');
console.log('2. Push to your connected Render repository');
console.log('3. Monitor the Render deployment logs');
console.log('4. Configure environment variables in Render dashboard');