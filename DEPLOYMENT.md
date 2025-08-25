# 🚀 Guide de Déploiement SportPool

Ce guide vous explique comment déployer l'application SportPool sur différentes plateformes.

## 📋 Table des matières

- [Prérequis](#prérequis)
- [Déploiement Vercel (Gratuit)](#déploiement-vercel-gratuit)
- [Déploiement VPS avec Docker (Gratuit)](#déploiement-vps-avec-docker-gratuit)
- [Variables d'environnement](#variables-denvironnement)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Maintenance](#maintenance)

## 🔧 Prérequis

- Compte GitHub
- Node.js 18+
- Docker (pour le déploiement VPS)
- Accès à une base de données PostgreSQL

## 🌐 Déploiement Vercel (Gratuit)

### Étape 1 : Préparation du projet

1. **Forkez le repository** sur votre compte GitHub
2. **Clonez votre fork** localement :
   ```bash
   git clone https://github.com/VOTRE_USERNAME/SportPool.git
   cd SportPool
   ```

### Étape 2 : Configuration Vercel

1. **Créez un compte Vercel** sur [vercel.com](https://vercel.com)
2. **Connectez votre compte GitHub** à Vercel
3. **Importez votre projet** :
   - Cliquez sur "New Project"
   - Sélectionnez votre repository SportPool
   - Laissez les paramètres par défaut

### Étape 3 : Configuration des variables d'environnement

Dans le dashboard Vercel, allez dans Settings > Environment Variables et ajoutez :

```
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=votre-secret-session-tres-long-et-securise
SENDGRID_API_KEY=votre-cle-sendgrid
SENDGRID_FROM_EMAIL=noreply@votre-domaine.com
APP_URL=https://votre-app.vercel.app
```

### Étape 4 : Base de données

**Option 1 : Neon (Gratuit)**
1. Créez un compte sur [neon.tech](https://neon.tech)
2. Créez une nouvelle base de données
3. Copiez l'URL de connexion dans `DATABASE_URL`

**Option 2 : Supabase (Gratuit)**
1. Créez un compte sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Récupérez l'URL PostgreSQL dans Settings > Database

### Étape 5 : Configuration email

1. **Créez un compte SendGrid** sur [sendgrid.com](https://sendgrid.com) (gratuit jusqu'à 100 emails/jour)
2. **Générez une API Key** dans Settings > API Keys
3. **Vérifiez votre domaine** ou utilisez un email SendGrid vérifié

### Étape 6 : Déploiement

1. **Push votre code** sur GitHub
2. **Vercel déploiera automatiquement** votre application
3. **Testez votre application** sur l'URL fournie par Vercel

## 🖥️ Déploiement VPS avec Docker (Gratuit)

### Étape 1 : Obtenir un VPS gratuit

**Option 1 : Oracle Cloud (Gratuit à vie)**
1. Créez un compte sur [Oracle Cloud](https://www.oracle.com/cloud/free/)
2. Créez une instance Compute (ARM Ampere ou AMD)
3. Configuration recommandée : 1-4 OCPU, 6-24GB RAM

**Option 2 : AWS EC2 (12 mois gratuits)**
1. Créez un compte AWS
2. Lancez une instance t2.micro (incluse dans l'offre gratuite)

**Option 3 : Google Cloud Platform (300$ de crédits)**
1. Créez un compte GCP
2. Utilisez une instance e2-micro

### Étape 2 : Configuration du serveur

1. **Connectez-vous à votre serveur** :
   ```bash
   ssh -i votre-cle.pem ubuntu@votre-ip-serveur
   ```

2. **Installez Docker** :
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Installez Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Redémarrez la session** :
   ```bash
   exit
   ssh -i votre-cle.pem ubuntu@votre-ip-serveur
   ```

### Étape 3 : Préparation des fichiers

1. **Créez le répertoire de l'application** :
   ```bash
   mkdir ~/sportpool
   cd ~/sportpool
   ```

2. **Créez le fichier .env** :
   ```bash
   cat > .env << 'EOF'
   NODE_ENV=production
   DATABASE_URL=postgresql://sportpool:sportpool_password@db:5432/sportpool
   SESSION_SECRET=votre-secret-session-tres-long-et-securise
   SENDGRID_API_KEY=votre-cle-sendgrid
   SENDGRID_FROM_EMAIL=noreply@votre-domaine.com
   APP_URL=http://votre-ip-serveur
   EOF
   ```

3. **Copiez les fichiers de configuration** depuis votre repository :
   - `docker-compose.yml`
   - `nginx.conf`

### Étape 4 : Configuration SSL (Optionnel)

1. **Installez Certbot** :
   ```bash
   sudo apt update
   sudo apt install certbot
   ```

2. **Obtenez un certificat SSL** :
   ```bash
   sudo certbot certonly --standalone -d votre-domaine.com
   ```

3. **Copiez les certificats** :
   ```bash
   sudo mkdir -p ~/sportpool/ssl
   sudo cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem ~/sportpool/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem ~/sportpool/ssl/key.pem
   sudo chown -R $USER:$USER ~/sportpool/ssl
   ```

### Étape 5 : Déploiement

1. **Démarrez les services** :
   ```bash
   cd ~/sportpool
   docker-compose up -d
   ```

2. **Vérifiez les logs** :
   ```bash
   docker-compose logs -f
   ```

3. **Testez l'application** :
   ```bash
   curl http://localhost/api/health
   ```

### Étape 6 : Configuration du firewall

```bash
# Ubuntu UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# CentOS/RHEL Firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 🔐 Variables d'environnement

### Variables requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NODE_ENV` | Environnement d'exécution | `production` |
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Secret pour les sessions | `secret-tres-long-et-aleatoire` |
| `SENDGRID_API_KEY` | Clé API SendGrid | `SG.xxxxx` |
| `SENDGRID_FROM_EMAIL` | Email expéditeur | `noreply@domain.com` |
| `APP_URL` | URL de l'application | `https://app.domain.com` |

### Variables optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `SENDGRID_FROM_NAME` | Nom expéditeur | `SportPool` |
| `PORT` | Port du serveur | `3000` |

## 🔄 GitHub Actions CI/CD

### Configuration des secrets GitHub

Dans votre repository GitHub, allez dans Settings > Secrets and variables > Actions et ajoutez :

#### Pour Vercel :
- `VERCEL_TOKEN` : Token d'API Vercel
- `VERCEL_ORG_ID` : ID de votre organisation Vercel
- `VERCEL_PROJECT_ID` : ID de votre projet Vercel

#### Pour Docker Hub :
- `DOCKER_USERNAME` : Votre nom d'utilisateur Docker Hub
- `DOCKER_PASSWORD` : Votre mot de passe Docker Hub

#### Pour VPS :
- `SERVER_HOST` : IP de votre serveur
- `SERVER_USER` : Nom d'utilisateur SSH
- `SERVER_SSH_KEY` : Clé privée SSH (contenu complet)

#### Variables d'environnement :
- `DATABASE_URL`
- `SESSION_SECRET`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`

### Workflow automatique

Le workflow GitHub Actions se déclenche automatiquement sur :
- **Push sur `develop`** : Tests et vérifications uniquement
- **Push sur `main`** : Tests + déploiement complet

## 🛠️ Maintenance

### Mise à jour de l'application

1. **Vercel** : Push sur la branche `main`
2. **VPS Docker** :
   ```bash
   cd ~/sportpool
   docker-compose pull
   docker-compose up -d --force-recreate
   ```

### Surveillance des logs

```bash
# Vercel
vercel logs --app=votre-app

# VPS Docker
docker-compose logs -f sportpool-app
```

### Sauvegarde de la base de données

```bash
# Depuis le container Docker
docker-compose exec db pg_dump -U sportpool sportpool > backup.sql

# Restauration
docker-compose exec -T db psql -U sportpool -d sportpool < backup.sql
```

### SSL automatique (Renouvellement)

```bash
# Ajoutez à crontab
0 0 1 * * certbot renew --quiet && docker-compose restart nginx
```

## 🆘 Dépannage

### Problèmes courants

1. **Erreur de base de données** : Vérifiez `DATABASE_URL`
2. **Emails non envoyés** : Vérifiez `SENDGRID_API_KEY`
3. **Erreur 502** : Vérifiez que l'application écoute sur le bon port
4. **Certificat SSL** : Vérifiez les permissions des fichiers SSL

### Commandes utiles

```bash
# Redémarrer l'application
docker-compose restart sportpool-app

# Voir les logs en temps réel
docker-compose logs -f

# Nettoyer les images Docker
docker system prune -a

# Vérifier l'espace disque
df -h
```

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs d'application
2. Consultez la documentation des services tiers
3. Ouvrez une issue sur GitHub avec les détails de l'erreur

---

**🎉 Félicitations !** Votre application SportPool est maintenant déployée et accessible en ligne !