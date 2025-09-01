#!/usr/bin/env node

/**
 * Script de test pour valider le déploiement Render
 * Usage: node test-render-deployment.js [URL_BASE]
 */

const https = require('https');
const http = require('http');

// URL de base (peut être passée en argument ou utilise la valeur par défaut)
const BASE_URL = process.argv[2] || 'https://sportpool.onrender.com';

console.log(`🧪 Testing Render deployment at: ${BASE_URL}`);
console.log('=' .repeat(60));

/**
 * Effectue une requête HTTP et retourne une promesse
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'SportPool-Test-Script/1.0',
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Tests à exécuter
 */
const tests = [
  {
    name: '🏠 Page d\'accueil (Static)',
    url: `${BASE_URL}`,
    expectedStatus: 200,
    description: 'Vérifier que la page d\'accueil se charge correctement'
  },
  {
    name: '🔍 Health Check',
    url: `${BASE_URL}/api/health`,
    expectedStatus: 200,
    description: 'Vérifier l\'état général de l\'application'
  },
  {
    name: '💾 Database Connection Test',
    url: `${BASE_URL}/api/db-test`,
    expectedStatus: 200,
    description: 'Tester la connexion à la base de données Neon'
  },
  {
    name: '📡 Backend Communication Test',
    url: `${BASE_URL}/api/test`,
    expectedStatus: 200,
    description: 'Tester la communication avec le backend'
  },
  {
    name: '🍪 Session Test',
    url: `${BASE_URL}/api/session-test`,
    expectedStatus: 200,
    description: 'Tester la configuration des sessions'
  },
  {
    name: '👥 Debug Users (Public)',
    url: `${BASE_URL}/api/debug/users`,
    expectedStatus: 200,
    description: 'Lister les utilisateurs existants (pour debug)'
  },
  {
    name: '🔐 Authentication Test (should fail)',
    url: `${BASE_URL}/api/me`,
    expectedStatus: 401,
    description: 'Vérifier que l\'authentification est requise'
  }
];

/**
 * Exécute un test individuel
 */
async function runTest(test) {
  console.log(`\n${test.name}`);
  console.log(`📍 URL: ${test.url}`);
  console.log(`📄 Description: ${test.description}`);
  
  try {
    const startTime = Date.now();
    const result = await makeRequest(test.url);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${result.status} ${result.statusMessage}`);
    
    // Vérifier le statut attendu
    if (result.status === test.expectedStatus) {
      console.log(`✅ Status check: PASSED (expected ${test.expectedStatus})`);
    } else {
      console.log(`❌ Status check: FAILED (expected ${test.expectedStatus}, got ${result.status})`);
      return false;
    }
    
    // Tenter de parser le JSON si applicable
    if (result.headers['content-type']?.includes('application/json')) {
      try {
        const jsonData = JSON.parse(result.data);
        console.log(`📦 Response data preview:`, JSON.stringify(jsonData, null, 2).substring(0, 300) + '...');
        
        // Tests spécifiques selon l'endpoint
        if (test.url.includes('/api/health')) {
          if (jsonData.status === 'healthy') {
            console.log(`💚 Health check: HEALTHY`);
          } else {
            console.log(`🟡 Health check: ${jsonData.status}`);
          }
        }
        
        if (test.url.includes('/api/db-test')) {
          if (jsonData.status?.includes('successful')) {
            console.log(`💚 Database: CONNECTED`);
          } else {
            console.log(`🔴 Database: ${jsonData.status || 'UNKNOWN'}`);
          }
        }
        
      } catch (parseError) {
        console.log(`🟡 JSON parse warning: ${parseError.message}`);
      }
    } else {
      console.log(`📄 Content type: ${result.headers['content-type'] || 'unknown'}`);
      console.log(`📏 Content length: ${result.data.length} characters`);
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    return false;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log(`🚀 Starting SportPool Render deployment tests`);
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log(`📅 Time: ${new Date().toISOString()}`);
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    const success = await runTest(test);
    if (success) passedTests++;
    
    // Petite pause entre les tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log(`🎉 All tests PASSED! Your Render deployment looks good.`);
    process.exit(0);
  } else {
    console.log(`⚠️  Some tests FAILED. Check the logs above for details.`);
    process.exit(1);
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

// Exécuter les tests
main().catch(console.error);