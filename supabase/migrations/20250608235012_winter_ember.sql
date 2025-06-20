/*
  # Create messages table for chat application

  1. New Tables
    - `messages`
      - `id` (uuid, primary key) - Unique identifier for each message
      - `content` (text) - The message content
      - `user_name` (text) - Display name of the user who sent the message
      - `user_id` (text) - Unique identifier for the user
      - `avatar_color` (text) - Color code for the user's avatar
      - `created_at` (timestamptz) - Timestamp when the message was created

  2. Security
    - Enable RLS on `messages` table
    - Add policy for anyone to read messages (public chat)
    - Add policy for anyone to insert messages (public chat)

  3. Indexes
    - Add index on created_at for efficient ordering
*/

-- Create the messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  user_name text NOT NULL,
  user_id text NOT NULL,
  avatar_color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this appears to be a public chat)
CREATE POLICY "Anyone can read messages"
  ON messages
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert messages"
  ON messages
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Add index for efficient ordering by creation time
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);