# 16 - GitHub Actions CI/CD

## Overview

Set up GitHub Actions for automated testing, building, and deployment of both backend and mobile apps.

---

## Repository Secrets

Configure these in GitHub repository settings:

### Backend Deployment
| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Hetzner server IP or hostname |
| `DEPLOY_USER` | SSH user (e.g., `deploy`) |
| `DEPLOY_SSH_KEY` | Private SSH key for deployment |

### Mobile (EAS)
| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | Expo access token from expo.dev |

---

## Backend Workflows

### .github/workflows/backend-ci.yml

```yaml
name: Backend CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'lookyswappy-api/**'
      - '.github/workflows/backend-*.yml'
  pull_request:
    branches: [main]
    paths:
      - 'lookyswappy-api/**'

defaults:
  run:
    working-directory: lookyswappy-api

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install ruff mypy
          pip install -r requirements.txt

      - name: Run Ruff (linter)
        run: ruff check .

      - name: Run MyPy (type checker)
        run: mypy app --ignore-missing-imports

  test:
    name: Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: lookyswappy_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx

      - name: Run tests
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/lookyswappy_test
          JWT_SECRET: test-secret
        run: pytest -v

  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t lookyswappy-api:${{ github.sha }} .
```

### .github/workflows/backend-deploy.yml

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'lookyswappy-api/**'
  workflow_dispatch:  # Allow manual trigger

defaults:
  run:
    working-directory: lookyswappy-api

jobs:
  deploy:
    name: Deploy to Hetzner
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Run tests first
        run: |
          pip install -r requirements.txt pytest pytest-asyncio httpx
          pytest -v
        env:
          DATABASE_URL: sqlite+aiosqlite:///./test.db
          JWT_SECRET: test-secret

      - name: Set up SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H ${{ secrets.DEPLOY_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy
        run: |
          ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} << 'EOF'
            cd /home/deploy/lookyswappy
            git pull origin main
            docker compose build --no-cache api
            docker compose up -d
            docker compose exec -T api alembic upgrade head
            docker image prune -f
          EOF

      - name: Health check
        run: |
          sleep 10
          curl -f https://api.yourdomain.com/health || exit 1
```

---

## Mobile Workflows

### .github/workflows/mobile-ci.yml

```yaml
name: Mobile CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'lookyswappy-app/**'
      - '.github/workflows/mobile-*.yml'
  pull_request:
    branches: [main]
    paths:
      - 'lookyswappy-app/**'

defaults:
  run:
    working-directory: lookyswappy-app

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: lookyswappy-app/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript check
        run: npm run typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: lookyswappy-app/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage
```

### .github/workflows/mobile-build.yml

```yaml
name: Build Mobile App

on:
  push:
    tags:
      - 'v*'  # Trigger on version tags like v1.0.0
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to build'
        required: true
        default: 'all'
        type: choice
        options:
          - all
          - ios
          - android
      profile:
        description: 'Build profile'
        required: true
        default: 'production'
        type: choice
        options:
          - development
          - preview
          - production

defaults:
  run:
    working-directory: lookyswappy-app

jobs:
  build:
    name: EAS Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: lookyswappy-app/package-lock.json

      - name: Set up Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build app
        run: |
          PLATFORM="${{ github.event.inputs.platform || 'all' }}"
          PROFILE="${{ github.event.inputs.profile || 'production' }}"
          eas build --platform $PLATFORM --profile $PROFILE --non-interactive

  submit:
    name: Submit to Stores
    runs-on: ubuntu-latest
    needs: build
    if: github.event.inputs.profile == 'production' || startsWith(github.ref, 'refs/tags/')
    steps:
      - uses: actions/checkout@v4

      - name: Set up Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Submit to App Store
        run: eas submit --platform ios --latest --non-interactive
        continue-on-error: true  # Don't fail if submission fails

      - name: Submit to Play Store
        run: eas submit --platform android --latest --non-interactive
        continue-on-error: true
```

---

## API Types Generation

### .github/workflows/generate-types.yml

```yaml
name: Generate API Types

on:
  push:
    branches: [main]
    paths:
      - 'lookyswappy-api/app/schemas/**'
  workflow_dispatch:

jobs:
  generate:
    name: Generate TypeScript Types
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install backend dependencies
        working-directory: lookyswappy-api
        run: pip install -r requirements.txt

      - name: Start API server
        working-directory: lookyswappy-api
        run: |
          uvicorn app.main:app --host 0.0.0.0 --port 8000 &
          sleep 5
        env:
          DATABASE_URL: sqlite+aiosqlite:///./temp.db
          JWT_SECRET: temp-secret

      - name: Generate types
        working-directory: lookyswappy-app
        run: |
          npm install -D openapi-typescript
          npx openapi-typescript http://localhost:8000/openapi.json -o ./types/api.d.ts

      - name: Commit changes
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: regenerate API types"
          file_pattern: "lookyswappy-app/types/api.d.ts"
```

---

## Branch Protection

Recommended settings for `main` branch:

1. **Require pull request reviews** (at least 1)
2. **Require status checks to pass**:
   - `Backend CI / Lint`
   - `Backend CI / Test`
   - `Mobile CI / Lint & Type Check`
   - `Mobile CI / Test`
3. **Require branches to be up to date**
4. **Do not allow bypassing settings**

---

## Release Process

1. Create version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. This triggers:
   - Mobile build workflow
   - EAS builds iOS and Android
   - Submits to App Store and Play Store

3. Backend deploys on merge to main (no tagging needed)

---

## Tasks

- [ ] Create backend-ci.yml workflow
- [ ] Create backend-deploy.yml workflow
- [ ] Create mobile-ci.yml workflow
- [ ] Create mobile-build.yml workflow
- [ ] Create generate-types.yml workflow
- [ ] Add repository secrets
- [ ] Configure branch protection rules
- [ ] Test CI on a feature branch
- [ ] Test deployment workflow
- [ ] Document release process
