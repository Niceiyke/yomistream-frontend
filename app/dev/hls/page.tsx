import React from "react";
import HlsPlayer from "../../../components/hls-player";

export default function Page({
  searchParams,
}: {
  searchParams: { src?: string; poster?: string; autoplay?: string; muted?: string };
}) {
  const src = searchParams?.src || "";
  const poster = searchParams?.poster;
  const autoPlay = (searchParams?.autoplay ?? "false").toLowerCase() === "true";
  const muted = (searchParams?.muted ?? "false").toLowerCase() === "true";

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">HLS Dev Player</h1>
      <p className="text-sm text-gray-500">
        Pass a master.m3u8 URL via <code>?src=</code>. Optional: <code>poster</code>, <code>autoplay</code>, <code>muted</code>.
      </p>
      <div className="rounded border p-4 bg-black/70">
        {src ? (
          <HlsPlayer src={src} poster={poster} autoPlay={autoPlay} muted={muted} />
        ) : (
          <div className="text-sm text-white/80">
            No <code>src</code> provided. Example:
            <pre className="mt-2 whitespace-pre-wrap break-all text-xs bg-black/40 p-2 rounded">
{`/dev/hls?src=${encodeURIComponent("https://example.cloudfront.net/path/to/master.m3u8")}&poster=${encodeURIComponent("https://example.com/thumb.jpg")}&autoplay=true&muted=true`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
