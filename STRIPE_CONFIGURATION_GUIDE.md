# Guide de Configuration Stripe - TeamMove

## 📋 Vue d'ensemble

Ce guide détaille la configuration complète de Stripe pour le système d'abonnements TeamMove.

## 🔑 Variables d'Environnement Requises

### Clés API Stripe

```bash
# Mode Test (Développement)
STRIPE_SECRET_KEY=sk_test_51S3zPW8XM0zNL8ZMOwNztkR4s6cANPeVOKZBg1Qe4zVxbE1y0y7zNx4vLUGCLPNF6iTIEYRKfssMlcJiR6SnY5V500phodazFt
STRIPE_PUBLISHABLE_TEST_KEY=pk_test_51S3zPW8XM0zNL8ZMhdeyjgfrp4eKmTmzKRMqRENFwKoUjfSByTeGfWXfcf6Vr6FF9FJSBauMvjTp6cnDFDJwfPxN00VrImPBXj

# Frontend (Vite)
VITE_STRIPE_PUBLIC_KEY=pk_test_51S3zPW8XM0zNL8ZMhdeyjgfrp4eKmTmzKRMqRENFwKoUjfSByTeGfWXfcf6Vr6FF9FJSBauMvjTp6cnDFDJwfPxN00VrImPBXj

# Mode Production (À configurer avant le déploiement en production)
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Webhooks Stripe

```bash
# Secret de webhook pour valider les événements Stripe
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Important**: Vous devez créer un webhook endpoint dans votre dashboard Stripe:
- URL: `https://votre-domaine.com/api/stripe/webhook`
- Événements à écouter:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

### Price IDs des Plans d'Abonnement

Ces IDs doivent être créés dans votre dashboard Stripe avant utilisation.

```bash
# Offres Événementielles (Paiements uniques)
STRIPE_EVENEMENTIELLE_SINGLE_PRICE_ID=price_...  # Pack 1 événement - 15€
STRIPE_EVENEMENTIELLE_PACK10_PRICE_ID=price_...  # Pack 10 événements - 150€

# Formules Pro (Abonnements mensuels)
STRIPE_PRO_CLUB_PRICE_ID=price_...               # Clubs & Associations - 19,99€/mois
STRIPE_PRO_PME_PRICE_ID=price_...                # PME - 49€/mois
STRIPE_PRO_ENTREPRISE_PRICE_ID=price_...         # Grandes Entreprises - 99€/mois
```

## 🏗️ Configuration dans le Dashboard Stripe

### 1. Créer les Produits

#### Offres Événementielles

**Produit: Pack Événement**
- Nom: Pack Événement - TeamMove
- Description: 1 événement complet avec invitations illimitées
- Type: Paiement unique (One-time)
- Prix: 15,00 EUR
- Metadonnées:
  - `plan_id`: `evenementielle-single`
  - `plan_type`: `evenementielle`

**Produit: Pack 10 Événements**
- Nom: Pack 10 Événements - TeamMove
- Description: 10 événements complets valables 12 mois
- Type: Paiement unique (One-time)
- Prix: 150,00 EUR
- Metadonnées:
  - `plan_id`: `evenementielle-pack10`
  - `plan_type`: `evenementielle`

#### Formules Pro

**Produit: Clubs & Associations**
- Nom: Clubs & Associations - TeamMove
- Description: Abonnement mensuel pour clubs sportifs et associations
- Type: Récurrent (Recurring)
- Intervalle: Mensuel
- Prix: 19,99 EUR/mois
- Metadonnées:
  - `plan_id`: `pro-club`
  - `plan_type`: `pro_club`

**Produit: PME**
- Nom: PME - TeamMove
- Description: Abonnement mensuel pour petites et moyennes entreprises
- Type: Récurrent (Recurring)
- Intervalle: Mensuel
- Prix: 49,00 EUR/mois
- Metadonnées:
  - `plan_id`: `pro-pme`
  - `plan_type`: `pro_pme`

**Produit: Grandes Entreprises**
- Nom: Grandes Entreprises - TeamMove
- Description: Abonnement mensuel pour grandes entreprises
- Type: Récurrent (Recurring)
- Intervalle: Mensuel
- Prix: 99,00 EUR/mois
- Metadonnées:
  - `plan_id`: `pro-entreprise`
  - `plan_type`: `pro_entreprise`

### 2. Récupérer les Price IDs

Après création de chaque produit/prix:
1. Ouvrez la page du prix dans Stripe Dashboard
2. Copiez l'ID du prix (format: `price_xxxxxxxxxxxxx`)
3. Ajoutez-le dans votre fichier `.env`

### 3. Configuration des Webhooks

1. Accédez à **Développeurs** > **Webhooks** dans le Dashboard Stripe
2. Cliquez sur **Ajouter un endpoint**
3. URL de l'endpoint: `https://votre-domaine.com/api/stripe/webhook`
4. Sélectionnez les événements listés ci-dessus
5. Copiez le **Secret de signature** et ajoutez-le dans `.env` comme `STRIPE_WEBHOOK_SECRET`

## 🧪 Test de Configuration

### Tester les Clés API

```bash
# Depuis le projet
npm run dev

# Accéder à l'endpoint de vérification
curl https://votre-domaine.com/api/stripe/config
```

### Tester un Paiement

1. Utilisez une carte de test Stripe: `4242 4242 4242 4242`
2. Date d'expiration: N'importe quelle date future
3. CVC: N'importe quel 3 chiffres
4. Code postal: N'importe quel code postal valide

### Cartes de Test Supplémentaires

- **Succès**: `4242 4242 4242 4242`
- **Échec**: `4000 0000 0000 0002`
- **Authentification requise**: `4000 0025 0000 3155`
- **Carte expirée**: `4000 0000 0000 0069`

## 📊 Structure des Plans

### Plans Disponibles

| Plan | Type | Prix | Fréquence | Max Events | Max Invitations |
|------|------|------|-----------|------------|-----------------|
| Découverte | Gratuit | 0€ | - | 1 | 20 |
| Pack Événement | Événementielle | 15€ | Unique | 1 | Illimité |
| Pack 10 Événements | Événementielle | 150€ | Unique (12 mois) | 10 | Illimité |
| Clubs & Associations | Pro | 19,99€ | Mensuel | Illimité | Illimité |
| PME | Pro | 49€ | Mensuel | Illimité | Illimité |
| Grandes Entreprises | Pro | 99€ | Mensuel | Illimité | Illimité |

### Mapping des Types

Le système utilise les types suivants:
- `decouverte`: Offre gratuite
- `evenementielle`: Packs événementiels
- `pro_club`: Clubs & Associations
- `pro_pme`: PME
- `pro_entreprise`: Grandes Entreprises

## 🔧 Dépannage

### Erreur 401 lors de la souscription

**Problème**: `Access token required`

**Solution**: Vérifiez que:
1. L'utilisateur est bien connecté
2. Le token JWT est présent dans `localStorage` (clé: `TeamMove_access_token`)
3. L'appel API utilise `api.subscription.createPayment()` et non `fetch()` direct

### Erreur "Invalid enum value"

**Problème**: `Expected 'decouverte' | 'evenementielle' | 'pro_club' | 'pro_pme' | 'pro_entreprise', received 'evenementielle'`

**Solution**: Ce problème a été corrigé dans le schéma Zod de `RegistrationModal.tsx`

### Webhook non reçu

**Problème**: Les webhooks Stripe ne sont pas traités

**Solution**:
1. Vérifiez que `STRIPE_WEBHOOK_SECRET` est correctement configuré
2. Testez l'endpoint: `curl -X POST https://votre-domaine.com/api/stripe/webhook`
3. Vérifiez les logs de webhook dans le Dashboard Stripe

## 📝 Checklist de Déploiement

- [ ] Créer tous les produits/prix dans Stripe Dashboard
- [ ] Récupérer et configurer tous les Price IDs
- [ ] Configurer le webhook endpoint
- [ ] Tester chaque type de paiement en mode test
- [ ] Vérifier les emails de confirmation
- [ ] Tester la mise à niveau depuis Découverte
- [ ] Tester l'annulation d'abonnement
- [ ] Passer en mode production (clés live)
- [ ] Tester à nouveau avec de vraies cartes (petits montants)

## 🔐 Sécurité

### Bonnes Pratiques

1. **Ne jamais exposer les clés secrètes**:
   - Les clés `STRIPE_SECRET_KEY` doivent rester côté serveur uniquement
   - Seules les clés publiques `VITE_STRIPE_PUBLIC_KEY` peuvent être côté client

2. **Valider les webhooks**:
   - Toujours vérifier la signature des webhooks avec `STRIPE_WEBHOOK_SECRET`
   - Ne jamais faire confiance aux données non vérifiées

3. **Logs et monitoring**:
   - Activer les logs Stripe dans le Dashboard
   - Surveiller les échecs de paiement
   - Mettre en place des alertes pour les erreurs webhook

4. **Test avant production**:
   - Toujours tester complètement en mode test
   - Vérifier tous les flux de paiement
   - Tester les cas d'erreur

## 📚 Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [Dashboard Stripe](https://dashboard.stripe.com/)
- [API Stripe](https://stripe.com/docs/api)
- [Webhooks Stripe](https://stripe.com/docs/webhooks)
- [Cartes de test](https://stripe.com/docs/testing)

## 🆘 Support

Pour toute question ou problème:
- Email: support@teammove.fr
- Documentation: [README.md](./README.md)
- Guide de migration: [SUBSCRIPTION_MIGRATION_GUIDE.md](./SUBSCRIPTION_MIGRATION_GUIDE.md)

---

**Date de dernière mise à jour**: 2025-10-13
**Version**: 2.0.0
