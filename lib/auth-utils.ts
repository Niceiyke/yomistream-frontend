// lib/auth-utils.ts
/**
 * Authentication utility functions for token management
 */

import { API_BASE_URL } from '@/lib/api'
import { invalidateAuthCache } from '@/lib/auth-cache'

// Refresh token lock to prevent multiple simultaneous refresh attempts
let refreshPromise: Promise<string | null> | null = null

/**
 * Decode a JWT token without verification (client-side)
 * Only decodes the payload to check expiration
 */
function decodeJwtPayload(token: string): any | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode JWT token:', error)
    return null
  }
}

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.exp) {
    return true // Consider invalid tokens as expired
  }

  const currentTime = Math.floor(Date.now() / 1000)
  return payload.exp < currentTime
}

/**
 * Get the expiration time of a JWT token in milliseconds
 */
export function getTokenExpirationTime(token: string): number | null {
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.exp) {
    return null
  }
  return payload.exp * 1000 // Convert to milliseconds
}

/**
 * Check if a token is close to expiring (within specified minutes)
 */
export function isTokenExpiringSoon(token: string, minutesThreshold: number = 5): boolean {
  const expirationTime = getTokenExpirationTime(token)
  if (!expirationTime) {
    return true
  }

  const currentTime = Date.now()
  const thresholdTime = currentTime + (minutesThreshold * 60 * 1000)
  return expirationTime < thresholdTime
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null
    if (!refreshToken) {
      console.warn('No refresh token available')
      return null
    }

    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) {
      console.error('Token refresh failed with status:', res.status)
      return null
    }

    const data = await res.json()
    if (data.access_token) {
      // Store the new tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token)
        if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
        if (data.token_type) localStorage.setItem('token_type', data.token_type)
      }
      // Invalidate cache to force refresh
      invalidateAuthCache()
      return data.access_token
    }
  } catch (error) {
    console.error('Token refresh failed:', error)
  }
  return null
}

/**
 * Get a valid access token, refreshing if necessary
 */
async function getValidAccessToken(): Promise<string | null> {
  // Check if we have a token in localStorage
  let token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  if (!token) {
    return null
  }

  // Check if token is expired or expiring soon (within 2 minutes)
  if (isTokenExpiringSoon(token, 2)) {
    console.log('Token is expired or expiring soon, attempting refresh...')

    // If there's already a refresh in progress, wait for it
    if (refreshPromise) {
      console.log('Refresh already in progress, waiting...')
      token = await refreshPromise
    } else {
      // Start a new refresh
      refreshPromise = refreshAccessToken()
      token = await refreshPromise
      refreshPromise = null // Reset the promise
    }

    if (!token) {
      console.error('Failed to refresh token')
      return null
    }
  }

  return token
}

/**
 * Enhanced fetch with automatic token refresh
 */
export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // First attempt
  let token = await getValidAccessToken()

  const makeRequest = (authToken: string | null): RequestInit => ({
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  })

  let response = await fetch(input, makeRequest(token))

  // If we get a 401 and have a token, it might be expired - try refreshing once
  if (response.status === 401 && token) {
    console.log('Received 401, attempting token refresh and retry...')

    // Try to refresh the token
    const newToken = await refreshAccessToken()
    if (newToken) {
      // Retry the request with the new token
      response = await fetch(input, makeRequest(newToken))
    }
  }

  return response
}
