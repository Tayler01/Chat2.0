/*
  # Keep messages table fully public

  1. Security Changes
    - Ensure messages table allows public read and write access
    - Remove any authentication requirements for messages
    - Keep authentication only for web app user management

  This ensures other devices can continue to access messages without authentication
  while the web app requires user accounts for access control.
*/

-- Remove any restrictive policies on messages table
DROP POLICY IF EXISTS "Authenticated users can insert their own messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;

-- Ensure public access policies exist
DO $$
BEGIN
  -- Check if public read policy exists, create if not
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Allow public read access to messages'
  ) THEN
    CREATE POLICY "Allow public read access to messages"
      ON messages
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  -- Check if public insert policy exists, create if not
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Allow public insert access to messages'
  ) THEN
    CREATE POLICY "Allow public insert access to messages"
      ON messages
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;