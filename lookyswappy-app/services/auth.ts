/**
 * Authentication Service
 *
 * Handles device-based JWT authentication with the backend.
 * Uses SecureStore for persistent, encrypted token storage.
 */

import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { getApiEndpoint } from '../config'

// Storage keys
const STORAGE_KEYS = {
  DEVICE_ID: 'lookyswappy_device_id',
  AUTH_TOKEN: 'lookyswappy_auth_token',
  TOKEN_EXPIRY: 'lookyswappy_token_expiry',
} as const

// Types
interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  device: {
    id: string
    device_id: string
    first_seen: string
    last_seen: string
  }
}

interface AuthError {
  detail: string
}

// Generate a unique device ID
const generateDeviceId = (): string => {
  // Generate a UUID-like string
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  const randomPart2 = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${randomPart}-${randomPart2}`
}

/**
 * Check if running on a platform with secure storage.
 * Web platform doesn't have secure storage, so auth features are disabled.
 */
export function isSecureStorageAvailable(): boolean {
  return Platform.OS !== 'web'
}

/**
 * Secure storage wrapper.
 * Only works on native platforms (iOS/Android) where SecureStore is available.
 * Throws on web to prevent insecure localStorage usage for tokens.
 */
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // Device ID is non-sensitive, allow localStorage for it
      if (key === STORAGE_KEYS.DEVICE_ID) {
        return localStorage.getItem(key)
      }
      // Don't store sensitive data in localStorage (XSS vulnerability)
      return null
    }
    return SecureStore.getItemAsync(key)
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      // Device ID is non-sensitive, allow localStorage for it
      if (key === STORAGE_KEYS.DEVICE_ID) {
        localStorage.setItem(key, value)
        return
      }
      // Silently skip storing sensitive data on web
      console.warn('Auth tokens cannot be persisted on web platform (security)')
      return
    }
    await SecureStore.setItemAsync(key, value)
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (key === STORAGE_KEYS.DEVICE_ID) {
        localStorage.removeItem(key)
      }
      return
    }
    await SecureStore.deleteItemAsync(key)
  },
}

/**
 * Get or create a unique device identifier.
 * Creates one on first call, then persists it.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  let deviceId = await storage.getItem(STORAGE_KEYS.DEVICE_ID)

  if (!deviceId) {
    deviceId = generateDeviceId()
    await storage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId)
  }

  return deviceId
}

/**
 * Get the stored auth token if it exists and isn't expired.
 */
export async function getAuthToken(): Promise<string | null> {
  const token = await storage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  const expiryStr = await storage.getItem(STORAGE_KEYS.TOKEN_EXPIRY)

  if (!token || !expiryStr) {
    return null
  }

  const expiry = parseInt(expiryStr, 10)
  const now = Date.now()

  // Return null if token is expired
  if (now >= expiry) {
    await clearAuthToken()
    return null
  }

  return token
}

/**
 * Check if the token needs refreshing (approaching expiry).
 */
export async function shouldRefreshToken(): Promise<boolean> {
  const expiryStr = await storage.getItem(STORAGE_KEYS.TOKEN_EXPIRY)

  if (!expiryStr) {
    return true
  }

  const expiry = parseInt(expiryStr, 10)
  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  // Refresh if less than 7 days until expiry
  return expiry - now < sevenDaysMs
}

/**
 * Store the auth token and its expiry.
 */
async function storeAuthToken(token: string, expiresIn: number): Promise<void> {
  const expiryMs = Date.now() + expiresIn * 1000
  await storage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
  await storage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryMs.toString())
}

/**
 * Clear stored auth credentials.
 */
async function clearAuthToken(): Promise<void> {
  await storage.deleteItem(STORAGE_KEYS.AUTH_TOKEN)
  await storage.deleteItem(STORAGE_KEYS.TOKEN_EXPIRY)
}

/**
 * Register this device with the backend and get an auth token.
 * If already registered, returns a new token.
 */
export async function registerDevice(): Promise<string> {
  const deviceId = await getOrCreateDeviceId()

  const response = await fetch(getApiEndpoint('/auth/register-device'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ device_id: deviceId }),
  })

  if (!response.ok) {
    const error: AuthError = await response.json()
    throw new Error(`Device registration failed: ${error.detail}`)
  }

  const data: TokenResponse = await response.json()
  await storeAuthToken(data.access_token, data.expires_in)

  return data.access_token
}

/**
 * Refresh the auth token using the existing token.
 */
export async function refreshToken(): Promise<string> {
  const currentToken = await storage.getItem(STORAGE_KEYS.AUTH_TOKEN)

  if (!currentToken) {
    // No token to refresh, register instead
    return registerDevice()
  }

  const response = await fetch(getApiEndpoint('/auth/refresh'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${currentToken}`,
    },
  })

  if (!response.ok) {
    // Token invalid, re-register
    await clearAuthToken()
    return registerDevice()
  }

  const data: TokenResponse = await response.json()
  await storeAuthToken(data.access_token, data.expires_in)

  return data.access_token
}

/**
 * Ensure we have a valid auth token, registering/refreshing as needed.
 */
export async function ensureAuthToken(): Promise<string> {
  const token = await getAuthToken()

  if (token) {
    // Check if we should proactively refresh
    const needsRefresh = await shouldRefreshToken()
    if (needsRefresh) {
      try {
        return await refreshToken()
      } catch {
        // If refresh fails but we have a valid token, use it
        return token
      }
    }
    return token
  }

  // No valid token, register the device
  return registerDevice()
}

/**
 * Get authorization headers for API requests.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await ensureAuthToken()
  return {
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Clear all auth data (for logout/reset).
 */
export async function clearAuth(): Promise<void> {
  await clearAuthToken()
  // Note: We keep the device ID so the server can recognize this device
}
