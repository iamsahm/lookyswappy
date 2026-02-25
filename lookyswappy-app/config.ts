/**
 * App Configuration
 *
 * Environment-specific settings for the app.
 */

import Constants from 'expo-constants'

// Get API URL from Expo constants or environment, with fallback for development
const getApiUrl = (): string => {
  // Check Expo constants first (set via app.config.js)
  const expoApiUrl = Constants.expoConfig?.extra?.apiUrl
  if (expoApiUrl) {
    return expoApiUrl
  }

  // Default to localhost for development
  // In production, this should be set via Expo constants
  return 'http://localhost:8000'
}

export const config = {
  apiUrl: getApiUrl(),
  apiVersion: 'v1',

  // Sync settings
  sync: {
    // Minimum interval between sync attempts (ms)
    minInterval: 30_000,
    // Retry delay after failed sync (ms)
    retryDelay: 5_000,
    // Maximum retries before giving up
    maxRetries: 3,
  },

  // Auth settings
  auth: {
    // Token refresh threshold (refresh if less than this many days until expiry)
    refreshThresholdDays: 7,
  },
}

export const getApiEndpoint = (path: string): string => {
  const baseUrl = config.apiUrl.replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}/api/${config.apiVersion}${cleanPath}`
}
