# Guide de Dépannage - SportPool

## 🤖 Chatbot

### ✅ Problème Résolu
Le chatbot fonctionne maintenant avec un système de fallback intelligent qui répond aux questions courantes même sans OpenAI.

**Réponses disponibles :**
- Création d'événements
- Organisation du covoiturage
- Inscription des utilisateurs
- Aide générale

**Test :**
```bash
curl -X POST http://localhost:8080/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Comment créer un événement ?"}'
```

## 📧 Emails Mailjet

### ⚠️ Problème Identifié
Les clés API Mailjet actuelles ne sont pas valides (erreur 401 d'authentification).

### 🔧 Solutions

#### Option 1: Corriger les Clés Mailjet
1. **Vérifiez vos clés Mailjet** sur https://app.mailjet.com/account/api_keys
2. **Mettez à jour le fichier .env** avec les bonnes clés :
```bash
MAILJET_API_KEY=your_real_api_key
MAILJET_SECRET_KEY=your_real_secret_key
```
3. **Redémarrez l'application** : `pm2 restart webapp`

#### Option 2: Utiliser les Liens d'Invitation Manuels
En attendant la correction des clés, vous pouvez récupérer les liens d'invitation :

1. **Créez un événement** avec des emails d'invitation
2. **Consultez les logs** pour voir les liens générés :
```bash
pm2 logs webapp --nostream
```
3. **Ou utilisez l'API** pour récupérer tous les liens :
```bash
# Remplacez EVENT_ID par l'ID de votre événement
curl http://localhost:8080/api/events/EVENT_ID/invitations \
  -H "Cookie: connect.sid=YOUR_SESSION"
```

### 🧪 Test Email Template
Pour tester une fois les clés corrigées :
```bash
node test-mailjet.cjs
```

## 📊 Statistiques Temps Réel

### ✅ Fonctionnalité Active
Les statistiques se mettent à jour automatiquement :
- ⏱️ Toutes les 15 secondes sur le dashboard
- 🔄 À chaque création d'événement
- 👥 À chaque confirmation de participation

**API de test :**
```bash
curl http://localhost:8080/api/dashboard/stats/realtime
```

## 🧪 Tests Automatisés

### Tests Unitaires
```bash
npm run test
```

### Tests E2E Playwright
```bash
npm run test:e2e
```

### Tests BDD Gherkin
```bash
npm run test:cucumber
```

## 🔄 Actions Correctives Appliquées

1. **Chatbot** : Système de fallback intelligent activé
2. **Emails** : Mode développement avec logs détaillés
3. **Statistics** : Auto-refresh toutes les 15 secondes
4. **Invitations** : Logs des liens pour récupération manuelle
5. **Interface** : Data-testid ajoutés pour les tests

## 🚀 Prochaines Étapes

1. **Corriger les clés Mailjet** pour activer les emails automatiques
2. **Tester la création d'événements** avec invitations
3. **Vérifier les statistiques** en temps réel
4. **Utiliser le chatbot** pour l'aide utilisateur

## 📞 Support

Si vous continuez à rencontrer des problèmes :
1. Vérifiez les logs PM2 : `pm2 logs webapp`
2. Vérifiez le statut : `pm2 status`
3. Redémarrez si nécessaire : `pm2 restart webapp`