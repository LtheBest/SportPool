# 🔐 Guide de Configuration Stripe pour TeamMove

Ce guide vous explique comment configurer votre système de paiement Stripe pour permettre les abonnements payants sur TeamMove.

## 📋 Table des Matières
1. [Prérequis](#prérequis)
2. [Configuration des Clés API Stripe](#configuration-des-clés-api-stripe)
3. [Configuration des Webhooks](#configuration-des-webhooks)
4. [Plans d'Abonnement Disponibles](#plans-dabonnement-disponibles)
5. [Variables d'Environnement](#variables-denvironnement)
6. [Tests](#tests)
7. [Dépannage](#dépannage)

## 🎯 Prérequis

1. **Compte Stripe**: Créez un compte sur [stripe.com](https://stripe.com) si vous n'en avez pas encore
2. **Accès Dashboard Stripe**: Accédez à votre [Dashboard Stripe](https://dashboard.stripe.com/)
3. **Mode Test**: Pour commencer, utilisez les clés de test Stripe

## 🔑 Configuration des Clés API Stripe

### 1. Récupérer vos Clés API

#### En Mode Test (Développement)
1. Connectez-vous à [Dashboard Stripe](https://dashboard.stripe.com/)
2. Assurez-vous que le mode **Test** est activé (switch en haut à droite)
3. Allez dans **Developers** > **API keys**
4. Vous verrez deux clés:
   - **Publishable key** (commence par `pk_test_...`) - Pour le frontend
   - **Secret key** (commence par `sk_test_...`) - Pour le backend

#### En Mode Production (Live)
1. Dans le Dashboard Stripe, activez le mode **Live**
2. Allez dans **Developers** > **API keys**
3. Vous aurez:
   - **Publishable key** (commence par `pk_live_...`)
   - **Secret key** (commence par `sk_live_...`)

### 2. Configurer les Variables d'Environnement

Dans votre fichier `.env` (à la racine du projet), ajoutez:

```bash
# Mode Test (Développement)
STRIPE_SECRET_KEY=sk_test_51S3zPW8XM0zNL8ZMOwNztkR4s6cANPeVOKZBg1Qe4zVxbE1y0y7zNx4vLUGCLPNF6iTIEYRKfssMlcJiR6SnY5V500phodazFt
STRIPE_PUBLISHABLE_TEST_KEY=pk_test_51S3zPW8XM0zNL8ZMhdeyjgfrp4eKmTmzKRMqRENFwKoUjfSByTeGfWXfcf6Vr6FF9FJSBauMvjTp6cnDFDJwfPxN00VrImPBXj
VITE_STRIPE_PUBLIC_KEY=pk_test_51S3zPW8XM0zNL8ZMhdeyjgfrp4eKmTmzKRMqRENFwKoUjfSByTeGfWXfcf6Vr6FF9FJSBauMvjTp6cnDFDJwfPxN00VrImPBXj

# Mode Production (à configurer en live)
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PUBLISHABLE_KEY=pk_live_...
# VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

> ⚠️ **IMPORTANT**: Ne commitez JAMAIS vos clés API en production dans Git. Utilisez des variables d'environnement sécurisées.

## 🔔 Configuration des Webhooks

Les webhooks Stripe permettent de recevoir des notifications en temps réel sur les événements de paiement.

### 1. Créer un Endpoint Webhook

1. Dans le Dashboard Stripe, allez dans **Developers** > **Webhooks**
2. Cliquez sur **Add endpoint**
3. URL de votre webhook: `https://teammove.fr/api/stripe/webhook`
4. Sélectionnez les événements à écouter:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`

### 2. Récupérer le Secret du Webhook

1. Après avoir créé le webhook, cliquez dessus
2. Dans la section **Signing secret**, cliquez sur **Reveal**
3. Copiez le secret (commence par `whsec_...`)

### 3. Ajouter le Secret aux Variables d'Environnement

```bash
STRIPE_WEBHOOK_SECRET=whsec_sFRQZen11NP6puqTpTk4ukJCF2M5TpYp
```

### 4. Tester votre Webhook

Vérifiez que votre webhook fonctionne:
```bash
curl https://teammove.fr/api/stripe/webhook/config
```

Vous devriez recevoir une réponse JSON avec la configuration.

## 📦 Plans d'Abonnement Disponibles

TeamMove propose 5 plans d'abonnement différents:

### 1. **Découverte** (Gratuit)
- **ID**: `decouverte`
- **Prix**: 0€
- **Type**: Gratuit
- **Limites**: 
  - 1 événement maximum
  - 20 invitations maximum
- **Features**: Gestion de base du covoiturage

### 2. **Événementielle** (Pack)
- **ID**: `evenementielle`
- **Prix**: 
  - Pack Single: 15€ (1 événement)
  - Pack 10: 150€ (10 événements)
- **Type**: Paiement unique
- **Validité**: 12 mois
- **Limites**: 
  - 1 ou 10 événements (selon le pack)
  - Invitations illimitées
- **Features**: Support prioritaire, messagerie intégrée

### 3. **Pro Clubs & Associations**
- **ID**: `pro_club`
- **Prix**: 19,99€/mois
- **Type**: Abonnement mensuel
- **Limites**: Illimité
- **Features**: Branding personnalisé, API d'intégration, statistiques avancées

### 4. **Pro PME**
- **ID**: `pro_pme`
- **Prix**: 49€/mois
- **Type**: Abonnement mensuel
- **Limites**: Illimité
- **Features**: Multi-utilisateurs (5 admins), support téléphonique, formation personnalisée

### 5. **Pro Entreprise**
- **ID**: `pro_entreprise`
- **Prix**: 99€/mois
- **Type**: Abonnement mensuel
- **Limites**: Illimité
- **Features**: Multi-utilisateurs illimités, support 24/7, Account Manager dédié

## ⚙️ Variables d'Environnement

Voici toutes les variables d'environnement nécessaires pour Stripe:

```bash
# ============================================
# STRIPE CONFIGURATION
# ============================================

# Clés API principales
STRIPE_SECRET_KEY=sk_test_...           # Clé secrète backend (TEST ou LIVE)
STRIPE_PUBLISHABLE_TEST_KEY=pk_test_... # Clé publique test
STRIPE_PUBLISHABLE_KEY=pk_live_...      # Clé publique production (optionnel)
VITE_STRIPE_PUBLIC_KEY=pk_test_...      # Clé publique pour Vite (frontend)

# Webhook
STRIPE_WEBHOOK_SECRET=whsec_...         # Secret pour valider les webhooks

# URL de l'application (pour redirections)
APP_URL=https://teammove.fr             # URL principale de l'application
```

## 🧪 Tests

### 1. Test des Cartes Bancaires

En mode test, utilisez ces numéros de carte:

| Carte                  | Numéro           | CVC | Date d'expiration |
|------------------------|------------------|-----|-------------------|
| ✅ Visa (succès)       | 4242424242424242 | Any | Futur             |
| ❌ Visa (déclinée)     | 4000000000000002 | Any | Futur             |
| ⏱️ Visa (authentification) | 4000002500003155 | Any | Futur             |

**Autres informations de test:**
- **Email**: Utilisez n'importe quel email valide
- **Nom**: N'importe quel nom
- **Adresse**: N'importe quelle adresse

### 2. Test du Flux d'Inscription

1. Allez sur `https://teammove.fr`
2. Cliquez sur **Créer un compte**
3. Sélectionnez un type d'organisation
4. Choisissez un plan payant (ex: Événementielle)
5. Remplissez le formulaire d'inscription
6. Vous serez redirigé vers Stripe Checkout
7. Utilisez une carte de test (ex: 4242...)
8. Validez le paiement
9. Vous devriez être redirigé vers le dashboard avec l'abonnement activé

### 3. Test de la Mise à Niveau

1. Connectez-vous avec un compte **Découverte**
2. Allez dans **Dashboard** > **Abonnement**
3. Cliquez sur **Choisir une offre**
4. Sélectionnez un plan payant
5. Complétez le paiement avec une carte test
6. Vérifiez que l'abonnement est bien mis à jour

### 4. Test des Webhooks (Local)

Pour tester les webhooks en local, installez Stripe CLI:

```bash
# Installation
brew install stripe/stripe-cli/stripe  # macOS
# ou téléchargez depuis https://stripe.com/docs/stripe-cli

# Authentification
stripe login

# Forwarding des webhooks vers votre serveur local
stripe listen --forward-to localhost:8080/api/stripe/webhook

# Dans un autre terminal, déclenchez un événement test
stripe trigger payment_intent.succeeded
```

## 🔧 Dépannage

### Problème: Erreur 401 lors de la mise à niveau

**Cause**: Token d'authentification manquant ou invalide

**Solution**:
1. Vérifiez que vous êtes bien connecté
2. Vérifiez le localStorage pour le token JWT:
   ```javascript
   localStorage.getItem('TeamMove_access_token')
   ```
3. Si le token est absent, reconnectez-vous

### Problème: Webhook non reçu

**Cause**: URL webhook incorrecte ou secret invalide

**Solution**:
1. Vérifiez l'URL du webhook dans Stripe Dashboard
2. Vérifiez que `STRIPE_WEBHOOK_SECRET` est correctement configuré
3. Testez l'endpoint:
   ```bash
   curl https://teammove.fr/api/stripe/webhook/config
   ```

### Problème: Erreur "Invalid plan ID"

**Cause**: Nom de plan incorrect

**Solution**:
Utilisez les IDs de plan corrects:
- `decouverte` (pas `discovery`)
- `evenementielle` (pas `starter` ou `evenementielle-single`)
- `pro_club` (pas `club` ou `pro`)
- `pro_pme` (pas `pme`)
- `pro_entreprise` (pas `enterprise` ou `entreprise`)

### Problème: Paiement réussi mais abonnement non activé

**Cause**: Webhook non traité ou erreur dans le traitement

**Solution**:
1. Vérifiez les logs serveur
2. Vérifiez les logs Stripe Dashboard > Webhooks > [votre webhook] > Attempts
3. Vérifiez la base de données pour l'organisation concernée

### Vérification de la Configuration

Endpoint de vérification de configuration:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://teammove.fr/api/stripe/verify
```

## 📚 Documentation Supplémentaire

- [Documentation Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

## 🆘 Support

Si vous rencontrez des problèmes:
1. Consultez les logs serveur
2. Vérifiez le Dashboard Stripe pour les erreurs
3. Contactez le support technique TeamMove

---

**Version**: 1.0  
**Dernière mise à jour**: 2025-10-13  
**Auteur**: TeamMove Tech Team
