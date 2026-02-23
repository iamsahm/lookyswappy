import { Model, Query } from '@nozbe/watermelondb'
import { field, date, children } from '@nozbe/watermelondb/decorators'
import type GamePlayer from './GamePlayer'
import type Round from './Round'

export type GameStatus = 'active' | 'completed'

export default class Game extends Model {
  static table = 'games'
  static associations = {
    game_players: { type: 'has_many' as const, foreignKey: 'game_id' },
    rounds: { type: 'has_many' as const, foreignKey: 'game_id' },
  }

  @field('server_id') serverId!: string | null
  @field('name') name!: string | null
  @field('target_score') targetScore!: number
  @field('status') status!: GameStatus
  @field('winner_id') winnerId!: string | null
  @date('started_at') startedAt!: Date
  @date('ended_at') endedAt!: Date | null
  @date('last_modified') lastModified!: Date
  @field('is_synced') isSynced!: boolean

  @children('game_players') players!: Query<GamePlayer>
  @children('rounds') rounds!: Query<Round>
}
