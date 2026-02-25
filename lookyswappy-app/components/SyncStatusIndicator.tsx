/**
 * SyncStatusIndicator Component
 *
 * Displays the current sync status with visual feedback.
 * Shows sync state, last sync time, and provides manual sync option.
 */

import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, useTheme, ActivityIndicator, IconButton } from 'react-native-paper'
import { useSync, formatLastSync } from '../hooks/useSync'
import type { SyncStatus } from '../services/sync'

interface SyncStatusIndicatorProps {
  /** Show detailed status with last sync time */
  detailed?: boolean
  /** Show sync button */
  showSyncButton?: boolean
  /** Compact mode for headers */
  compact?: boolean
}

const STATUS_CONFIG: Record<
  SyncStatus,
  { icon: string; color: string; label: string }
> = {
  idle: { icon: 'cloud-check', color: '#4CAF50', label: 'Synced' },
  syncing: { icon: 'cloud-sync', color: '#2196F3', label: 'Syncing...' },
  error: { icon: 'cloud-alert', color: '#F44336', label: 'Sync Error' },
  offline: { icon: 'cloud-off-outline', color: '#9E9E9E', label: 'Offline' },
}

export function SyncStatusIndicator({
  detailed = false,
  showSyncButton = true,
  compact = false,
}: SyncStatusIndicatorProps) {
  const theme = useTheme()
  const { status, sync, isSyncing, lastSyncedAt, online, lastError } = useSync({
    listenForNetworkChanges: true,
  })

  const config = STATUS_CONFIG[status]

  if (compact) {
    return (
      <TouchableOpacity
        onPress={sync}
        disabled={isSyncing || !online}
        style={styles.compactContainer}
      >
        {isSyncing ? (
          <ActivityIndicator size={16} color={config.color} />
        ) : (
          <IconButton
            icon={config.icon}
            iconColor={config.color}
            size={20}
            style={styles.compactIcon}
          />
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        {isSyncing ? (
          <ActivityIndicator size={20} color={config.color} />
        ) : (
          <IconButton
            icon={config.icon}
            iconColor={config.color}
            size={20}
            style={styles.icon}
          />
        )}
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.label}
        </Text>
        {showSyncButton && !isSyncing && online && (
          <IconButton
            icon="refresh"
            size={20}
            onPress={sync}
            style={styles.refreshButton}
          />
        )}
      </View>

      {detailed && (
        <View style={styles.detailsContainer}>
          <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
            {formatLastSync(lastSyncedAt)}
          </Text>
          {lastError && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {lastError}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    margin: 0,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  refreshButton: {
    margin: 0,
    marginLeft: 'auto',
  },
  detailsContainer: {
    marginTop: 4,
    paddingLeft: 28,
  },
  detailText: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 2,
  },
  compactContainer: {
    padding: 4,
  },
  compactIcon: {
    margin: 0,
  },
})
