-- Add saved/trash lifecycle support for dashboard sections.
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS is_saved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Keep active-item and trash queries fast.
CREATE INDEX IF NOT EXISTS idx_items_user_deleted_at ON public.items(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_items_user_saved_status_created ON public.items(user_id, is_saved, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_user_active_created ON public.items(user_id, created_at DESC) WHERE deleted_at IS NULL;

-- Purges trashed rows older than 7 days.
CREATE OR REPLACE FUNCTION public.purge_expired_trashed_items(target_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.items
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '7 days'
    AND (target_user_id IS NULL OR user_id = target_user_id);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional scheduling (run manually in Supabase SQL editor if pg_cron is available):
-- SELECT cron.schedule(
--   'purge-expired-trashed-items-daily',
--   '0 0 * * *',
--   $$SELECT public.purge_expired_trashed_items(NULL);$$
-- );
