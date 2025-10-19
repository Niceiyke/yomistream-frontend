// lib/auth-cache.ts
// Simple in-memory cache. Resets on page reload.
let tokenCache: { value: string | undefined; expiresAt: number } = {
  value: undefined,
  expiresAt: 0,
}

const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function getSessionCached(ttlMs: number = DEFAULT_TTL_MS) {
  // Backwards-compatible shape for callers expecting { session: { access_token } }
  const accessToken = await getAccessTokenCached(ttlMs)
  return { session: accessToken ? { access_token: accessToken } : null }
}

export async function getAccessTokenCached(ttlMs: number = DEFAULT_TTL_MS): Promise<string | undefined> {
  const now = Date.now()
  if (tokenCache.value && tokenCache.expiresAt > now) return tokenCache.value
  let token: string | undefined
  try {
    token = typeof window !== "undefined" ? localStorage.getItem("access_token") || undefined : undefined
  } catch {
    token = undefined
  }
  tokenCache = { value: token, expiresAt: now + ttlMs }
  return token
}

// Allow other modules to invalidate cache when auth state changes
export function invalidateAuthCache() {
  tokenCache = { value: undefined, expiresAt: 0 }
}
