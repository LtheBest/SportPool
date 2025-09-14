# 🚀 Guide de Déploiement TeamMove sur Render

## 🎯 Vue d'ensemble

Ce guide vous accompagne pour déployer TeamMove sur Render.com, une plateforme moderne et gratuite pour héberger des applications web fullstack.

## ✅ Prérequis

- Compte GitHub avec accès au repository TeamMove
- Compte Render.com (gratuit)
- Base de données PostgreSQL configurée (Neon ou Render PostgreSQL)
- Clés API configurées (SendGrid, OpenAI)

## 📋 Étapes de Déploiement

### 1. 🔧 Préparation du Code

```bash
# Vérifier que vous êtes sur la bonne branche
git checkout feature/complete-fixes-and-render-deployment

# Tester le build en local
npm run build:render

# Vérifier que les fichiers sont générés
ls -la dist/
```

### 2. 🌐 Configuration Render

#### A. Création du Service Web

1. **Connecter le Repository**
   - Aller sur [Render Dashboard](https://dashboard.render.com)
   - Cliquer "New +" → "Web Service"
   - Connecter votre repository GitHub TeamMove
   - Sélectionner la branche `feature/complete-fixes-and-render-deployment`

2. **Configuration du Service**
   ```
   Name: TeamMove-app
   Region: Frankfurt (plus proche de l'Europe)
   Branch: feature/complete-fixes-and-render-deployment
   Root Directory: (laisser vide)
   Environment: Node
   Build Command: npm run build:render
   Start Command: npm start
   ```

3. **Plan et Options**
   - Plan: Starter (gratuit)
   - Auto-Deploy: Activé

#### B. Configuration des Variables d'Environnement

Dans Render Dashboard → votre service → Environment:

```bash
# Base de données (sera automatiquement configuré si vous utilisez Render PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database

# Configuration SendGrid
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=alt.f7-3ywk4mu@yopmail.com
SENDGRID_FROM_NAME=TeamMove

# Configuration OpenAI (optionnel)
OPENAI_API_KEY=sk-proj-your-openai-key-here

# Configuration Application
NODE_ENV=production
SESSION_SECRET=your-super-secret-session-key-for-render-2024
APP_URL=https://TeamMove-app.onrender.com

# Port (géré automatiquement par Render)
PORT=10000
```

### 3. 🗄️ Configuration Base de Données

#### Option A: Utiliser Render PostgreSQL (Recommandé)

1. **Créer la Base de Données**
   - Render Dashboard → "New +" → "PostgreSQL"
   - Name: `TeamMove-db`
   - Database Name: `TeamMove`
   - User: `TeamMove_user`
   - Region: Même que votre service web
   - Plan: Free

2. **Connecter à votre Service**
   - La variable `DATABASE_URL` sera automatiquement injectée
   - Render gère les connexions internes automatiquement

#### Option B: Utiliser Neon (Base Actuelle)

1. **Configurer la Variable**
   ```bash
   DATABASE_URL=postgresql://neondb_owner:npg_kRUjHg1NJrI5@ep-muddy-violet-afg3rsgr-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

2. **Vérifier la Connexion**
   - Tester la connexion dans les logs de déploiement
   - Utiliser l'endpoint `/api/health` pour vérifier

### 4. 🚀 Déploiement

#### Déploiement Automatique
```bash
# Commiter et pousser les changements
git add .
git commit -m "feat(render): add render deployment configuration"
git push origin feature/complete-fixes-and-render-deployment

# Render détecte automatiquement et commence le déploiement
```

#### Suivi du Déploiement
1. Aller dans Render Dashboard → votre service
2. Onglet "Logs" pour voir le build en temps réel
3. Attendre que le status passe à "Live"

### 5. ✅ Vérification du Déploiement

#### Tests Essentiels
```bash
# 1. Health Check
curl https://TeamMove-app.onrender.com/api/health

# 2. Frontend
curl https://TeamMove-app.onrender.com/

# 3. API Authentication
curl -X POST https://TeamMove-app.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

#### Vérifications dans l'Interface
1. **Page d'accueil** : Doit charger correctement
2. **Inscription** : Formulaire avec autocomplétion adresse
3. **Connexion** : Doit fonctionner avec la base de données
4. **Création d'événement** : Tester le flow complet
5. **Envoi d'emails** : Vérifier que les invitations partent

### 6. 🔧 Configuration Avancée

#### A. Domaine Personnalisé (Optionnel)
1. Render Dashboard → votre service → Settings
2. "Custom Domains" → "Add Custom Domain"
3. Configurer les DNS selon les instructions Render

#### B. SSL/HTTPS
- Automatiquement géré par Render
- Certificats Let's Encrypt gratuits
- Redirection HTTP → HTTPS automatique

#### C. Monitoring et Logs
```bash
# Accéder aux logs en temps réel
render logs --service TeamMove-app --follow

# Métriques disponibles dans le dashboard
- CPU/Memory usage
- Response time
- Error rate
- Request volume
```

## 🐛 Dépannage

### Problèmes Courants

#### 1. Build Failed
```bash
# Vérifier les logs de build
# Causes communes:
- Dépendances manquantes
- Erreurs TypeScript
- Variables d'environnement manquantes au build
```

#### 2. Service Won't Start
```bash
# Vérifier:
- Start command correct (npm start)
- Port binding (process.env.PORT)
- Variables d'environnement critiques
```

#### 3. Database Connection Error
```bash
# Solutions:
- Vérifier DATABASE_URL format
- Tester connexion depuis Render shell
- Vérifier firewall/whitelist si base externe
```

#### 4. Frontend 404 Errors
```bash
# Causes:
- Build client non généré
- Mauvais chemin dans server/vite.ts
- Problème routing SPA
```

### Commandes de Debug

```bash
# Accéder au shell de votre service
render shell --service TeamMove-app

# Dans le shell, tester:
node -e "console.log(process.env.DATABASE_URL)"
ls -la dist/public/
npm list --production
```

## 📊 Performance et Scaling

### Plan Gratuit (Starter)
- 512 MB RAM
- 0.1 CPU
- Sleep après 15 min d'inactivité
- 750h/mois gratuit (suffisant pour la plupart des projets)

### Upgrade vers Plan Payant
```bash
# Avantages:
- Pas de sleep
- Plus de ressources
- Métriques avancées
- Support prioritaire
```

### Optimisations
```bash
# Réduction taille bundle
- Tree shaking activé
- Images optimisées
- Compression gzip automatique

# Performance base de données
- Pooling de connexions activé
- Requêtes optimisées avec index
- Cache en mémoire pour données fréquentes
```

## 🔒 Sécurité

### Variables d'Environnement
- Jamais de secrets dans le code
- Variables sensibles via Render Dashboard uniquement
- Rotation régulière des clés API

### HTTPS et Certificats
- SSL/TLS automatique avec Let's Encrypt
- HSTS headers activés
- Redirection HTTP → HTTPS forcée

### Base de Données
```bash
# Sécurité PostgreSQL:
- Connexions chiffrées (SSL)
- Authentification par certificat
- Firewall base de données
- Backups automatiques
```

## 📞 Support et Ressources

### Documentation Officielle
- [Render Docs](https://render.com/docs)
- [Render Node.js Guide](https://render.com/docs/deploy-node-express-app)
- [Environment Variables](https://render.com/docs/environment-variables)

### Communauté
- [Render Community Forum](https://community.render.com)
- [Discord Server](https://discord.gg/render)
- Support email pour comptes payants

### Monitoring
```bash
# Outils recommandés:
- Render built-in metrics
- Uptime monitoring (UptimeRobot)
- Error tracking (Sentry)
- Performance monitoring (New Relic)
```

## 🎯 Checklist Finale

Avant de considérer le déploiement comme terminé :

- [ ] ✅ Service déployé et status "Live"
- [ ] ✅ Health check répond correctement
- [ ] ✅ Frontend accessible et fonctionnel
- [ ] ✅ Base de données connectée
- [ ] ✅ Variables d'environnement configurées
- [ ] ✅ SendGrid emails fonctionnels
- [ ] ✅ Inscription/connexion testées
- [ ] ✅ Création d'événement testée
- [ ] ✅ Invitations emails testées
- [ ] ✅ SSL/HTTPS activé
- [ ] ✅ Logs monitoring configuré

## 🚀 URL de Production

Une fois déployé, votre application sera accessible à :
**https://TeamMove-app.onrender.com**

Personnalisez le nom dans Render Dashboard si souhaité.

---

**🎉 Félicitations ! TeamMove est maintenant déployé sur Render avec toutes les fonctionnalités opérationnelles !**