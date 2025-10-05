# 🏗️ Guide de Configuration Stripe pour TeamMove

Ce guide vous aide à configurer Stripe pour tester les paiements dans TeamMove.

## 📋 Prérequis

1. **Compte Stripe** : Créez un compte sur [stripe.com](https://stripe.com)
2. **Clés API Test** : Récupérez vos clés de test depuis le dashboard Stripe

## 🔧 Configuration des Variables d'Environnement

### 1. Clés Stripe de Base

Ajoutez ces variables dans votre fichier `.env` :

```bash
# Stripe Test Keys (remplacez par vos vraies clés)
STRIPE_SECRET_KEY=sk_test_51S3zPW8XM0zNL8ZMOwNztkR4s6cANPeVOKZBg1Qe4zVxbE1y0y7zNx4vLUGCLPNF6iTIEYRKfssMlcJiR6SnY5V500phodazFt
VITE_STRIPE_PUBLIC_KEY=pk_test_51S3zPW8XM0zNL8ZMhdeyjgfrp4eKmTmzKRMqRENFwKoUjfSByTeGfWXfcf6Vr6FF9FJSBauMvjTp6cnDFDJwfPxN00VrImPBXj

# Webhook Secret (optionnel pour les tests locaux)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. URL de Base de l'Application

```bash
# URL de votre application (importante pour les redirections)
APP_URL=https://teammove.onrender.com
```

## 🏷️ Création des Prix Stripe

Vous devez créer les produits et prix dans votre dashboard Stripe pour chaque plan :

### 1. Via le Dashboard Stripe

1. Connectez-vous à [dashboard.stripe.com](https://dashboard.stripe.com)
2. Allez dans **Produits** → **Créer un produit**
3. Créez un produit pour chaque plan :

#### Plan Événementielle (19.99€/mois)
- **Nom** : TeamMove - Plan Événementielle  
- **Prix** : 19.99 EUR / mois récurrent
- **ID du prix** : Copiez l'ID généré (commence par `price_`)

#### Plan Clubs & Associations (49.99€/mois)
- **Nom** : TeamMove - Plan Clubs & Associations
- **Prix** : 49.99 EUR / mois récurrent  
- **ID du prix** : Copiez l'ID généré

#### Plan PME (99.99€/mois)
- **Nom** : TeamMove - Plan PME
- **Prix** : 99.99 EUR / mois récurrent
- **ID du prix** : Copiez l'ID généré

#### Plan Grandes Entreprises (199.99€/mois)
- **Nom** : TeamMove - Plan Grandes Entreprises  
- **Prix** : 199.99 EUR / mois récurrent
- **ID du prix** : Copiez l'ID généré

### 2. Mise à Jour de la Configuration

Ajoutez les ID des prix dans vos variables d'environnement :

```bash
# Price IDs pour chaque plan (remplacez par vos vrais IDs)
STRIPE_EVENEMENTIELLE_PRICE_ID=price_1234567890abcdef
STRIPE_PRO_CLUB_PRICE_ID=price_abcdef1234567890  
STRIPE_PRO_PME_PRICE_ID=price_fedcba0987654321
STRIPE_PRO_ENTREPRISE_PRICE_ID=price_13579bdf2468ace
```

### 3. Via l'API Stripe (Optionnel)

Vous pouvez aussi créer les prix via l'API :

```bash
# Installer Stripe CLI
curl -s https://packages.stripe.com/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.com/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe

# Se connecter à votre compte
stripe login

# Créer les produits et prix
stripe products create --name "TeamMove - Plan Événementielle" --description "Plan idéal pour les organisateurs réguliers"
stripe prices create --product prod_XXXXXXXXXX --unit-amount 1999 --currency eur --recurring interval=month
```

## 🧪 Configuration des Webhooks (Pour les Tests Avancés)

### 1. Webhook Local avec Stripe CLI

```bash
# Écouter les webhooks en local
stripe listen --forward-to localhost:8080/api/stripe/webhook-new

# Récupérer le webhook secret affiché et l'ajouter à .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 2. Webhook en Production

1. Dans le dashboard Stripe, allez dans **Développeurs** → **Webhooks**
2. Créez un endpoint : `https://teammove.onrender.com/api/stripe/webhook-new`
3. Sélectionnez ces événements :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`  
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

## 🎯 Cartes de Test

Utilisez ces numéros de carte pour tester :

### ✅ Paiement Réussi
- **Numéro** : `4242 4242 4242 4242`
- **Expiration** : `12/34`  
- **CVC** : `123`

### ❌ Carte Déclinée
- **Numéro** : `4000 0000 0000 0002`
- **Expiration** : `12/34`
- **CVC** : `123`

### 💳 Fonds Insuffisants  
- **Numéro** : `4000 0000 0000 9995`
- **Expiration** : `12/34`
- **CVC** : `123`

### 🔐 Authentification 3D Secure
- **Numéro** : `4000 0025 0000 3155`
- **Expiration** : `12/34` 
- **CVC** : `123`

## 🚀 Test de l'Intégration

### 1. Test des API

```bash
# Tester la création d'une session de checkout
curl -X POST http://localhost:8080/api/subscription/create-checkout-session \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId": "evenementielle"}'

# Tester la récupération des plans
curl -X GET http://localhost:8080/api/subscription/plans
```

### 2. Test via l'Interface

1. Allez sur `/subscription/plans` dans votre app
2. Utilisez le composant de test Stripe dans l'interface admin
3. Sélectionnez un plan payant
4. Utilisez une carte de test pour simuler le paiement

## 🔄 Workflow de Test Complet

### Cas 1 : Inscription avec Plan Payant

1. **Inscription** → Choisir plan "Événementielle" 
2. **Remplir le formulaire** → Cliquer "Créer mon compte"
3. **Redirection Stripe** → Utiliser carte `4242 4242 4242 4242`
4. **Paiement réussi** → Redirection vers le dashboard
5. **Vérifier** → Abonnement actif dans le profil

### Cas 2 : Upgrade depuis Découverte

1. **Compte Découverte** → Aller dans Abonnements  
2. **Choisir plan** → Sélectionner "Clubs & Associations"
3. **Paiement** → Utiliser carte de test
4. **Vérifier** → Plan mis à jour

### Cas 3 : Erreurs de Paiement

1. **Tenter un paiement** → Utiliser carte `4000 0000 0000 0002`
2. **Vérifier gestion d'erreur** → Message d'erreur affiché
3. **Retry** → Permettre de réessayer avec une autre carte

## 🐛 Dépannage

### Problème : "Plan non trouvé"
- Vérifiez que les Price IDs sont correctement configurés
- Assurez-vous que les plans existent dans Stripe

### Problème : "Stripe non configuré"  
- Vérifiez la clé `STRIPE_SECRET_KEY` dans `.env`
- Redémarrez le serveur après modification

### Problème : Webhook non reçu
- Vérifiez l'URL du webhook dans Stripe
- Testez avec `stripe listen` en local
- Vérifiez les logs du serveur

### Problème : Redirection échoue
- Vérifiez la variable `APP_URL`
- Assurez-vous que les URLs de succès/annulation sont correctes

## 📚 Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)  
- [Cartes de Test](https://stripe.com/docs/testing#cards)
- [Webhooks](https://stripe.com/docs/webhooks)

---

✨ **Prêt à tester !** Une fois cette configuration terminée, vous pouvez tester tous les scénarios de paiement dans TeamMove.