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
