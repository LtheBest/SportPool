#!/usr/bin/env node

/**
 * Script pour créer un utilisateur administrateur
 * Usage: node scripts/create-admin.js
 */

const { storage } = require('../server/storage');
const { hashPassword } = require('../server/auth');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
  console.log('🔧 Création d\'un utilisateur administrateur TeamMove\n');

  try {
    // Collect admin information
    const adminData = {
      name: await question('Nom de l\'organisation admin: ') || 'TeamMove Admin',
      email: await question('Email administrateur: ') || 'admin@TeamMove.com',
      contactFirstName: await question('Prénom: ') || 'Admin',
      contactLastName: await question('Nom: ') || 'TeamMove',
      phone: await question('Téléphone (optionnel): ') || '',
      address: await question('Adresse (optionnel): ') || '',
    };

    let password = await question('Mot de passe (laissez vide pour générer automatiquement): ');
    
    if (!password) {
      // Generate a secure random password
      password = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      console.log(`\n🔑 Mot de passe généré automatiquement: ${password}`);
      console.log('⚠️  IMPORTANT: Notez ce mot de passe dans un endroit sécurisé!\n');
    }

    // Check if admin already exists
    const existingAdmin = await storage.getOrganizationByEmail(adminData.email);
    if (existingAdmin) {
      console.log('❌ Un utilisateur avec cet email existe déjà.');
      
      const updateChoice = await question('Voulez-vous le mettre à jour en tant qu\'admin? (y/n): ');
      if (updateChoice.toLowerCase() === 'y' || updateChoice.toLowerCase() === 'yes') {
        // Update existing user to admin
        await storage.updateOrganization(existingAdmin.id, {
          role: 'admin',
          isActive: true,
          planType: 'enterprise'
        });
        
        console.log('✅ Utilisateur existant mis à jour avec les droits d\'administrateur.');
        console.log(`📧 Email: ${existingAdmin.email}`);
        console.log('🔗 Accès: https://teammove.fr/admin');
      }
    } else {
      // Create new admin user
      const hashedPassword = await hashPassword(password);
      
      const newAdmin = await storage.createOrganization({
        ...adminData,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        planType: 'enterprise',
        features: ['unlimited_events', 'priority_support', 'admin_dashboard', 'analytics'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ Utilisateur administrateur créé avec succès!');
      console.log('\n📋 Informations de connexion:');
      console.log(`📧 Email: ${adminData.email}`);
      console.log(`🔑 Mot de passe: ${password}`);
      console.log('🔗 URL de connexion: https://teammove.fr/admin');
      console.log('\n⚠️  IMPORTANT:');
      console.log('- Conservez ces informations dans un endroit sécurisé');
      console.log('- Changez le mot de passe après la première connexion');
      console.log('- L\'administrateur peut gérer toutes les organisations');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'administrateur:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function main() {
  try {
    console.log('🚀 Initialisation de la base de données...');
    
    // Initialize storage connection
    await storage.initializeDatabase?.();
    console.log('✅ Base de données initialisée\n');
    
    await createAdminUser();
    
    console.log('\n🎉 Configuration administrateur terminée!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du script...');
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { createAdminUser };