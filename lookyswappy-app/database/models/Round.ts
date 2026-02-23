import { Model, Query, Relation } from '@nozbe/watermelondb'
import { field, relation, children, date } from '@nozbe/watermelondb/decorators'
import type Game from './Game'
import type Score from './Score'

export default class Round extends Model {
  static table = 'rounds'
  static associations = {
    games: { type: 'belongs_to' as const, key: 'game_id' },
    scores: { type: 'has_many' as const, foreignKey: 'round_id' },
  }

  @field('server_id') serverId!: string | null
  @field('game_id') gameId!: string
  @field('round_number') roundNumber!: number
  @field('caller_id') callerId!: string | null
  @date('created_at') createdAt!: Date
  @date('last_modified') lastModified!: Date
  @field('is_synced') isSynced!: boolean

  @relation('games', 'game_id') game!: Relation<Game>
  @children('scores') scores!: Query<Score>
}
