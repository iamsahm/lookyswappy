import { Model, Query, Relation } from '@nozbe/watermelondb'
import { field, relation, date, children } from '@nozbe/watermelondb/decorators'
import type Game from './Game'
import type Score from './Score'

export default class GamePlayer extends Model {
  static table = 'game_players'
  static associations = {
    games: { type: 'belongs_to' as const, key: 'game_id' },
    scores: { type: 'has_many' as const, foreignKey: 'player_id' },
  }

  @field('server_id') serverId!: string | null
  @field('game_id') gameId!: string
  @field('name') name!: string
  @field('position') position!: number
  @field('current_total') currentTotal!: number
  @date('last_modified') lastModified!: Date
  @field('is_synced') isSynced!: boolean

  @relation('games', 'game_id') game!: Relation<Game>
  @children('scores') scores!: Query<Score>
}
