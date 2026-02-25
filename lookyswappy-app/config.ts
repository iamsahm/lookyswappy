/**
 * App Configuration
 *
 * Environment-specific settings for the app.
 */

import Constants from 'expo-constants'

// Get API URL from EAS environment or Expo constants
const getApiUrl = (): string => {
  // Check EAS build environment variable (set in eas.json)
  if (process.env.API_URL) {
    return process.env.API_URL
  }

  // Check Expo constants (set via app.config.js or extra)
  const expoApiUrl = Constants.expoConfig?.extra?.apiUrl
  if (expoApiUrl) {
    return expoApiUrl
  }

  // Default to localhost for development
  return 'http://localhost:8000'
}

// Get current app environment
export const getAppEnvironment = (): 'development' | 'preview' | 'production' => {
  const env = process.env.APP_ENV
  if (env === 'production' || env === 'preview') {
    return env
  }
  return 'development'
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
