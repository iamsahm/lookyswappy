/**
 * Auth Service Tests
 *
 * Tests for device authentication and token management.
 * Uses mocks since we can't hit the actual API in unit tests.
 */

// Mock expo-secure-store
const mockStorage: Record<string, string> = {}
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStorage[key] = value
    return Promise.resolve()
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockStorage[key]
    return Promise.resolve()
  }),
}))

// Mock config
jest.mock('../../config', () => ({
  config: {
    apiUrl: 'http://localhost:8000',
    apiVersion: 'v1',
    sync: {
      minInterval: 30000,
      retryDelay: 5000,
      maxRetries: 3,
    },
    auth: {
      refreshThresholdDays: 7,
    },
  },
  getApiEndpoint: (path: string) => `http://localhost:8000/api/v1${path}`,
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}))

// Import after mocks are set up
import {
  getOrCreateDeviceId,
  getAuthToken,
  registerDevice,
  getAuthHeaders,
  clearAuth,
  shouldRefreshToken,
} from '../auth'
import * as SecureStore from 'expo-secure-store'

describe('Auth Service', () => {
  beforeEach(() => {
    // Clear storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
    jest.clearAllMocks()
  })

  describe('getOrCreateDeviceId', () => {
    it('generates a new device ID if none exists', async () => {
      const deviceId = await getOrCreateDeviceId()

      expect(deviceId).toBeDefined()
      expect(deviceId.length).toBeGreaterThan(10)
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'lookyswappy_device_id',
        deviceId
      )
    })

    it('returns existing device ID if one exists', async () => {
      mockStorage['lookyswappy_device_id'] = 'existing-device-123'

      const deviceId = await getOrCreateDeviceId()

      expect(deviceId).toBe('existing-device-123')
      // Should not have set a new ID
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled()
    })
  })

  describe('getAuthToken', () => {
    it('returns null if no token exists', async () => {
      const token = await getAuthToken()
      expect(token).toBeNull()
    })

    it('returns token if valid and not expired', async () => {
      const futureExpiry = Date.now() + 86400000 // 1 day from now
      mockStorage['lookyswappy_auth_token'] = 'valid-token-123'
      mockStorage['lookyswappy_token_expiry'] = futureExpiry.toString()

      const token = await getAuthToken()

      expect(token).toBe('valid-token-123')
    })

    it('returns null and clears if token is expired', async () => {
      const pastExpiry = Date.now() - 86400000 // 1 day ago
      mockStorage['lookyswappy_auth_token'] = 'expired-token'
      mockStorage['lookyswappy_token_expiry'] = pastExpiry.toString()

      const token = await getAuthToken()

      expect(token).toBeNull()
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'lookyswappy_auth_token'
      )
    })
  })

  describe('shouldRefreshToken', () => {
    it('returns true if no token exists', async () => {
      const shouldRefresh = await shouldRefreshToken()
      expect(shouldRefresh).toBe(true)
    })

    it('returns true if token expires within 7 days', async () => {
      const expiryIn5Days = Date.now() + 5 * 24 * 60 * 60 * 1000
      mockStorage['lookyswappy_token_expiry'] = expiryIn5Days.toString()

      const shouldRefresh = await shouldRefreshToken()

      expect(shouldRefresh).toBe(true)
    })

    it('returns false if token expires after 7 days', async () => {
      const expiryIn10Days = Date.now() + 10 * 24 * 60 * 60 * 1000
      mockStorage['lookyswappy_token_expiry'] = expiryIn10Days.toString()

      const shouldRefresh = await shouldRefreshToken()

      expect(shouldRefresh).toBe(false)
    })
  })

  describe('registerDevice', () => {
    it('registers device and stores token', async () => {
      const mockResponse = {
        access_token: 'new-token-456',
        token_type: 'bearer',
        expires_in: 2592000, // 30 days
        device: {
          id: 'uuid-123',
          device_id: 'device-123',
          first_seen: '2024-01-01T00:00:00Z',
          last_seen: '2024-01-01T00:00:00Z',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const token = await registerDevice()

      expect(token).toBe('new-token-456')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register-device'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'lookyswappy_auth_token',
        'new-token-456'
      )
    })

    it('throws error on failed registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: 'Registration failed' }),
      })

      await expect(registerDevice()).rejects.toThrow('Device registration failed')
    })
  })

  describe('getAuthHeaders', () => {
    it('returns authorization header with valid token', async () => {
      const futureExpiry = Date.now() + 86400000
      mockStorage['lookyswappy_auth_token'] = 'valid-token'
      mockStorage['lookyswappy_token_expiry'] = futureExpiry.toString()

      const headers = await getAuthHeaders()

      expect(headers).toEqual({
        Authorization: 'Bearer valid-token',
      })
    })
  })

  describe('clearAuth', () => {
    it('clears token but keeps device ID', async () => {
      mockStorage['lookyswappy_device_id'] = 'device-123'
      mockStorage['lookyswappy_auth_token'] = 'token-123'
      mockStorage['lookyswappy_token_expiry'] = '123456789'

      await clearAuth()

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'lookyswappy_auth_token'
      )
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'lookyswappy_token_expiry'
      )
      // Device ID should NOT be deleted
      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalledWith(
        'lookyswappy_device_id'
      )
    })
  })
})
