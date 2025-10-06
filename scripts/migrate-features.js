#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuration de la base de données
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('🔄 Connexion à la base de données...');
    await client.connect();
    
    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_feature_toggles.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Application de la migration des feature toggles...');
    
    // Exécuter la migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration des feature toggles appliquée avec succès !');
    
    // Vérifier les données
    const result = await client.query('SELECT COUNT(*) as count FROM feature_toggles');
    console.log(`📊 Nombre de features créées: ${result.rows[0].count}`);
    
    // Afficher les features créées
    const features = await client.query(`
      SELECT feature_key, feature_name, category, is_enabled 
      FROM feature_toggles 
      ORDER BY category, feature_name
    `);
    
    console.log('\n📋 Features disponibles:');
    features.rows.forEach(feature => {
      const status = feature.is_enabled ? '✅' : '❌';
      console.log(`  ${status} ${feature.feature_key} (${feature.category}) - ${feature.feature_name}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Exécuter la migration
runMigration();