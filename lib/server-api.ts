// Server-side API utilities for SSR
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8002";

export async function serverApiGet(path: string) {
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;

  console.log(`🔥 SERVER: Fetching ${path} from server-side`);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Don't cache in development for fresh data
      cache: process.env.NODE_ENV === 'production' ? 'default' : 'no-store',
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
  return serverApiGet("/api/v1/public/videos");
}

export async function fetchPublicPreachers() {
  return serverApiGet("/api/v1/public/preachers");
}

export async function fetchVideo(videoId: string) {
  return serverApiGet(`/api/v1/videos/${videoId}`);
}
