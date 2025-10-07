#!/usr/bin/env node

/**
 * Script pour créer les prix Stripe nécessaires à l'application
 * 
 * Usage: npm run stripe:setup-prices
 * 
 * Ce script doit être exécuté une seule fois pour configurer les prix dans Stripe.
 * Les IDs retournés doivent être copiés dans le fichier stripe-service.ts
 */

import { StripeService } from '../server/stripe-service';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function main() {
  console.log('🚀 Configuration des prix Stripe...\n');
  
  // Vérifier que les clés Stripe sont configurées
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ ERREUR: STRIPE_SECRET_KEY non configurée');
    console.error('   Ajoutez votre clé secrète Stripe dans le fichier .env');
    process.exit(1);
  }

  try {
    // Créer les prix
    await StripeService.createPrices();
    
    console.log('\n✅ Prix Stripe créés avec succès !');
    console.log('\n📋 ACTIONS SUIVANTES:');
    console.log('1. Copiez les IDs des prix affichés ci-dessus');
    console.log('2. Mettez à jour les priceId dans server/stripe-service.ts');
    console.log('3. Redémarrez votre serveur de développement');
    
    console.log('\n🔧 EXEMPLE DE MISE À JOUR:');
    console.log(`
// Dans server/stripe-service.ts
STARTER: {
  priceId: 'price_1ABC123...', // Remplacer par l'ID réel
  // ...
},
    `);
    
  } catch (error: any) {
    console.error('❌ ERREUR lors de la création des prix:', error.message);
    
    if (error.message.includes('API key')) {
      console.error('\n💡 SOLUTION: Vérifiez votre clé API Stripe');
      console.error('   - Assurez-vous que STRIPE_SECRET_KEY est correcte');
      console.error('   - Vérifiez que la clé commence par sk_test_ ou sk_live_');
    }
    
    process.exit(1);
  }
}

// Gérer les erreurs non catchées
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

// Exécuter le script
main();