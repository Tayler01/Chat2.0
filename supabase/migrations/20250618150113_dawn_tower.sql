/*
  # Add avatar_url column to messages table

  1. Changes
    - Add `avatar_url` column to `messages` table to store user profile pictures
    - Column is nullable since existing messages won't have this field
    - This allows messages to display user profile pictures when available

  2. Notes
    - Existing messages will have NULL avatar_url and will fall back to avatar_color display
    - New messages will include the user's current avatar_url when sent
*/

-- Add avatar_url column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE messages ADD COLUMN avatar_url text;
  END IF;
END $$;