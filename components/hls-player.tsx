"use client";

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export type HlsPlayerProps = {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onError?: (err: Error) => void;
};

/**
 * HLS video player using hls.js with native HLS fallback (Safari/iOS).
 * Pass `src` as a master.m3u8 URL. Works with S3/CloudFront URLs.
 */
export default function HlsPlayer({
  src,
  poster,
  autoPlay = false,
  muted = false,
  controls = true,
  className,
  onError,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const canUseNative = video.canPlayType("application/vnd.apple.mpegurl");

    // Cleanup helper
    const cleanup = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    // Initialize playback
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(src);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsReady(true);
        if (autoPlay) {
          video.play().catch(() => {});
        }
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data?.fatal && onError) onError(new Error(data?.details || "HLS fatal error"));
      });
    } else if (canUseNative) {
      // Safari / iOS
      video.src = src;
      setIsReady(true);
      if (autoPlay) {
        video.play().catch(() => {});
      }
    } else {
      onError?.(new Error("HLS not supported in this browser"));
    }

    return cleanup;
  }, [src, autoPlay, onError]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls={controls}
      muted={muted}
      playsInline
      className={className}
      style={{ width: "100%", height: "auto", backgroundColor: "#000" }}
    />
  );
}
