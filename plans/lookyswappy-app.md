# lookyswappy Scoring App - Implementation Plan

## Overview

A mobile scoring app for the card game lookyswappy with offline-first architecture. Works without internet, syncs to backend when online.

---

## Scoring Rules

- Track cumulative scores across rounds for any number of players
- Game ends when someone hits 100 points (configurable later)
- **Multiple of 25 bonus**: Landing on 25/50/75/100 gives -25 points
  - Exception: Not if already at 0 points
  - Exception: Not if got -25 last round AND would hit 0 again
- No penalty for calling lookyswappy without lowest hand

---

## Tech Stack

### Frontend: React Native + Expo

| Component | Choice | Notes |
|-----------|--------|-------|
| Framework | Expo (SDK 52+) | Managed workflow, no native code hassle |
| Navigation | Expo Router | File-based routing, TypeScript support |
| Local DB | WatermelonDB | Built for RN, lazy loading, sync protocol |
| UI | React Native Paper | Material Design components |

### Backend: FastAPI + PostgreSQL

| Component | Choice | Notes |
|-----------|--------|-------|
| API | FastAPI | Async, auto-docs, Python |
| Database | PostgreSQL | Relational, good for sync |
| ORM | SQLAlchemy 2.0 | Async support, Alembic migrations |
| Auth | JWT (device-based) | No login required, secures endpoints |
| Hosting | Hetzner VPS | Self-hosted with Docker |

### Type Safety (Frontend ↔ Backend)

| Component | Choice | Notes |
|-----------|--------|-------|
| API Types | openapi-typescript | Generate TS types from FastAPI's OpenAPI spec |
| Workflow | CI + npm script | Regenerate types when API changes |

### CI/CD & Deployment

| Component | Choice | Notes |
|-----------|--------|-------|
| CI/CD | GitHub Actions | Lint, test, build, deploy |
| Backend Deploy | Docker + docker-compose | On Hetzner VPS |
| Reverse Proxy | Caddy | Auto HTTPS, simple config |
| Mobile Builds | EAS Build | Expo's cloud build service |
| App Submission | EAS Submit | Push to App Store / Play Store |

---

## Implementation Phases

### Phase 1: Local-Only MVP
- [ ] Set up Expo project with TypeScript
- [ ] Implement WatermelonDB schema and models
- [ ] Build screens: New Game, Scoreboard, Add Round
- [ ] Implement scoring logic with bonus rules
- [ ] Test offline functionality

### Phase 2: Backend Foundation
- [ ] Set up FastAPI project
- [ ] Create PostgreSQL schema with Alembic migrations
- [ ] Implement sync endpoints (pull/push)
- [ ] Ensure OpenAPI spec is well-documented (Pydantic schemas with descriptions)
- [ ] Add tests for sync logic

### Phase 3: Sync Integration
- [ ] Set up openapi-typescript and generate types from backend
- [ ] Add npm script to regenerate types (`npm run generate:api-types`)
- [ ] Integrate WatermelonDB sync on frontend
- [ ] Add network detection and sync triggers
- [ ] Handle conflict resolution
- [ ] Add sync status UI indicator

### Phase 4: Polish & Deploy
- [ ] Game history view
- [ ] Basic statistics
- [ ] Set up Hetzner VPS (Docker, Caddy, PostgreSQL)
- [ ] Create docker-compose.yml for backend
- [ ] Set up GitHub Actions for backend CI/CD
- [ ] Deploy backend to Hetzner
- [ ] Configure EAS Build for mobile
- [ ] Build and test on physical devices
- [ ] Set up Apple Developer & Google Play accounts
- [ ] Submit to app stores via EAS Submit

### Future
- [ ] User accounts
- [ ] Cross-device sync
- [ ] Unlimited game mode
- [ ] Advanced stats/charts

---

## Key Files to Implement

1. `lookyswappy-app/database/schema.ts` - WatermelonDB schema
2. `lookyswappy-app/services/scoring.ts` - Bonus calculation logic
3. `lookyswappy-app/services/sync.ts` - Sync implementation
4. `lookyswappy-api/app/api/v1/sync.py` - Backend sync endpoints
5. `lookyswappy-app/app/game/[id]/add-round.tsx` - Score entry screen

---

## Open Questions / Notes

_Add your notes here as you refine the plan:_

-
-
-

---

## Detailed Sub-Plans

Each component has a detailed plan with pseudocode, schemas, and implementation steps:

### Frontend
- [x] [`01-expo-setup.md`](./frontend/01-expo-setup.md) - Project scaffolding, dependencies, folder structure
- [x] [`02-database-schema.md`](./frontend/02-database-schema.md) - WatermelonDB schema, models, migrations
- [x] [`03-scoring-logic.md`](./frontend/03-scoring-logic.md) - Bonus calculation, edge cases, unit test cases
- [ ] `frontend/04-screens-new-game.md` - Create game flow, player entry UI
- [ ] `frontend/05-screens-scoreboard.md` - Score table, round history, current standings
- [ ] `frontend/06-screens-add-round.md` - Score input per player, bonus preview, submit
- [ ] `frontend/07-sync-client.md` - WatermelonDB sync setup, network detection, retry logic

### Backend
- [x] [`08-fastapi-setup.md`](./backend/08-fastapi-setup.md) - Project structure, config, database connection
- [x] [`09-db-models.md`](./backend/09-db-models.md) - SQLAlchemy models, Alembic migrations
- [x] [`10-auth-endpoints.md`](./backend/10-auth-endpoints.md) - Device registration, JWT issue/refresh, middleware
- [x] [`11-sync-endpoints.md`](./backend/11-sync-endpoints.md) - Pull/push logic, conflict detection, response format
- [ ] `backend/12-openapi-types.md` - Pydantic schema design, OpenAPI customization for clean generated types

### Integration
- [ ] `integration/13-end-to-end-flow.md` - Full data flow from score entry to sync to server

### Deployment
- [x] [`14-hetzner-setup.md`](./deployment/14-hetzner-setup.md) - VPS provisioning, Docker install, firewall, SSH hardening
- [x] [`15-docker-compose.md`](./deployment/15-docker-compose.md) - Service definitions, networking, volumes, env vars
- [x] [`16-github-actions.md`](./deployment/16-github-actions.md) - CI workflows for backend tests + deploy, mobile builds
- [x] [`17-eas-config.md`](./deployment/17-eas-config.md) - EAS Build profiles, credentials, app store metadata
