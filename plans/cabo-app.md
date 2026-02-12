# Cabo Scoring App - Implementation Plan

## Overview

A mobile scoring app for the card game Cabo with offline-first architecture. Works without internet, syncs to backend when online.

---

## Scoring Rules

- Track cumulative scores across rounds for any number of players
- Game ends when someone hits 100 points (configurable later)
- **Multiple of 25 bonus**: Landing on 25/50/75/100 gives -25 points
  - Exception: Not if already at 0 points
  - Exception: Not if got -25 last round AND would hit 0 again
- No penalty for calling Cabo without lowest hand

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
| Hosting | Railway or Render | Simple deployment |

---

## Data Models

### Local (WatermelonDB)

```
games
├── id (auto)
├── server_id (nullable, set after sync)
├── name (optional)
├── target_score (default 100)
├── status ('active' | 'completed')
├── winner_id (nullable)
├── started_at
├── ended_at (nullable)
├── last_modified
├── is_synced

game_players
├── id (auto)
├── server_id (nullable)
├── game_id (FK)
├── name
├── position (display order)
├── current_total (cached score)
├── last_modified
├── is_synced

rounds
├── id (auto)
├── server_id (nullable)
├── game_id (FK)
├── round_number
├── caller_id (nullable, who called Cabo)
├── created_at
├── last_modified
├── is_synced

scores
├── id (auto)
├── server_id (nullable)
├── round_id (FK)
├── player_id (FK)
├── raw_score (before bonus)
├── bonus_applied (-25 or 0)
├── final_score (raw + bonus)
├── total_after (running total)
├── last_modified
├── is_synced
```

### Server (PostgreSQL)

Same structure with:
- UUID primary keys
- `client_id` field mapping to WatermelonDB IDs
- `is_deleted` for soft deletes
- `last_modified` triggers for sync queries
- Optional `user_id` FKs for future accounts

---

## Authentication

**Device-based JWT** - no login required, but endpoints are protected.

```
1. First launch: app generates UUID, stores locally
2. POST /api/auth/register-device { device_id: "uuid" }
   → Backend creates device record, returns JWT (30-day expiry)
3. App stores JWT in secure storage
4. All requests include: Authorization: Bearer <token>
5. POST /api/auth/refresh before expiry to rotate token
```

Later enhancement: Add `POST /api/auth/claim-device` to link a device to a user account for multi-device access.

---

## Sync Strategy

**Approach**: Timestamp-based with conflict detection (WatermelonDB protocol)

### Pull (GET /api/sync/pull)
- Client sends `last_pulled_at` timestamp
- Server returns all changes since that time
- Response grouped by table: `{ created: [], updated: [], deleted: [] }`

### Push (POST /api/sync/push)
- Client sends local changes + `last_pulled_at`
- Server checks for conflicts (data modified since last pull)
- If conflict: reject, client must re-pull first
- If clean: apply changes

### Triggers
- On network reconnect
- On app foreground
- After local writes (debounced)

---

## Project Structure

### Frontend (`cabo-app/`)

```
cabo-app/
├── app/                      # Expo Router pages
│   ├── (tabs)/
│   │   ├── index.tsx         # Home/Active Games
│   │   ├── history.tsx       # Past games
│   │   └── stats.tsx         # Statistics
│   ├── game/
│   │   ├── [id]/
│   │   │   ├── index.tsx     # Scoreboard
│   │   │   └── add-round.tsx # Enter round scores
│   │   └── new.tsx           # Create game
│   └── _layout.tsx
├── components/
│   ├── game/
│   │   ├── PlayerList.tsx
│   │   ├── ScoreInput.tsx
│   │   ├── ScoreTable.tsx
│   │   └── BonusIndicator.tsx
│   └── ui/
├── database/
│   ├── index.ts              # DB initialization
│   ├── schema.ts             # WatermelonDB schema
│   └── models/               # Model classes
├── services/
│   ├── scoring.ts            # Bonus calculation logic
│   └── sync.ts               # Sync implementation
└── hooks/
    ├── useGame.ts
    └── useScoring.ts
```

### Backend (`cabo-api/`)

```
cabo-api/
├── app/
│   ├── main.py               # FastAPI entry
│   ├── config.py
│   ├── api/v1/
│   │   ├── auth.py           # register-device, refresh
│   │   ├── sync.py           # Pull/push endpoints
│   │   ├── games.py          # Optional REST
│   │   └── stats.py
│   ├── models/               # SQLAlchemy models
│   ├── schemas/              # Pydantic schemas
│   └── services/
│       └── sync_service.py
├── alembic/                  # Migrations
└── tests/
```

---

## Core Scoring Logic

```typescript
function calculateScore(context: {
  rawScore: number
  previousTotal: number
  gotBonusLastRound: boolean
}): {
  rawScore: number
  bonusApplied: number
  finalScore: number
  newTotal: number
} {
  const { rawScore, previousTotal, gotBonusLastRound } = context
  const potentialTotal = previousTotal + rawScore
  let bonusApplied = 0

  if (potentialTotal % 25 === 0 && potentialTotal > 0 && potentialTotal <= 100) {
    // Check exceptions
    if (previousTotal === 0) {
      bonusApplied = 0  // Already at 0, no bonus
    } else if (gotBonusLastRound && potentialTotal === 25) {
      bonusApplied = 0  // Would hit 0 after consecutive bonus
    } else {
      bonusApplied = -25
    }
  }

  return {
    rawScore,
    bonusApplied,
    finalScore: rawScore + bonusApplied,
    newTotal: Math.max(0, previousTotal + rawScore + bonusApplied),
  }
}
```

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
- [ ] Add tests for sync logic

### Phase 3: Sync Integration
- [ ] Integrate WatermelonDB sync on frontend
- [ ] Add network detection and sync triggers
- [ ] Handle conflict resolution
- [ ] Add sync status UI indicator

### Phase 4: Polish & Deploy
- [ ] Game history view
- [ ] Basic statistics
- [ ] Deploy backend (Railway/Render)
- [ ] Build and test on devices
- [ ] App store prep

### Future
- [ ] User accounts
- [ ] Cross-device sync
- [ ] Unlimited game mode
- [ ] Advanced stats/charts

---

## Key Files to Implement

1. `cabo-app/database/schema.ts` - WatermelonDB schema
2. `cabo-app/services/scoring.ts` - Bonus calculation logic
3. `cabo-app/services/sync.ts` - Sync implementation
4. `cabo-api/app/api/v1/sync.py` - Backend sync endpoints
5. `cabo-app/app/game/[id]/add-round.tsx` - Score entry screen

---

## Open Questions / Notes

_Add your notes here as you refine the plan:_

-
-
-

---

## TODO: Detailed Sub-Plans

Create detailed plans with pseudocode for each component before implementation:

### Frontend
- [ ] `plans/01-expo-setup.md` - Project scaffolding, dependencies, folder structure
- [ ] `plans/02-database-schema.md` - WatermelonDB schema, models, migrations
- [ ] `plans/03-scoring-logic.md` - Bonus calculation, edge cases, unit test cases
- [ ] `plans/04-screens-new-game.md` - Create game flow, player entry UI
- [ ] `plans/05-screens-scoreboard.md` - Score table, round history, current standings
- [ ] `plans/06-screens-add-round.md` - Score input per player, bonus preview, submit
- [ ] `plans/07-sync-client.md` - WatermelonDB sync setup, network detection, retry logic

### Backend
- [ ] `plans/08-fastapi-setup.md` - Project structure, config, database connection
- [ ] `plans/09-db-models.md` - SQLAlchemy models, Alembic migrations
- [ ] `plans/10-auth-endpoints.md` - Device registration, JWT issue/refresh, middleware
- [ ] `plans/11-sync-endpoints.md` - Pull/push logic, conflict detection, response format

### Integration
- [ ] `plans/12-end-to-end-flow.md` - Full data flow from score entry to sync to server
