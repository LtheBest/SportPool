# 🌐 Configuration des Variables d'Environnement Vercel

## 📋 Variables à configurer dans le dashboard Vercel

Allez dans votre projet Vercel > Settings > Environment Variables et ajoutez :

### 🗄️ Base de données
```
DATABASE_URL=postgresql://neondb_owner:npg_kRUjHg1NJrI5@ep-muddy-violet-afg3rsgr-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### 📧 Configuration SendGrid
```
SENDGRID_API_KEY=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
SENDGRID_FROM_EMAIL=alt.f7-3ywk4mu@yopmail.com
SENDGRID_FROM_NAME=CovoitSport
```

### 🤖 Configuration OpenAI
```
OPENAI_API_KEY=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
```

### ⚙️ Configuration de l'application
```
NODE_ENV=production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production-vercel-2024
APP_URL=https://votre-projet.vercel.app
```

## 🚀 Commandes de déploiement

### Via CLI Vercel
```bash
# Installer la CLI Vercel
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel --prod
```

### Via Git (Recommandé)
1. Push sur la branche `main` ou `master`
2. Vercel déploie automatiquement

## 🔧 Configuration de build

Le projet utilise maintenant :
- **Build Command**: `npm run build` (défini dans vercel.json)
- **Output Directory**: `dist/public`
- **API Routes**: Fichiers dans `/api` 

## 🐛 Debug des erreurs 404

Si vous avez encore des erreurs 404 :

1. Vérifiez que le build génère des fichiers dans `dist/public/`
2. Vérifiez les logs Vercel pour voir les erreurs de build
3. Assurez-vous que toutes les variables d'environnement sont définies
4. Vérifiez que les routes API répondent avec `/api/...`

## 📱 Test en local avec la configuration Vercel

```bash
# Builder comme Vercel
npm run build

# Tester localement
npm start
```