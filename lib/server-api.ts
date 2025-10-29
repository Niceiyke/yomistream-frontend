// Server-side API utilities for SSR
// CACHING STRATEGY:
// - Videos: Revalidate every 2 minutes (frequently updated content)
// - Preachers: Revalidate every 15 minutes (relatively stable)
// - Individual videos: Revalidate every 5 minutes (balance between freshness and performance)
//
// This prevents stale data while maintaining good performance.
// Use cache invalidation utilities in cache-utils.ts for immediate updates.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8002";

export async function serverApiGet(path: string, options?: { revalidate?: number }) {
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;

  console.log(`🔥 SERVER: Fetching ${path} from server-side`);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Smart caching based on content type
      next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
      // Fallback to no-cache in development
      cache: process.env.NODE_ENV === 'production' ? undefined : 'no-store',
    });

    if (!res.ok) {
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log(`✅ SERVER: Successfully fetched ${path}, got ${Array.isArray(data) ? data.length : 'non-array'} items`);
    return data;
  } catch (error) {
    console.error(`❌ SERVER: Error fetching ${path}:`, error);
    throw error;
  }
}

export async function fetchPublicVideos() {
  // Videos change frequently - revalidate every 2 minutes
  return serverApiGet("/api/v1/public/videos", { revalidate: 120 });
}

export async function fetchPublicPreachers() {
  // Preachers change less often - revalidate every 15 minutes
  return serverApiGet("/api/v1/public/preachers", { revalidate: 900 });
}

export async function fetchPreacher(preacherId: string) {
  // Preacher data is relatively stable - revalidate every 10 minutes
  return serverApiGet(`/api/v1/preachers/${preacherId}`, { revalidate: 600 });
}

export async function fetchVideo(videoId: string) {
  // Individual videos change moderately - revalidate every 5 minutes
  return serverApiGet(`/api/v1/videos/${videoId}`, { revalidate: 300 });
}
