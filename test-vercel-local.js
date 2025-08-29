#!/usr/bin/env node
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

console.log('🚀 Démarrage du serveur de test Vercel...');

// Middleware pour les logs
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Servir les fichiers statiques depuis dist/public
const publicPath = path.join(__dirname, 'dist', 'public');
console.log(`📁 Serving static files from: ${publicPath}`);
app.use(express.static(publicPath));

// Route pour simuler l'API Vercel
app.all('/api/*', async (req, res) => {
  try {
    console.log(`🔄 API Request: ${req.method} ${req.path}`);
    
    // Simuler l'import dynamique de l'API comme Vercel
    const { default: handler } = await import('./api/server.ts');
    
    // Appeler le handler avec req/res
    await handler(req, res);
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route catch-all pour le SPA (comme Vercel)
app.get('*', (req, res) => {
  console.log(`📄 Serving SPA for: ${req.path}`);
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Démarrer le serveur
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Serveur de test Vercel démarré !`);
  console.log(`🌐 URL: http://localhost:${port}`);
  console.log(`📋 API disponible sur: http://localhost:${port}/api/*`);
  console.log(`📁 Fichiers statiques: ${publicPath}`);
  
  // Vérifier que les fichiers existent
  import('fs').then(fs => {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      console.log(`✅ index.html trouvé: ${indexPath}`);
    } else {
      console.log(`❌ index.html non trouvé: ${indexPath}`);
    }
  });
});