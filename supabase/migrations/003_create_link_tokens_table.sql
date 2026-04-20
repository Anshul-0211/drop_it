-- Create link_tokens table for temporary linking tokens
CREATE TABLE IF NOT EXISTS public.link_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token VARCHAR(48) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_link_tokens_token ON public.link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_link_tokens_expires_at ON public.link_tokens(expires_at);

-- Optional: Auto-delete expired tokens with a trigger
CREATE OR REPLACE FUNCTION public.delete_expired_link_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.link_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
