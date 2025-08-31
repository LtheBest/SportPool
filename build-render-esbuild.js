#!/usr/bin/env node
import { build } from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building SportPool for Render (ESBuild Mode)...');

try {
  // 1. Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync('dist')) execSync('rm -rf dist');
  
  // Create dist directories
  fs.mkdirSync('dist', { recursive: true });
  fs.mkdirSync('dist/public', { recursive: true });

  // 2. Build client manually with esbuild (ultra-efficient)
  console.log('🎨 Building client with ESBuild (minimal memory)...');
  
  const clientEntry = './client/src/main.tsx';
  const publicDir = './client/public';
  
  if (!fs.existsSync(clientEntry)) {
    throw new Error('Client entry point not found: ' + clientEntry);
  }

  // Copy static assets first
  console.log('📁 Copying static assets...');
  if (fs.existsSync(publicDir)) {
    execSync(`cp -r ${publicDir}/* dist/public/`);
  }

  // Build JavaScript bundle with esbuild
  console.log('📦 Building JavaScript bundle...');
  await build({
    entryPoints: [clientEntry],
    bundle: true,
    minify: true,
    sourcemap: false,
    target: 'es2018',
    format: 'esm',
    outdir: 'dist/public',
    entryNames: 'assets/[name]-[hash]',
    chunkNames: 'assets/[name]-[hash]',
    assetNames: 'assets/[name]-[hash]',
    splitting: true,
    platform: 'browser',
    define: {
      'process.env.NODE_ENV': '"production"',
      'global': 'globalThis',
    },
    loader: {
      '.png': 'file',
      '.jpg': 'file',
      '.jpeg': 'file',
      '.gif': 'file',
      '.svg': 'file',
      '.woff': 'file',
      '.woff2': 'file',
      '.ttf': 'file',
      '.eot': 'file',
    },
    external: [],
    metafile: true,
    write: true,
    logLevel: 'info',
  });

  // 3. Generate index.html with proper script injection
  console.log('📄 Generating index.html...');
  
  // Find the generated main JS file
  const assetsDir = 'dist/public/assets';
  let mainJsFile = 'main.js'; // fallback
  
  if (fs.existsSync(assetsDir)) {
    const assetFiles = fs.readdirSync(assetsDir);
    const jsFiles = assetFiles.filter(f => f.startsWith('main-') && f.endsWith('.js'));
    if (jsFiles.length > 0) {
      mainJsFile = 'assets/' + jsFiles[0];
    }
  }
  
  const htmlTemplate = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SportPool</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: system-ui, sans-serif; }
      #root { width: 100%; height: 100vh; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${mainJsFile}"></script>
  </body>
</html>`;

  fs.writeFileSync('dist/public/index.html', htmlTemplate);

  // 4. Build server (backend)
  console.log('🛠️ Building server...');
  execSync('npm run build:server', { stdio: 'inherit' });

  // 5. Setup production files
  console.log('📋 Setting up production configuration...');
  
  // Copy package.json
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const prodPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      type: "module",
      scripts: {
        "start": "node index.js"
      },
      dependencies: {
        // Include only essential runtime dependencies
        "@neondatabase/serverless": packageJson.dependencies["@neondatabase/serverless"],
        "@sendgrid/mail": packageJson.dependencies["@sendgrid/mail"],
        "bcrypt": packageJson.dependencies["bcrypt"],
        "cors": packageJson.dependencies["cors"],
        "dotenv": packageJson.dependencies["dotenv"],
        "drizzle-orm": packageJson.dependencies["drizzle-orm"],
        "express": packageJson.dependencies["express"],
        "jsonwebtoken": packageJson.dependencies["jsonwebtoken"],
        "uuid": packageJson.dependencies["uuid"],
        "zod": packageJson.dependencies["zod"]
      }
    };
    
    fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));
  }
  
  // Copy shared directory
  if (fs.existsSync('shared')) {
    execSync('cp -r shared dist/', { stdio: 'inherit' });
  }

  // 6. Create health check
  const healthCheck = `export default function healthCheck(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    build: 'esbuild-render'
  });
}`;
  
  fs.writeFileSync('dist/health.js', healthCheck);

  // 7. Verification
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

  // 8. Build summary
  const stats = {
    serverSize: (fs.statSync('dist/index.js').size / 1024).toFixed(2),
    frontendFiles: fs.readdirSync('dist/public').length,
    totalSize: execSync('du -sh dist 2>/dev/null || echo "Unknown"', { encoding: 'utf8' }).trim().split('\t')[0] || 'Unknown'
  };

  console.log('\n🎉 ESBuild completed successfully!');
  console.log('📊 Build summary:');
  console.log(`   📦 Server bundle: ${stats.serverSize} KB`);
  console.log(`   📂 Frontend files: ${stats.frontendFiles}`);
  console.log(`   💾 Total size: ${stats.totalSize}`);
  console.log('\n🚀 Ultra-optimized for Render deployment!');

} catch (error) {
  console.error('\n💥 ESBuild failed:', error.message);
  console.error('📋 Debug information:');
  console.error(error.stack);
  
  console.error('\n💡 This build uses ESBuild for minimal memory usage');
  console.error('💡 If this fails, the environment may be too constrained');
  
  process.exit(1);
}

console.log('\n📝 Next steps:');
console.log('1. Test locally: npm start');
console.log('2. Commit and push to Render');
console.log('3. Monitor deployment in Render dashboard');