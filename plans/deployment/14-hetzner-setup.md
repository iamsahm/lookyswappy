# 14 - Hetzner VPS Setup

## Overview

Provision and configure a Hetzner VPS for hosting the lookyswappy API backend with Docker.

---

## Server Specification

**Recommended: Hetzner Cloud CX22**
- 2 vCPUs
- 4 GB RAM
- 40 GB NVMe SSD
- ~$4.50/month

This is plenty for a small app. Can scale up later if needed.

---

## Initial Setup

### 1. Create Server

1. Log into [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Create new project (or use existing)
3. Add Server:
   - Location: Choose nearest to your users
   - Image: Ubuntu 24.04
   - Type: CX22 (or CX11 for cheapest)
   - SSH Key: Add your public key
   - Name: `lookyswappy-api`

### 2. Connect to Server

```bash
ssh root@<your-server-ip>
```

### 3. Initial Security

```bash
# Update system
apt update && apt upgrade -y

# Create non-root user
adduser deploy
usermod -aG sudo deploy

# Copy SSH key to new user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Disable root login & password auth
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

### 4. Configure Firewall

```bash
# Install and configure UFW
apt install ufw -y

ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https

ufw enable
ufw status
```

### 5. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add deploy user to docker group
usermod -aG docker deploy

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 6. Set Up Application Directory

```bash
# Switch to deploy user
su - deploy

# Create app directory
mkdir -p /home/deploy/lookyswappy
cd /home/deploy/lookyswappy

# Create directory structure
mkdir -p data/postgres
```

---

## DNS Configuration

Point your domain to the server:

```
Type: A
Name: api (or lookyswappy-api)
Value: <your-server-ip>
TTL: 300
```

Result: `api.yourdomain.com` points to your server.

---

## Directory Structure

```
/home/deploy/lookyswappy/
├── docker-compose.yml
├── Caddyfile
├── .env
├── lookyswappy-api/              # Cloned from git or copied
│   ├── app/
│   ├── alembic/
│   ├── Dockerfile
│   └── requirements.txt
└── data/
    └── postgres/          # PostgreSQL data volume
```

---

## Environment File

### /home/deploy/lookyswappy/.env

```bash
# Database
POSTGRES_USER=lookyswappy
POSTGRES_PASSWORD=<generate-strong-password>
POSTGRES_DB=lookyswappy

# API
DATABASE_URL=postgresql+asyncpg://lookyswappy:<password>@db:5432/lookyswappy
JWT_SECRET=<generate-strong-secret>
DEBUG=false
CORS_ORIGINS=["https://your-app-domain.com"]

# Domain (for Caddy)
DOMAIN=api.yourdomain.com
```

Generate secrets:
```bash
# Generate random password
openssl rand -base64 32

# Generate JWT secret
openssl rand -hex 32
```

---

## Deployment Script

### /home/deploy/lookyswappy/deploy.sh

```bash
#!/bin/bash
set -e

cd /home/deploy/lookyswappy

echo "Pulling latest code..."
cd lookyswappy-api
git pull origin main
cd ..

echo "Building and restarting services..."
docker compose pull
docker compose build --no-cache api
docker compose up -d

echo "Running migrations..."
docker compose exec api alembic upgrade head

echo "Cleaning up old images..."
docker image prune -f

echo "Done!"
```

Make executable:
```bash
chmod +x deploy.sh
```

---

## Monitoring & Logs

```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f api

# Check container status
docker compose ps

# Check resource usage
docker stats
```

---

## Backup Strategy

### Database Backup Script

```bash
#!/bin/bash
# /home/deploy/lookyswappy/backup.sh

BACKUP_DIR="/home/deploy/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker compose exec -T db pg_dump -U lookyswappy lookyswappy > "$BACKUP_DIR/lookyswappy_$TIMESTAMP.sql"

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: lookyswappy_$TIMESTAMP.sql"
```

### Cron Job

```bash
# Edit crontab
crontab -e

# Add daily backup at 3 AM
0 3 * * * /home/deploy/lookyswappy/backup.sh >> /home/deploy/lookyswappy/backup.log 2>&1
```

---

## SSL Certificate

Caddy handles SSL automatically via Let's Encrypt. Just ensure:
1. Domain DNS is pointing to server
2. Ports 80 and 443 are open
3. Caddy is configured with your domain

First request to your domain will trigger certificate issuance.

---

## Server Maintenance

### Regular Updates

```bash
# Update system packages (monthly)
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker compose pull
docker compose up -d
```

### Restart Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart api
```

### Check Disk Space

```bash
df -h
docker system df
```

---

## Tasks

- [ ] Create Hetzner account and project
- [ ] Provision CX22 server with Ubuntu 24.04
- [ ] Configure SSH key access
- [ ] Create deploy user and disable root login
- [ ] Configure UFW firewall
- [ ] Install Docker and Docker Compose
- [ ] Set up DNS records
- [ ] Create directory structure
- [ ] Create .env file with secrets
- [ ] Create deploy script
- [ ] Set up backup cron job
- [ ] Test SSH access as deploy user
