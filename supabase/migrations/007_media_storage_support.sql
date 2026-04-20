-- Media storage support: enrich file metadata and prepare document storage bucket.
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS file_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT,
  ADD COLUMN IF NOT EXISTS storage_provider TEXT;

CREATE INDEX IF NOT EXISTS idx_items_storage_provider ON public.items(storage_provider);
CREATE INDEX IF NOT EXISTS idx_items_file_mime_type ON public.items(file_mime_type);

-- Document bucket for Supabase Storage (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Service-role write access to documents bucket
DROP POLICY IF EXISTS documents_service_role_insert ON storage.objects;
CREATE POLICY documents_service_role_insert ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS documents_service_role_update ON storage.objects;
CREATE POLICY documents_service_role_update ON storage.objects
FOR UPDATE
USING (bucket_id = 'documents' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS documents_service_role_select ON storage.objects;
CREATE POLICY documents_service_role_select ON storage.objects
FOR SELECT
USING (bucket_id = 'documents' AND auth.role() = 'service_role');
