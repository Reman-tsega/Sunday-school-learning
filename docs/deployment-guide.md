# EOTC Senbet Tmhrtbet Learning Platform — Production Deployment Guide

## 1. Overview & Architecture Summary

The **EOTC Senbet Tmhrtbet Learning Platform** is an offline-first educational system designed for the Ethiopian Orthodox Tewahedo Church. The platform delivers structured Orthodox curriculum (Grades 1–12), official textbook PDFs with precise chapter page ranges, offline practice quizzes with instant local feedback, and approved reference materials to students across both web and mobile environments.

### System Topology
```
                     ┌─────────────────────────────────────────┐
                     │          Cloudflare CDN / Proxy          │
                     └────────────────────┬────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌────────────────────────┐                      ┌────────────────────────┐
     │    Next.js 15 PWA      │                      │     Express.js API     │
     │   Port 3001 (Node 20)  │                      │   Port 3000 (Node 20)  │
     └────────────────────────┘                      └────────────┬───────────┘
                                                                  │
                                      ┌───────────────────────────┴───────────────────────────┐
                                      ▼                                                       ▼
                         ┌────────────────────────┐                              ┌────────────────────────┐
                         │     PostgreSQL 16      │                              │    Cloudinary CDN      │
                         │    Port 5432 (Docker)  │                              │   Textbooks & PDFs     │
                         └────────────────────────┘                              └────────────────────────┘
```

---

## 2. Infrastructure Prerequisites

| Component | Minimum Specification | Recommended Production |
| :--- | :--- | :--- |
| **Server OS** | Ubuntu 22.04 LTS / Debian 12 / Windows Server 2022 | Ubuntu 24.04 LTS |
| **CPU / RAM** | 2 vCPU, 4 GB RAM | 4 vCPU, 8 GB RAM |
| **Storage** | 40 GB SSD (NVMe preferred) | 100 GB NVMe with daily backups |
| **Node.js** | v20.18+ LTS | v20.18.x LTS |
| **Package Manager** | `pnpm` v9.15+ | `pnpm` v9.15.4 |
| **Database** | PostgreSQL 16 with connection pooling | PostgreSQL 16 (AWS RDS or Managed Postgres) |
| **Asset Storage** | Cloudinary Free Tier | Cloudinary Plus / AWS S3 with CloudFront |

---

## 3. Environment Variables Configuration

Create a production `.env` file in the root directory (based on `.env.example`):

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
API_URL=https://api.senbet.eotc-andnet.org
WEB_URL=https://learn.senbet.eotc-andnet.org

# Database Connection (PostgreSQL 16)
DATABASE_URL="postgresql://postgres:StrongProdPassword2026!@postgres:5432/eotc_learning?schema=public&connection_limit=20&pool_timeout=10"

# Cryptographic Authentication Secrets
JWT_ACCESS_SECRET="generate-with-openssl-rand-hex-64"
JWT_REFRESH_SECRET="generate-with-openssl-rand-hex-64"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"

# Cloudinary Storage Configuration
CLOUDINARY_CLOUD_NAME="eotc-andnet"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
CLOUDINARY_FOLDER="eotc-learning"

# Client CORS Settings
CORS_ORIGIN="https://learn.senbet.eotc-andnet.org,https://admin.senbet.eotc-andnet.org"
```

> [!IMPORTANT]
> Always generate cryptographic secrets using `openssl rand -hex 64` or `crypto.randomBytes(64).toString('hex')`. Never reuse default development secrets.

---

## 4. Database Setup & Migrations

### 4.1. Start Database Container
```bash
docker compose up -d postgres
```

### 4.2. Apply Migrations & Seed Admin
```bash
# Run Prisma migrations to establish canonical schema
pnpm --filter "@eotc/api" prisma migrate deploy

# Seed initial roles, admin user, and foundational curriculum (Grades 1-4)
pnpm --filter "@eotc/api" prisma db seed
```

---

## 5. Backend API Deployment (`apps/api`)

### Option A: Systemd Service (Linux Host)
Create `/etc/systemd/system/eotc-api.service`:
```ini
[Unit]
Description=EOTC Learning Platform Express API
After=network.target postgresql.service

[Service]
Type=simple
User=nodeapp
WorkingDirectory=/opt/eotc-learning
EnvironmentFile=/opt/eotc-learning/.env
ExecStart=/usr/bin/node apps/api/dist/server.js
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=eotc-api

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable eotc-api
sudo systemctl start eotc-api
```

### Option B: Dockerized API
```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile --filter "@eotc/shared" --filter "@eotc/api"
RUN pnpm --filter "@eotc/shared" build
RUN pnpm --filter "@eotc/api" build

EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
```

---

## 6. Student Web PWA Deployment (`apps/web`)

### Build Next.js PWA
```bash
pnpm --filter "@eotc/web" build
```

### Run Web Server (Port 3001)
```bash
pnpm --filter "@eotc/web" start -p 3001
```

### Reverse Proxy Configuration (Nginx)
```nginx
server {
    listen 80;
    server_name learn.senbet.eotc-andnet.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name learn.senbet.eotc-andnet.org;

    ssl_certificate /etc/letsencrypt/live/learn.senbet.eotc-andnet.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/learn.senbet.eotc-andnet.org/privkey.pem;

    # Service Worker and manifest caching headers
    location /sw.js {
        proxy_pass http://localhost:3001;
        add_header Cache-Control "no-cache";
    }

    location /manifest.json {
        proxy_pass http://localhost:3001;
        add_header Cache-Control "public, max-age=3600";
    }

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 7. Mobile App Release Process (`apps/mobile`)

The mobile application is built with React Native 0.76 and Expo SDK 52.

### 7.1. Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### 7.2. Configure `eas.json`
```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "production": {
      "channel": "production",
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "simulator": false
      }
    },
    "preview-apk": {
      "channel": "preview",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### 7.3. Build Android APK for Direct Offline Distribution
```bash
cd apps/mobile
eas build --profile preview-apk --platform android
```

### 7.4. Build Google Play AAB / Apple App Store IPA
```bash
eas build --profile production --platform all
```

---

## 8. Backup & Disaster Recovery Procedures

### Automated Daily Database Backup
Execute the provided PowerShell script on a scheduled task (or cron on Linux):
```powershell
.\scripts\backup-db.ps1 -BackupDir "D:\Backups\EOTC" -KeepDays 30
```

### Database Restore Procedure
In case of catastrophic failure or data corruption:
```powershell
.\scripts\restore-db.ps1 -BackupFile "D:\Backups\EOTC\eotc_learning_backup_20261021_051352.sql" -Force
```

---

## 9. Health Checks & Verification

Verify production service health:
- **API Health**: `curl -f https://api.senbet.eotc-andnet.org/api/health`
- **Database Status**: Confirmed inside response `{ "status": "UP", "database": "CONNECTED" }`
- **Web App PWA**: Open `https://learn.senbet.eotc-andnet.org` in Chrome/Edge, inspect Application > Service Workers and verify status is `Active and Running`.
