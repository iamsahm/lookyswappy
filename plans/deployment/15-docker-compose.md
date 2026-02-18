# 15 - Docker Compose Configuration

## Overview

Complete Docker Compose setup for running the lookyswappy API with PostgreSQL and Caddy reverse proxy.

---

## docker-compose.yml

```yaml
version: "3.8"

services:
  # ===================
  # PostgreSQL Database
  # ===================
  db:
    image: postgres:16-alpine
    container_name: lookyswappy-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-lookyswappy}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Database password required}
      POSTGRES_DB: ${POSTGRES_DB:-lookyswappy}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-lookyswappy}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - lookyswappy-network

  # ===================
  # FastAPI Application
  # ===================
  api:
    build:
      context: ./lookyswappy-api
      dockerfile: Dockerfile
    container_name: lookyswappy-api
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET:?JWT secret required}
      DEBUG: ${DEBUG:-false}
      CORS_ORIGINS: ${CORS_ORIGINS:-["*"]}
    expose:
      - "8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - lookyswappy-network

  # ===================
  # Caddy Reverse Proxy
  # ===================
  caddy:
    image: caddy:2-alpine
    container_name: lookyswappy-caddy
    restart: unless-stopped
    depends_on:
      - api
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - lookyswappy-network

volumes:
  postgres_data:
    name: lookyswappy-postgres-data
  caddy_data:
    name: lookyswappy-caddy-data
  caddy_config:
    name: lookyswappy-caddy-config

networks:
  lookyswappy-network:
    name: lookyswappy-network
    driver: bridge
```

---

## Caddyfile

```caddyfile
# Caddyfile for lookyswappy API

{$DOMAIN:localhost} {
    # Reverse proxy to FastAPI
    reverse_proxy api:8000

    # Enable compression
    encode gzip

    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }

    # Logging
    log {
        output file /data/access.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}

# Health check endpoint (no HTTPS required)
:80 {
    respond /health "OK" 200
}
```

For production with a real domain:

```caddyfile
# Caddyfile for production

api.yourdomain.com {
    reverse_proxy api:8000
    encode gzip

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }

    log {
        output file /data/access.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}
```

---

## Dockerfile (API)

### lookyswappy-api/Dockerfile

```dockerfile
# Multi-stage build for smaller image

# Build stage
FROM python:3.12-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.12-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Environment File Template

### .env.example

```bash
# PostgreSQL
POSTGRES_USER=lookyswappy
POSTGRES_PASSWORD=changeme
POSTGRES_DB=lookyswappy

# FastAPI
DATABASE_URL=postgresql+asyncpg://lookyswappy:changeme@db:5432/lookyswappy
JWT_SECRET=your-super-secret-key-change-in-production
DEBUG=false
CORS_ORIGINS=["https://your-app-domain.com"]

# Caddy
DOMAIN=api.yourdomain.com
```

---

## Commands

### Development

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Rebuild API after code changes
docker compose build api
docker compose up -d api

# Run migrations
docker compose exec api alembic upgrade head

# Create new migration
docker compose exec api alembic revision --autogenerate -m "description"

# Access PostgreSQL CLI
docker compose exec db psql -U lookyswappy -d lookyswappy

# Access API container shell
docker compose exec api bash
```

### Production

```bash
# Pull latest images and restart
docker compose pull
docker compose up -d

# Force rebuild everything
docker compose build --no-cache
docker compose up -d

# View resource usage
docker stats

# Check container health
docker compose ps

# View Caddy logs
docker compose logs -f caddy
```

---

## Local Development Override

### docker-compose.override.yml

```yaml
# Automatically loaded in development
# DO NOT commit to git

version: "3.8"

services:
  api:
    build:
      context: ./lookyswappy-api
    volumes:
      # Mount source code for hot reload
      - ./lookyswappy-api:/app
    environment:
      DEBUG: "true"
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  db:
    ports:
      # Expose PostgreSQL for local tools
      - "5432:5432"
```

---

## Troubleshooting

### Database won't start

```bash
# Check logs
docker compose logs db

# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d
```

### API can't connect to database

```bash
# Verify DATABASE_URL matches docker-compose service name
# Should be: postgresql+asyncpg://user:pass@db:5432/lookyswappy
#                                         ^^^ service name

# Check if db is healthy
docker compose ps
```

### Caddy SSL issues

```bash
# Check Caddy logs
docker compose logs caddy

# Verify DNS is pointing to server
dig api.yourdomain.com

# Ensure ports 80 and 443 are open
sudo ufw status
```

### Container keeps restarting

```bash
# Check exit code and logs
docker compose ps
docker compose logs api --tail=50
```

---

## Tasks

- [ ] Create docker-compose.yml
- [ ] Create Caddyfile
- [ ] Create/update Dockerfile for API
- [ ] Create .env from template
- [ ] Test local docker compose up
- [ ] Verify all services start correctly
- [ ] Test API health endpoint through Caddy
- [ ] Test database migrations in container
- [ ] Create docker-compose.override.yml for dev
