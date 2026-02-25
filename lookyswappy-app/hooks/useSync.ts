/**
 * useSync Hook
 *
 * Provides sync functionality and status to React components.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  syncDatabase,
  SyncStatus,
  addSyncStatusListener,
  startNetworkListener,
  stopNetworkListener,
  getLastSyncTimestamp,
  isOnline,
} from '../services/sync'
import { config } from '../config'

interface UseSyncOptions {
  /** Auto-sync on mount */
  autoSync?: boolean
  /** Auto-sync interval in ms (0 to disable) */
  syncInterval?: number
  /** Start network listener for auto-sync on connectivity change */
  listenForNetworkChanges?: boolean
}

interface UseSyncReturn {
  /** Current sync status */
  status: SyncStatus
  /** Trigger a manual sync */
  sync: () => Promise<void>
  /** Whether sync is in progress */
  isSyncing: boolean
  /** Last successful sync timestamp (0 if never synced) */
  lastSyncedAt: number
  /** Whether device is online */
  online: boolean
  /** Error message from last sync attempt (if any) */
  lastError: string | null
}

/**
 * Hook for managing database sync in components.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { status, sync, isSyncing, lastSyncedAt } = useSync({ autoSync: true })
 *
 *   return (
 *     <View>
 *       <Text>Status: {status}</Text>
 *       <Button onPress={sync} disabled={isSyncing}>
 *         Sync Now
 *       </Button>
 *     </View>
 *   )
 * }
 * ```
 */
export function useSync(options: UseSyncOptions = {}): UseSyncReturn {
  const {
    autoSync = false,
    syncInterval = 0,
    listenForNetworkChanges = true,
  } = options

  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(getLastSyncTimestamp())
  const [online, setOnline] = useState<boolean>(true)
  const [lastError, setLastError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Subscribe to status changes
  useEffect(() => {
    const unsubscribe = addSyncStatusListener((newStatus) => {
      setStatus(newStatus)
      if (newStatus === 'idle') {
        setLastSyncedAt(getLastSyncTimestamp())
        setLastError(null)
      } else if (newStatus === 'offline') {
        setOnline(false)
      }
    })

    return unsubscribe
  }, [])

  // Check online status
  useEffect(() => {
    const checkOnline = async () => {
      const isOnlineNow = await isOnline()
      setOnline(isOnlineNow)
    }
    checkOnline()
  }, [status])

  // Start network listener
  useEffect(() => {
    if (listenForNetworkChanges) {
      startNetworkListener()
      return () => stopNetworkListener()
    }
  }, [listenForNetworkChanges])

  // Manual sync function
  const sync = useCallback(async () => {
    const result = await syncDatabase()
    if (!result.success && result.error) {
      setLastError(result.error)
    }
    if (result.timestamp) {
      setLastSyncedAt(result.timestamp)
    }
  }, [])

  // Auto-sync on mount
  useEffect(() => {
    if (autoSync) {
      sync()
    }
  }, [autoSync, sync])

  // Periodic sync interval
  useEffect(() => {
    if (syncInterval > 0) {
      intervalRef.current = setInterval(() => {
        // Only sync if not already syncing and enough time has passed
        const timeSinceLastSync = Date.now() - lastSyncedAt
        if (timeSinceLastSync >= config.sync.minInterval) {
          sync()
        }
      }, syncInterval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [syncInterval, lastSyncedAt, sync])

  return {
    status,
    sync,
    isSyncing: status === 'syncing',
    lastSyncedAt,
    online,
    lastError,
  }
}

/**
 * Format the last sync time for display.
 */
export function formatLastSync(timestamp: number): string {
  if (timestamp === 0) {
    return 'Never synced'
  }

  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60_000) {
    return 'Just now'
  }

  if (diff < 3_600_000) {
    const minutes = Math.floor(diff / 60_000)
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  if (diff < 86_400_000) {
    const hours = Math.floor(diff / 3_600_000)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  const days = Math.floor(diff / 86_400_000)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
