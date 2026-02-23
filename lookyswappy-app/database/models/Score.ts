import { Model, Relation } from '@nozbe/watermelondb'
import { field, relation, date } from '@nozbe/watermelondb/decorators'
import type Round from './Round'
import type GamePlayer from './GamePlayer'

export default class Score extends Model {
  static table = 'scores'
  static associations = {
    rounds: { type: 'belongs_to' as const, key: 'round_id' },
    game_players: { type: 'belongs_to' as const, key: 'player_id' },
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

  @relation('rounds', 'round_id') round!: Relation<Round>
  @relation('game_players', 'player_id') player!: Relation<GamePlayer>
}
