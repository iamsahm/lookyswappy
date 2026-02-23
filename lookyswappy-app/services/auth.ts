/**
 * Authentication Service
 *
 * Handles device-based JWT authentication with the backend.
 * See SDR-13 for backend implementation, SDR-15 for frontend integration.
 */

// TODO: Implement auth service (SDR-15)
// import * as SecureStore from 'expo-secure-store'

export async function getOrCreateDeviceId(): Promise<string> {
  throw new Error('Not implemented - see SDR-15')
}

export async function getAuthToken(): Promise<string | null> {
  throw new Error('Not implemented - see SDR-15')
}

export async function registerDevice(): Promise<string> {
  throw new Error('Not implemented - see SDR-15')
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  throw new Error('Not implemented - see SDR-15')
}
