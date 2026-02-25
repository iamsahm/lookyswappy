/**
 * Sync Service
 *
 * Handles synchronization between local WatermelonDB and backend API.
 * Implements WatermelonDB's sync protocol with pull/push operations.
 */

import { synchronize, SyncPullArgs, SyncPushArgs } from '@nozbe/watermelondb/sync'
import NetInfo from '@react-native-community/netinfo'
import { database } from '../database'
import { getApiEndpoint, config } from '../config'
import { getAuthHeaders, ensureAuthToken } from './auth'

// Types for sync data matching backend schemas
interface GameSyncData {
  id: string
  name: string | null
  target_score: number
  status: string
  winner_id: string | null
  started_at: string
  ended_at: string | null
}

interface GamePlayerSyncData {
  id: string
  game_id: string
  name: string
  position: number
  current_total: number
}

interface RoundSyncData {
  id: string
  game_id: string
  round_number: number
  caller_id: string | null
  created_at: string
}

interface ScoreSyncData {
  id: string
  round_id: string
  player_id: string
  raw_score: number
  bonus_applied: number
  final_score: number
  total_after: number
}

interface TableChanges<T> {
  created: T[]
  updated: T[]
  deleted: string[]
}

interface SyncChanges {
  games: TableChanges<GameSyncData>
  game_players: TableChanges<GamePlayerSyncData>
  rounds: TableChanges<RoundSyncData>
  scores: TableChanges<ScoreSyncData>
}

interface PullResponse {
  changes: SyncChanges
  timestamp: number
}

interface PushResponse {
  ok: boolean
  errors: string[]
}

// Sync state tracking
let lastSyncTimestamp = 0
let isSyncing = false
let syncRetryCount = 0

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

interface SyncResult {
  success: boolean
  timestamp?: number
  error?: string
}

// Event listeners for sync status changes
type SyncStatusListener = (status: SyncStatus) => void
const statusListeners: Set<SyncStatusListener> = new Set()

let currentStatus: SyncStatus = 'idle'

function setStatus(status: SyncStatus): void {
  currentStatus = status
  statusListeners.forEach((listener) => listener(status))
}

export function addSyncStatusListener(listener: SyncStatusListener): () => void {
  statusListeners.add(listener)
  // Immediately call with current status
  listener(currentStatus)
  return () => statusListeners.delete(listener)
}

export function getSyncStatus(): SyncStatus {
  return currentStatus
}

/**
 * Check if the device has network connectivity.
 */
export async function isOnline(): Promise<boolean> {
  const netInfo = await NetInfo.fetch()
  return netInfo.isConnected === true && netInfo.isInternetReachable !== false
}

/**
 * Transform WatermelonDB record to API format for push.
 */
function transformForPush(
  tableName: string,
  record: Record<string, unknown>
): Record<string, unknown> {
  // WatermelonDB uses camelCase, API expects snake_case
  const transformed: Record<string, unknown> = { id: record.id }

  switch (tableName) {
    case 'games':
      transformed.name = record.name
      transformed.target_score = record.targetScore ?? record.target_score
      transformed.status = record.status
      transformed.winner_id = record.winnerId ?? record.winner_id
      transformed.started_at = record.startedAt ?? record.started_at
      transformed.ended_at = record.endedAt ?? record.ended_at
      break

    case 'game_players':
      transformed.game_id = record.gameId ?? record.game_id
      transformed.name = record.name
      transformed.position = record.position
      transformed.current_total = record.currentTotal ?? record.current_total
      break

    case 'rounds':
      transformed.game_id = record.gameId ?? record.game_id
      transformed.round_number = record.roundNumber ?? record.round_number
      transformed.caller_id = record.callerId ?? record.caller_id
      transformed.created_at = record.createdAt ?? record.created_at
      break

    case 'scores':
      transformed.round_id = record.roundId ?? record.round_id
      transformed.player_id = record.playerId ?? record.player_id
      transformed.raw_score = record.rawScore ?? record.raw_score
      transformed.bonus_applied = record.bonusApplied ?? record.bonus_applied
      transformed.final_score = record.finalScore ?? record.final_score
      transformed.total_after = record.totalAfter ?? record.total_after
      break
  }

  return transformed
}

/**
 * Transform API response to WatermelonDB format for pull.
 */
function transformFromPull(
  tableName: string,
  record: Record<string, unknown>
): Record<string, unknown> {
  // API uses snake_case, WatermelonDB expects camelCase (but schema uses snake_case column names)
  // Since our schema uses snake_case column names, we mostly pass through
  const transformed: Record<string, unknown> = { id: record.id }

  switch (tableName) {
    case 'games':
      transformed.name = record.name
      transformed.target_score = record.target_score
      transformed.status = record.status
      transformed.winner_id = record.winner_id
      transformed.started_at =
        typeof record.started_at === 'string'
          ? new Date(record.started_at).getTime()
          : record.started_at
      transformed.ended_at = record.ended_at
        ? typeof record.ended_at === 'string'
          ? new Date(record.ended_at).getTime()
          : record.ended_at
        : null
      transformed.last_modified = Date.now()
      transformed.is_synced = true
      break

    case 'game_players':
      transformed.game_id = record.game_id
      transformed.name = record.name
      transformed.position = record.position
      transformed.current_total = record.current_total
      transformed.last_modified = Date.now()
      transformed.is_synced = true
      break

    case 'rounds':
      transformed.game_id = record.game_id
      transformed.round_number = record.round_number
      transformed.caller_id = record.caller_id
      transformed.created_at =
        typeof record.created_at === 'string'
          ? new Date(record.created_at).getTime()
          : record.created_at
      transformed.last_modified = Date.now()
      transformed.is_synced = true
      break

    case 'scores':
      transformed.round_id = record.round_id
      transformed.player_id = record.player_id
      transformed.raw_score = record.raw_score
      transformed.bonus_applied = record.bonus_applied
      transformed.final_score = record.final_score
      transformed.total_after = record.total_after
      transformed.last_modified = Date.now()
      transformed.is_synced = true
      break
  }

  return transformed
}

/**
 * Pull changes from the server.
 */
async function pullChanges(args: SyncPullArgs): Promise<{
  changes: Record<
    string,
    { created: Record<string, unknown>[]; updated: Record<string, unknown>[]; deleted: string[] }
  >
  timestamp: number
}> {
  const { lastPulledAt } = args

  // Ensure we have auth
  await ensureAuthToken()
  const headers = await getAuthHeaders()

  const url = `${getApiEndpoint('/sync/pull')}?last_pulled_at=${lastPulledAt ?? 0}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Pull failed: ${response.status} - ${errorText}`)
  }

  const data: PullResponse = await response.json()

  // Transform to WatermelonDB format
  const changes: Record<
    string,
    { created: Record<string, unknown>[]; updated: Record<string, unknown>[]; deleted: string[] }
  > = {
    games: {
      created: data.changes.games.created.map((r) =>
        transformFromPull('games', r as unknown as Record<string, unknown>)
      ),
      updated: data.changes.games.updated.map((r) =>
        transformFromPull('games', r as unknown as Record<string, unknown>)
      ),
      deleted: data.changes.games.deleted,
    },
    game_players: {
      created: data.changes.game_players.created.map((r) =>
        transformFromPull('game_players', r as unknown as Record<string, unknown>)
      ),
      updated: data.changes.game_players.updated.map((r) =>
        transformFromPull('game_players', r as unknown as Record<string, unknown>)
      ),
      deleted: data.changes.game_players.deleted,
    },
    rounds: {
      created: data.changes.rounds.created.map((r) =>
        transformFromPull('rounds', r as unknown as Record<string, unknown>)
      ),
      updated: data.changes.rounds.updated.map((r) =>
        transformFromPull('rounds', r as unknown as Record<string, unknown>)
      ),
      deleted: data.changes.rounds.deleted,
    },
    scores: {
      created: data.changes.scores.created.map((r) =>
        transformFromPull('scores', r as unknown as Record<string, unknown>)
      ),
      updated: data.changes.scores.updated.map((r) =>
        transformFromPull('scores', r as unknown as Record<string, unknown>)
      ),
      deleted: data.changes.scores.deleted,
    },
  }

  return {
    changes,
    timestamp: data.timestamp,
  }
}

// Helper to safely get table changes from the sync change set
function getTableChanges(
  changes: Record<string, { created?: unknown[]; updated?: unknown[]; deleted?: string[] }>,
  tableName: string
): { created: unknown[]; updated: unknown[]; deleted: string[] } {
  const tableChanges = changes[tableName]
  return {
    created: tableChanges?.created ?? [],
    updated: tableChanges?.updated ?? [],
    deleted: tableChanges?.deleted ?? [],
  }
}

/**
 * Push local changes to the server.
 */
async function pushChanges(args: SyncPushArgs): Promise<void> {
  const { changes, lastPulledAt } = args

  // Ensure we have auth
  await ensureAuthToken()
  const headers = await getAuthHeaders()

  // Cast changes to allow indexing by table name
  const changesMap = changes as unknown as Record<
    string,
    { created?: unknown[]; updated?: unknown[]; deleted?: string[] }
  >

  // Transform changes to API format
  const gamesChanges = getTableChanges(changesMap, 'games')
  const playersChanges = getTableChanges(changesMap, 'game_players')
  const roundsChanges = getTableChanges(changesMap, 'rounds')
  const scoresChanges = getTableChanges(changesMap, 'scores')

  const apiChanges: SyncChanges = {
    games: {
      created: gamesChanges.created.map(
        (r) => transformForPush('games', r as Record<string, unknown>) as unknown as GameSyncData
      ),
      updated: gamesChanges.updated.map(
        (r) => transformForPush('games', r as Record<string, unknown>) as unknown as GameSyncData
      ),
      deleted: gamesChanges.deleted,
    },
    game_players: {
      created: playersChanges.created.map(
        (r) =>
          transformForPush('game_players', r as Record<string, unknown>) as unknown as GamePlayerSyncData
      ),
      updated: playersChanges.updated.map(
        (r) =>
          transformForPush('game_players', r as Record<string, unknown>) as unknown as GamePlayerSyncData
      ),
      deleted: playersChanges.deleted,
    },
    rounds: {
      created: roundsChanges.created.map(
        (r) => transformForPush('rounds', r as Record<string, unknown>) as unknown as RoundSyncData
      ),
      updated: roundsChanges.updated.map(
        (r) => transformForPush('rounds', r as Record<string, unknown>) as unknown as RoundSyncData
      ),
      deleted: roundsChanges.deleted,
    },
    scores: {
      created: scoresChanges.created.map(
        (r) => transformForPush('scores', r as Record<string, unknown>) as unknown as ScoreSyncData
      ),
      updated: scoresChanges.updated.map(
        (r) => transformForPush('scores', r as Record<string, unknown>) as unknown as ScoreSyncData
      ),
      deleted: scoresChanges.deleted,
    },
  }

  const response = await fetch(getApiEndpoint('/sync/push'), {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      changes: apiChanges,
      last_pulled_at: lastPulledAt ?? 0,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Push failed: ${response.status} - ${errorText}`)
  }

  const data: PushResponse = await response.json()

  if (!data.ok) {
    throw new Error(`Push rejected: ${data.errors.join(', ')}`)
  }
}

/**
 * Perform a full database sync with the server.
 */
export async function syncDatabase(): Promise<SyncResult> {
  // Prevent concurrent syncs
  if (isSyncing) {
    return { success: false, error: 'Sync already in progress' }
  }

  // Check network connectivity
  const online = await isOnline()
  if (!online) {
    setStatus('offline')
    return { success: false, error: 'No network connection' }
  }

  isSyncing = true
  setStatus('syncing')

  try {
    await synchronize({
      database,
      pullChanges,
      pushChanges,
      migrationsEnabledAtVersion: 1,
    })

    // Success
    syncRetryCount = 0
    lastSyncTimestamp = Date.now()
    setStatus('idle')

    return { success: true, timestamp: lastSyncTimestamp }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'

    // Handle retries
    syncRetryCount++
    if (syncRetryCount < config.sync.maxRetries) {
      // Schedule retry
      setTimeout(() => {
        syncDatabase()
      }, config.sync.retryDelay)
    }

    setStatus('error')
    return { success: false, error: errorMessage }
  } finally {
    isSyncing = false
  }
}

/**
 * Get the timestamp of the last successful sync.
 */
export function getLastSyncTimestamp(): number {
  return lastSyncTimestamp
}

/**
 * Check if a sync is currently in progress.
 */
export function isSyncInProgress(): boolean {
  return isSyncing
}

// Network state change handler
let unsubscribeNetInfo: (() => void) | null = null

/**
 * Start listening for network changes and auto-sync when coming online.
 */
export function startNetworkListener(): void {
  if (unsubscribeNetInfo) return

  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      // Coming online - trigger sync if we haven't synced recently
      const timeSinceLastSync = Date.now() - lastSyncTimestamp
      if (timeSinceLastSync > config.sync.minInterval) {
        syncDatabase()
      }
      setStatus('idle')
    } else {
      setStatus('offline')
    }
  })
}

/**
 * Stop the network listener.
 */
export function stopNetworkListener(): void {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo()
    unsubscribeNetInfo = null
  }
}
