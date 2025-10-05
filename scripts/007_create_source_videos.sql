-- Create table to store external AIke channel source videos
CREATE TABLE IF NOT EXISTS public.source_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_video_id TEXT NOT NULL UNIQUE,
  channel_id TEXT,
  channel_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  published_at TIMESTAMP WITH TIME ZONE,
  language TEXT,
  tags TEXT[],
  raw_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helpful indexes for filtering
CREATE INDEX IF NOT EXISTS idx_source_videos_channel_id ON public.source_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_source_videos_published_at ON public.source_videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_videos_language ON public.source_videos(language);

-- Ensure raw metadata can be queried efficiently
CREATE INDEX IF NOT EXISTS idx_source_videos_raw_metadata ON public.source_videos USING GIN (raw_metadata);

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.set_source_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_source_videos_updated_at ON public.source_videos;
CREATE TRIGGER trg_source_videos_updated_at
BEFORE UPDATE ON public.source_videos
FOR EACH ROW
EXECUTE FUNCTION public.set_source_videos_updated_at();

-- Enable row level security and restrict access to service role by default
ALTER TABLE public.source_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS source_videos_service_role_access ON public.source_videos;
CREATE POLICY source_videos_service_role_access
ON public.source_videos
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
