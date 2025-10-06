# 🏆 TeamMove - Plateforme de Covoiturage Sportif

[![Render Deployment](https://img.shields.io/badge/Render-Deployed-brightgreen)](https://teammove.fr)
[![CI/CD Pipeline](https://github.com/LtheBest/TeamMove/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/LtheBest/TeamMove/actions/workflows/ci-cd.yml)
[![Docker Hub](https://img.shields.io/docker/pulls/lthebest/TeamMove)](https://hub.docker.com/r/lthebest/TeamMove)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue.svg)](https://neon.tech)

Une application web moderne pour organiser et gérer le covoiturage pour les événements sportifs. Permettez à votre organisation sportive de créer facilement des événements et de faciliter le covoiturage entre les participants.

🌐 **[Application en Ligne](https://teammove.fr)** | 📖 **[Guide de Déploiement Render](RENDER_DEPLOYMENT_GUIDE_V2.md)** | 🧪 **[Tests de Santé](https://teammove.fr/api/health)**

## ✨ Fonctionnalités

### 🎯 Gestion d'Événements
- ✅ **Création d'événements** avec tous les détails (date, lieu, sport, etc.)
- ✅ **Inscription en ligne** des participants (conducteurs et passagers)
- ✅ **Vue publique** des événements avec informations détaillées
- ✅ **Statistiques en temps réel** du covoiturage
- ✅ **Système de rappels** automatiques par email

### 💬 Communication
- ✅ **Messagerie intégrée** pour les organisateurs
- ✅ **Notifications email** automatiques
- ✅ **Réponses par email** - Les participants peuvent répondre directement depuis leur email
- ✅ **Templates d'email** personnalisés et professionnels

### 🚗 Covoiturage Intelligent
- ✅ **Matching automatique** conducteurs/passagers
- ✅ **Gestion des places** disponibles
- ✅ **Calcul automatique** de l'occupation des véhicules
- ✅ **Optimisation des trajets** par IA

### 🛡️ Qualité & Sécurité
- ✅ **Linting ESLint** avec TypeScript
- ✅ **Formatage Prettier** automatique
- ✅ **Hooks pre-commit** avec Husky
- ✅ **Validation des commits** avec commitlint
- ✅ **Tests automatisés** (unitaires et E2E)

### 🚀 Déploiement & DevOps
- ✅ **CI/CD GitHub Actions** complet
- ✅ **Containerisation Docker** prête pour la production
- ✅ **Déploiement Vercel** en un clic
- ✅ **Configuration VPS** avec Docker Compose
- ✅ **Monitoring & Health checks**

## 🎬 Démo

[🌐 **Démo en ligne**](https://TeamMove.vercel.app) | [📱 **Version mobile**](https://TeamMove.vercel.app)

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- PostgreSQL
- Compte SendGrid (pour les emails)

### Installation locale

```bash
# Cloner le repository
git clone https://github.com/LtheBest/TeamMove.git
cd TeamMove

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditez .env avec vos configurations

# Initialiser la base de données
npm run db:push

# Démarrer en mode développement
npm run dev
```

L'application sera accessible sur https://teammove.fr

### Avec Docker

```bash
# Build et démarrage avec Docker Compose
docker-compose up -d

# Ou utilisation de l'image Docker Hub
docker pull lthebest/TeamMove:latest
docker run -p 3000:3000 lthebest/TeamMove:latest
```

## 🏗️ Architecture

```
TeamMove/
├── client/                 # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── pages/         # Pages de l'application
│   │   └── lib/           # Utilitaires et configuration
├── server/                # Backend Express + TypeScript
│   ├── routes.ts          # Routes API
│   ├── email.ts           # Service d'emails
│   ├── storage.ts         # Couche d'accès aux données
│   └── openai.ts          # Integration IA
├── shared/                # Types et schémas partagés
├── tests/                 # Tests automatisés
├── .github/workflows/     # CI/CD GitHub Actions
└── docker-compose.yml     # Configuration Docker
```

## 🛠️ Technologies

### Frontend
- **React 18** avec TypeScript
- **Vite** pour le build rapide
- **Tailwind CSS** pour le styling
- **Radix UI** pour les composants accessibles
- **React Query** pour la gestion d'état serveur

### Backend
- **Express.js** avec TypeScript
- **Drizzle ORM** pour la base de données
- **PostgreSQL** comme base de données
- **SendGrid** pour les emails
- **OpenAI** pour l'IA

### DevOps & Qualité
- **ESLint + Prettier** pour la qualité du code
- **Husky + commitlint** pour les hooks Git
- **Vitest** pour les tests unitaires
- **Playwright** pour les tests E2E
- **Docker** pour la containerisation
- **GitHub Actions** pour CI/CD
- **Render.com** pour le déploiement en production

## 🧪 Tests et Diagnostic

### Tests Automatisés de Déploiement
```bash
# Tester votre déploiement Render
node test-render-deployment.js https://teammove.fr

# Tests locaux
npm run test:all            # Tous les tests (unitaires + E2E)
```

### Endpoints de Diagnostic
```bash
# Santé générale de l'application
curl https://teammove.fr/api/health

# Test de connexion base de données
curl https://teammove.fr/api/db-test

# Test des sessions (authentification)
curl https://teammove.fr/api/session-test

# Communication backend
curl https://teammove.fr/api/test

# Debug utilisateurs (dev seulement)
curl https://teammove.fr/api/debug/users
```

### Monitoring en Temps Réel
- 🟢 **Status**: [https://teammove.fr/api/health](https://teammove.fr/api/health)
- 💾 **Database**: [https://teammove.fr/api/db-test](https://teammove.fr/api/db-test)
- 📊 **Performance**: Consultez les logs Render Dashboard

## 📊 Scripts disponibles

```bash
# Développement
npm run dev              # Démarrer en mode développement
npm run build           # Build pour la production
npm run start           # Démarrer en mode production

# Qualité du code
npm run lint            # Vérification ESLint
npm run lint:fix        # Correction automatique ESLint
npm run format          # Formatage Prettier
npm run format:check    # Vérification du formatage
npm run quality         # Tous les checks qualité

# Tests
npm run test            # Tests unitaires
npm run test:e2e        # Tests end-to-end
npm run test:all        # Tous les tests

# Base de données
npm run db:push         # Synchroniser le schéma DB

# Docker
./scripts/docker-build.sh [tag]  # Build et push Docker
```

## 🌐 Déploiement

### Déploiement automatique

L'application se déploie automatiquement via GitHub Actions :
- **Push sur `develop`** : Tests et vérifications
- **Push sur `main`** : Déploiement complet (Vercel + VPS)

### Déploiement manuel

Consultez le [Guide de déploiement détaillé](./DEPLOYMENT.md) pour :
- 🌐 **Vercel** (gratuit, recommandé)
- 🖥️ **VPS avec Docker** (Oracle Cloud, AWS, GCP)
- ⚙️ **Configuration des variables d'environnement**
- 🔐 **Configuration SSL**

## 🔧 Configuration

### Variables d'environnement

```bash
# Application
NODE_ENV=production
APP_URL=https://votre-domaine.com

# Base de données
DATABASE_URL=postgresql://user:password@host:5432/database

# Sécurité
SESSION_SECRET=votre-secret-tres-long-et-securise

# Email (SendGrid)
SENDGRID_API_KEY=SG.your-api-key
SENDGRID_FROM_EMAIL=noreply@votre-domaine.com
SENDGRID_FROM_NAME=TeamMove

# IA (Optionnel)
OPENAI_API_KEY=sk-your-openai-key
```

## 🤝 Contribution

Nous accueillons les contributions ! Voici comment participer :

1. **Fork** le projet
2. **Créez une branche** pour votre fonctionnalité (`git checkout -b feature/amazing-feature`)
3. **Committez** vos changements (`git commit -m 'feat: add amazing feature'`)
4. **Push** sur la branche (`git push origin feature/amazing-feature`)
5. **Ouvrez une Pull Request**

### Standards de contribution

- ✅ Respecter les conventions de commit ([Conventional Commits](https://www.conventionalcommits.org/))
- ✅ Tous les tests doivent passer
- ✅ Code coverage > 80%
- ✅ Documentation mise à jour

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

- 📖 **Documentation** : [Guide de déploiement](./DEPLOYMENT.md)
- 🐛 **Bugs** : [Issues GitHub](https://github.com/LtheBest/TeamMove/issues)
- 💬 **Questions** : [Discussions GitHub](https://github.com/LtheBest/TeamMove/discussions)
- 📧 **Email** : support@TeamMove.app

## 🎯 Roadmap

### Version 2.0 (À venir)
- [ ] Application mobile (React Native)
- [ ] Notifications push
- [ ] Paiements en ligne
- [ ] API publique
- [ ] Multi-tenancy

### Version 1.5 (En cours)
- [x] Système de réponse par email
- [x] CI/CD complet
- [x] Containerisation Docker
- [ ] Mode sombre
- [ ] Internationalisation (i18n)

## 📊 Statistiques

![GitHub stars](https://img.shields.io/github/stars/LtheBest/TeamMove?style=social)
![GitHub forks](https://img.shields.io/github/forks/LtheBest/TeamMove?style=social)
![GitHub issues](https://img.shields.io/github/issues/LtheBest/TeamMove)
![GitHub pull requests](https://img.shields.io/github/issues-pr/LtheBest/TeamMove)

---

<div align="center">
  <p>Fait avec ❤️ pour la communauté sportive</p>
  <p>
    <a href="https://github.com/LtheBest/TeamMove">⭐ Star ce projet</a> •
    <a href="https://github.com/LtheBest/TeamMove/fork">🍴 Fork</a> •
    <a href="https://teammove.fr">🌐 Démo</a>
  </p>
</div>