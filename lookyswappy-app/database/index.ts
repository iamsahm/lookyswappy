import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { schema } from './schema'
import { Game, GamePlayer, Round, Score } from './models'

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'lookyswappy',
  jsi: true,
  onSetUpError: (error) => {
    console.error('Database setup error:', error)
  },
})

export const database = new Database({
  adapter,
  modelClasses: [Game, GamePlayer, Round, Score],
})

export const gamesCollection = database.get<Game>('games')
export const playersCollection = database.get<GamePlayer>('game_players')
export const roundsCollection = database.get<Round>('rounds')
export const scoresCollection = database.get<Score>('scores')

export { Game, GamePlayer, Round, Score }
export type { GameStatus } from './models'
