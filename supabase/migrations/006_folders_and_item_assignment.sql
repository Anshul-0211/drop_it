-- Add user folders for organizing items.
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep folder names unique for active folders per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_user_name_active
  ON public.folders(user_id, lower(name))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_folders_user_position_active
  ON public.folders(user_id, position, created_at)
  WHERE deleted_at IS NULL;

-- Attach items to a folder (nullable for backward compatibility).
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_user_folder_created
  ON public.items(user_id, folder_id, created_at DESC);

-- Reuse shared updated_at trigger helper.
DROP TRIGGER IF EXISTS trg_folders_updated_at ON public.folders;
CREATE TRIGGER trg_folders_updated_at
BEFORE UPDATE ON public.folders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS folders_service_role_all ON public.folders;
CREATE POLICY folders_service_role_all ON public.folders
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
