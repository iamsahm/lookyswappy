# 02 - WatermelonDB Schema & Models

## Overview

Define the local database schema for offline-first storage using WatermelonDB.

---

## Schema Definition

### database/schema.ts

```typescript
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'games',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string', isOptional: true },
        { name: 'target_score', type: 'number' },
        { name: 'status', type: 'string' }, // 'active' | 'completed'
        { name: 'winner_id', type: 'string', isOptional: true },
        { name: 'started_at', type: 'number' },
        { name: 'ended_at', type: 'number', isOptional: true },
        { name: 'last_modified', type: 'number' },
        { name: 'is_synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'game_players',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'game_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'position', type: 'number' },
        { name: 'current_total', type: 'number' },
        { name: 'last_modified', type: 'number' },
        { name: 'is_synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'rounds',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'game_id', type: 'string', isIndexed: true },
        { name: 'round_number', type: 'number' },
        { name: 'caller_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'last_modified', type: 'number' },
        { name: 'is_synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'scores',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'round_id', type: 'string', isIndexed: true },
        { name: 'player_id', type: 'string', isIndexed: true },
        { name: 'raw_score', type: 'number' },
        { name: 'bonus_applied', type: 'number' },
        { name: 'final_score', type: 'number' },
        { name: 'total_after', type: 'number' },
        { name: 'last_modified', type: 'number' },
        { name: 'is_synced', type: 'boolean' },
      ],
    }),
  ],
})
```

---

## Model Classes

### database/models/Game.ts

```typescript
import { Model } from '@nozbe/watermelondb'
import { field, date, children, readonly } from '@nozbe/watermelondb/decorators'

export default class Game extends Model {
  static table = 'games'
  static associations = {
    game_players: { type: 'has_many', foreignKey: 'game_id' },
    rounds: { type: 'has_many', foreignKey: 'game_id' },
  }

  @field('server_id') serverId!: string | null
  @field('name') name!: string | null
  @field('target_score') targetScore!: number
  @field('status') status!: 'active' | 'completed'
  @field('winner_id') winnerId!: string | null
  @date('started_at') startedAt!: Date
  @date('ended_at') endedAt!: Date | null
  @date('last_modified') lastModified!: Date
  @field('is_synced') isSynced!: boolean

  @children('game_players') players!: any
  @children('rounds') rounds!: any
}
```

### database/models/GamePlayer.ts

```typescript
import { Model } from '@nozbe/watermelondb'
import { field, relation, date } from '@nozbe/watermelondb/decorators'

export default class GamePlayer extends Model {
  static table = 'game_players'
  static associations = {
    games: { type: 'belongs_to', key: 'game_id' },
    scores: { type: 'has_many', foreignKey: 'player_id' },
  }

  @field('server_id') serverId!: string | null
  @field('game_id') gameId!: string
  @field('name') name!: string
  @field('position') position!: number
  @field('current_total') currentTotal!: number
  @date('last_modified') lastModified!: Date
  @field('is_synced') isSynced!: boolean

  @relation('games', 'game_id') game!: any
}
```

### database/models/Round.ts

```typescript
import { Model } from '@nozbe/watermelondb'
import { field, relation, children, date } from '@nozbe/watermelondb/decorators'

export default class Round extends Model {
  static table = 'rounds'
  static associations = {
    games: { type: 'belongs_to', key: 'game_id' },
    scores: { type: 'has_many', foreignKey: 'round_id' },
  }

  @field('server_id') serverId!: string | null
  @field('game_id') gameId!: string
  @field('round_number') roundNumber!: number
  @field('caller_id') callerId!: string | null
  @date('created_at') createdAt!: Date
  @date('last_modified') lastModified!: Date
  @field('is_synced') isSynced!: boolean

  @relation('games', 'game_id') game!: any
  @children('scores') scores!: any
}
```

### database/models/Score.ts

```typescript
import { Model } from '@nozbe/watermelondb'
import { field, relation, date } from '@nozbe/watermelondb/decorators'

export default class Score extends Model {
  static table = 'scores'
  static associations = {
    rounds: { type: 'belongs_to', key: 'round_id' },
    game_players: { type: 'belongs_to', key: 'player_id' },
  }

  @field('server_id') serverId!: string | null
  @field('round_id') roundId!: string
  @field('player_id') playerId!: string
  @field('raw_score') rawScore!: number
  @field('bonus_applied') bonusApplied!: number
  @field('final_score') finalScore!: number
  @field('total_after') totalAfter!: number
  @date('last_modified') lastModified!: Date
  @field('is_synced') isSynced!: boolean

  @relation('rounds', 'round_id') round!: any
  @relation('game_players', 'player_id') player!: any
}
```

---

## Database Initialization

### database/index.ts

```typescript
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { schema } from './schema'
import Game from './models/Game'
import GamePlayer from './models/GamePlayer'
import Round from './models/Round'
import Score from './models/Score'

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'lookyswappy',
  jsi: true, // Use JSI for better performance (React Native only)
  onSetUpError: (error) => {
    console.error('Database setup error:', error)
  },
})

export const database = new Database({
  adapter,
  modelClasses: [Game, GamePlayer, Round, Score],
})

// Export collections for easy access
export const gamesCollection = database.get<Game>('games')
export const playersCollection = database.get<GamePlayer>('game_players')
export const roundsCollection = database.get<Round>('rounds')
export const scoresCollection = database.get<Score>('scores')
```

---

## Schema Diagram

```
┌─────────────┐       ┌──────────────┐
│   games     │       │ game_players │
├─────────────┤       ├──────────────┤
│ id          │◄──────│ game_id      │
│ server_id   │       │ id           │
│ name        │       │ server_id    │
│ target_score│       │ name         │
│ status      │       │ position     │
│ winner_id   │       │ current_total│
│ started_at  │       │ last_modified│
│ ended_at    │       │ is_synced    │
│ last_modified       └──────┬───────┘
│ is_synced   │              │
└──────┬──────┘              │
       │                     │
       │    ┌────────────┐   │
       │    │   rounds   │   │
       │    ├────────────┤   │
       └───►│ game_id    │   │
            │ id         │   │
            │ server_id  │   │
            │ round_number   │
            │ caller_id  │   │
            │ created_at │   │
            │ last_modified  │
            │ is_synced  │   │
            └─────┬──────┘   │
                  │          │
                  ▼          │
            ┌────────────┐   │
            │   scores   │   │
            ├────────────┤   │
            │ round_id   │◄──┘
            │ player_id  │
            │ id         │
            │ server_id  │
            │ raw_score  │
            │ bonus_applied
            │ final_score│
            │ total_after│
            │ last_modified
            │ is_synced  │
            └────────────┘
```

---

## Tasks

- [ ] Create schema.ts with all table definitions
- [ ] Create model classes with decorators
- [ ] Set up database initialization
- [ ] Test basic CRUD operations
- [ ] Verify relationships work correctly
