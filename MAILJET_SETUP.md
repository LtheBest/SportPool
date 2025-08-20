# Configuration Mailjet - Guide d'installation

## 🚀 Système d'emails intégré avec Mailjet

Ce guide vous explique comment configurer et utiliser le système d'emails intégré avec Mailjet pour votre application de gestion d'événements sportifs.

## 📋 Fonctionnalités implémentées

### ✅ 1. Reset de mot de passe
- **Lien "Mot de passe oublié"** sur la page de connexion
- **Envoi d'email automatique** avec lien de réinitialisation sécurisé
- **Token avec expiration** (1 heure)
- **Page de reset** avec validation du token
- **Interface utilisateur complète** avec gestion d'erreurs

### ✅ 2. Invitations aux événements
- **Envoi automatique d'invitations** lors de la création d'événements
- **Emails personnalisés** avec détails de l'événement
- **Lien direct vers la page d'inscription**
- **Template responsive** et professionnel

### ✅ 3. Notifications de messages
- **Notification automatique** quand l'organisateur envoie un message
- **Envoi à tous les participants** de l'événement
- **Possibilité de répondre directement** via un lien dans l'email
- **Interface web** pour répondre sans accéder au dashboard

## 🔧 Configuration

### 1. Compte Mailjet
1. Créez un compte sur [Mailjet](https://www.mailjet.com/)
2. Obtenez vos clés API (API Key + Secret Key)
3. Vérifiez votre domaine d'envoi

### 2. Variables d'environnement
Mettez à jour votre fichier `.env` :

```env
# Mailjet Configuration
MAILJET_API_KEY=your_mailjet_api_key_here
MAILJET_SECRET_KEY=your_mailjet_secret_key_here
MAILJET_FROM_EMAIL=noreply@votredomaine.com
MAILJET_FROM_NAME=VotreApp

# App Configuration  
APP_URL=https://votredomaine.com
SESSION_SECRET=your-super-secret-session-key-here
```

### 3. Configuration DNS (Recommandé)
Pour une meilleure délivrabilité :
- Configurez les enregistrements SPF, DKIM, et DMARC
- Utilisez un domaine vérifié dans Mailjet
- Configurez une adresse de retour (bounce handling)

## 📧 Templates d'emails

### Reset de mot de passe
- **Sujet** : "Réinitialisation de votre mot de passe"
- **Contenu** : Lien sécurisé avec expiration 1h
- **Design** : Template responsive avec bouton CTA

### Invitation événement
- **Sujet** : "Invitation à l'événement: [Nom de l'événement]"
- **Contenu** : Détails de l'événement + lien d'inscription
- **Design** : Template avec informations structurées

### Notification message
- **Sujet** : "[Événement] - Nouveau message de [Organisateur]"
- **Contenu** : Aperçu du message + lien de réponse
- **Design** : Template conversationnel

## 🛠 API Endpoints

### Reset Password
```http
POST /api/forgot-password
Body: { "email": "user@example.com" }

POST /api/reset-password  
Body: { "token": "uuid-token", "newPassword": "newpass123" }

GET /api/validate-reset-token/:token
Response: { "valid": true/false, "message": "..." }
```

### Message Reply
```http
GET /api/events/:eventId/reply?messageId=xxx&email=xxx
Response: HTML page for replying

POST /api/events/:eventId/messages/participant
Body: { "senderName": "...", "senderEmail": "...", "content": "..." }
```

## 🎨 Interface utilisateur

### Pages créées
- `/reset-password` - Page de réinitialisation avec validation
- `ForgotPasswordModal` - Modal intégré au login
- Interface de réponse aux messages par email

### Flux utilisateur
1. **Reset password** : Login → "Mot de passe oublié" → Email → Reset page
2. **Invitations** : Créer événement → Emails automatiques → Page inscription
3. **Messages** : Envoyer message → Notifications → Réponse directe

## 🚦 Tests et validation

### Tests recommandés
1. **Test du reset password** complet
2. **Vérification des invitations** avec vraies adresses
3. **Test des notifications** de messages  
4. **Validation de la délivrabilité** des emails

### Monitoring
- Surveillez les logs Mailjet pour les erreurs d'envoi
- Vérifiez les taux de délivrabilité
- Monitorer les bounces et complaints

## 🔐 Sécurité

### Mesures implémentées
- **Tokens sécurisés** UUID v4 pour reset password
- **Expiration automatique** des tokens (1h)
- **Validation côté serveur** de tous les paramètres
- **Vérification des participants** pour les réponses aux messages
- **Nettoyage automatique** des tokens expirés

### Bonnes pratiques
- Utilisez HTTPS en production
- Configurez des limites de débit (rate limiting)
- Surveillez les tentatives d'abus
- Implémentez un système de bannissement IP si nécessaire

## 📊 Métriques et analytics

### Données trackées
- Emails envoyés vs. livrés
- Taux d'ouverture des invitations
- Taux de réponse aux messages
- Utilisation du reset password

### Intégrations possibles
- Google Analytics pour le tracking des pages
- Mailjet Analytics pour les métriques d'email
- Dashboard personnalisé pour les administrateurs

## 🆘 Dépannage

### Problèmes courants
1. **Emails non reçus** : Vérifiez les spams, configuration DNS
2. **Token invalide** : Vérifiez l'expiration et la base de données
3. **Erreurs Mailjet** : Vérifiez les clés API et les quotas
4. **Pages non stylées** : Vérifiez les imports CSS et composants UI

### Logs utiles
```bash
# Voir les logs du serveur
npx pm2 logs webapp --nostream

# Surveiller en temps réel
npx pm2 logs webapp
```

## 🎯 Prochaines améliorations

### Fonctionnalités suggérées
- **Templates personnalisables** par organisation
- **Emails récapitulatifs** périodiques  
- **Notifications push** en complément
- **Système d'abonnement** granulaire
- **A/B testing** des templates
- **Intégration calendrier** (iCal)

---

## 📞 Support

Pour toute question sur la configuration Mailjet :
1. Consultez la [documentation Mailjet](https://dev.mailjet.com/)
2. Vérifiez les logs du serveur
3. Testez avec des adresses email de test
4. Contactez le support Mailjet si nécessaire

**URL de l'application** : https://8080-in1z8waprsm93elexvt7k-6532622b.e2b.dev

**Status du serveur** : ✅ En ligne (port 8080)