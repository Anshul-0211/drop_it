-- Test seed file: Pre-link your Telegram ID for quick testing
-- Run this in Supabase SQL editor after running migration 003

-- Find or create a test user (replace test@example.com with your GitHub email)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Check if test user exists
  SELECT id INTO test_user_id FROM public.users 
  WHERE email = 'test@drop-it.local' LIMIT 1;
  
  -- If not exists, insert one
  IF test_user_id IS NULL THEN
    INSERT INTO public.users (email, name, telegram_user_id, created_at, updated_at)
    VALUES (
      'test@drop-it.local',
      'Test User',
      1387616783,
      NOW(),
      NOW()
    )
    RETURNING id INTO test_user_id;
    
    RAISE NOTICE 'Created test user: % with Telegram ID: %', test_user_id, 1387616783;
  ELSE
    -- Update existing user
    UPDATE public.users 
    SET telegram_user_id = 1387616783, updated_at = NOW()
    WHERE id = test_user_id;
    
    RAISE NOTICE 'Updated existing user: % with Telegram ID: %', test_user_id, 1387616783;
  END IF;
END $$;

-- Verify
SELECT id, email, telegram_user_id, created_at FROM public.users 
WHERE telegram_user_id = 1387616783;
