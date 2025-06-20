/*
  # Update messages table policies for authenticated users

  1. Changes
    - Remove old public policies
    - Add new policies requiring authentication for INSERT
    - Keep SELECT public for anyone to read messages
    - Ensure users can only insert messages with their own user_id

  2. Security
    - Anyone can read messages (public chat)
    - Only authenticated users can insert messages
    - Users can only insert messages with their own authenticated user_id
*/

-- Drop existing policies
DROP POLICY IF EXISTS "All users can read messages" ON messages;
DROP POLICY IF EXISTS "Allow public insert access to messages" ON messages;
DROP POLICY IF EXISTS "Allow public read access to messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert their own messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can read messages" ON messages;

-- Create new policies
-- Anyone can read messages (public chat)
CREATE POLICY "Anyone can read messages"
  ON messages
  FOR SELECT
  TO public
  USING (true);

-- Only authenticated users can insert messages with their own user_id
CREATE POLICY "Authenticated users can insert their own messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);