-- ============================================================
-- Migration: Add view_count to destinations table
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add the view_count column (default 0)
ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 2. Create an index for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_destinations_view_count
ON destinations(view_count DESC)
WHERE is_active = true;

-- 3. Create a Postgres function for atomic increment
--    This avoids race conditions when multiple users view simultaneously
CREATE OR REPLACE FUNCTION increment_destination_view(dest_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE destinations
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = dest_id
    RETURNING view_count INTO new_count;

    RETURN new_count;
END;
$$;
