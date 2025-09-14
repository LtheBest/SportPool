# Guide de Migration - Nouveau Système d'Abonnements

## 📋 Résumé des Changements

Ce guide décrit la migration de l'ancien système d'abonnements (Découverte/Premium) vers le nouveau système avec plusieurs offres différenciées.

## 🚀 Nouvelles Offres

### 1. Offre Découverte (Gratuite)
- **Aucun changement** - reste identique
- 1 événement maximum
- 20 invitations maximum
- Support par email

### 2. Offre Événementielle (Packs)
- **Pack Événement** : 15€ pour 1 événement complet
- **Pack 10 Événements** : 150€ pour 10 événements (valable 12 mois)
- Invitations illimitées
- Support prioritaire
- Messagerie intégrée

### 3. Formules Pro (Abonnements Mensuels)
- **Clubs & Associations** : 19,99€/mois
- **PME** : 49€/mois  
- **Grandes Entreprises** : 99€/mois
- Événements et invitations illimités
- Fonctionnalités avancées selon la formule

## 🗑️ Suppression de l'Offre Premium

L'ancienne offre "Premium" a été **complètement supprimée** du système :
- Supprimée du code frontend et backend
- Supprimée des schémas de base de données  
- Remplacée par les nouvelles offres Pro

## 🔄 Migration Automatique

### Utilisateurs Premium Existants
Les utilisateurs ayant actuellement un abonnement Premium seront automatiquement :
1. **Maintenus actifs** jusqu'à la fin de leur période de facturation
2. **Basculés vers l'offre Découverte** à l'expiration
3. **Notifiés par email** de la migration et des nouvelles options

### Processus de Migration
```sql
-- Script de migration (à exécuter en production)
UPDATE organizations 
SET subscriptionType = 'decouverte',
    subscriptionStatus = 'active'
WHERE subscriptionType = 'premium' 
AND (subscriptionEndDate < NOW() OR subscriptionStatus != 'active');
```

## ⚙️ Configuration Stripe

### Nouvelles Variables d'Environnement
```bash
# Configurer les ID de prix Stripe pour chaque offre
STRIPE_EVENEMENTIELLE_SINGLE_PRICE_ID=price_...
STRIPE_EVENEMENTIELLE_PACK10_PRICE_ID=price_...
STRIPE_PRO_CLUB_PRICE_ID=price_...
STRIPE_PRO_PME_PRICE_ID=price_...
STRIPE_PRO_ENTREPRISE_PRICE_ID=price_...

# URL de webhook Stripe (si pas déjà configuré)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Configuration des Produits Stripe
Dans le dashboard Stripe, créer :

1. **Produits One-time (Packs Événementiels)**
   - Pack Événement : 15€
   - Pack 10 Événements : 150€

2. **Produits Récurrents (Formules Pro)**
   - Clubs & Associations : 19,99€/mois
   - PME : 49€/mois
   - Grandes Entreprises : 99€/mois

## 🎯 Nouvelles Fonctionnalités

### 1. Gestion des Packs Événementiels
- Compteur d'événements restants
- Date d'expiration des packs
- Basculement automatique vers Découverte à l'expiration

### 2. Rappels de Renouvellement
- Emails automatiques à 7, 3 et 1 jour(s) avant expiration
- Notifications dans le dashboard
- Configurable depuis l'admin

### 3. Système de Basculement Automatique
- Tâche cron quotidienne (9h00)
- Vérification des abonnements expirés
- Migration automatique vers Découverte
- Emails de notification

### 4. Emails Améliorés
- Templates personnalisés par type d'abonnement
- Factures intégrées
- Design moderne et responsive

## 🧪 Tests Recommandés

### Avant Déploiement
1. **Tests des Flux de Paiement**
   ```bash
   # Tester chaque type d'abonnement
   curl -X POST /api/subscriptions/create \
     -H "Content-Type: application/json" \
     -d '{"planId": "evenementielle-single"}'
   ```

2. **Tests des Tâches Automatiques**
   ```bash
   # Forcer l'exécution des tâches
   curl -X POST /api/admin/scheduler/run \
     -H "Content-Type: application/json" \  
     -d '{"task": "checkExpired"}'
   ```

3. **Tests d'Emails**
   - Vérifier les templates pour chaque offre
   - Tester les rappels de renouvellement
   - Valider les emails d'activation/annulation

### Après Déploiement
1. Vérifier que les utilisateurs existants gardent leur accès
2. Tester l'inscription avec les nouvelles offres
3. Valider les flux de paiement Stripe en mode test
4. Surveiller les logs pour les erreurs

## 📊 Monitoring

### Métriques à Surveiller
- Taux de conversion par offre
- Répartition des abonnements
- Taux de renouvellement
- Erreurs de paiement

### Alertes Recommandées
- Échecs de paiement > 5%
- Erreurs webhook Stripe
- Échec des tâches automatiques
- Emails non délivrés

## 🚨 Points d'Attention

### Compatibilité Descendante
- Toutes les références à "premium" ont été supprimées
- Les anciens endpoints continuent de fonctionner pour la transition
- Migration progressive recommandée

### Sécurité
- Validation stricte des types d'abonnement
- Vérification des permissions par offre
- Protection contre les changements d'abonnement non autorisés

### Performance
- Les tâches automatiques sont optimisées
- Cache des configurations d'abonnement
- Limitation des requêtes Stripe

## 🆘 Support & Rollback

### Plan de Rollback
Si nécessaire, restaurer l'ancien système :
1. Réinitialiser les types d'abonnement
2. Restaurer les anciens composants frontend
3. Rétablir les anciennes routes API

### Contact Support
- Pour les questions techniques : développement
- Pour les questions Stripe : admin/billing
- Pour les urgences : contacts d'escalade

---

**Version** : 2.0.0  
**Date** : $(date)  
**Auteur** : Équipe TeamMove