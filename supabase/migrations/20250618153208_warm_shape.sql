/*
  # Create DMs table for direct message conversations

  1. New Tables
    - `dms`
      - `id` (uuid, primary key)
      - `user1_id` (uuid, references users.id)
      - `user2_id` (uuid, references users.id)
      - `user1_username` (text)
      - `user2_username` (text)
      - `messages` (jsonb array for storing messages)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `dms` table
    - Add policies for users to read/write only their own conversations
    - Add constraint to ensure user1_id < user2_id for consistent ordering

  3. Indexes
    - Index on user1_id and user2_id for fast lookups
    - Index on updated_at for ordering conversations
*/

CREATE TABLE IF NOT EXISTS dms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user1_username text NOT NULL,
  user2_username text NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT dms_user_order CHECK (user1_id < user2_id)
);

-- Enable RLS
ALTER TABLE dms ENABLE ROW LEVEL SECURITY;

-- Create policies for users to access their own conversations
CREATE POLICY "Users can read their own DM conversations"
  ON dms
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert DM conversations they are part of"
  ON dms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own DM conversations"
  ON dms
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS dms_user1_id_idx ON dms(user1_id);
CREATE INDEX IF NOT EXISTS dms_user2_id_idx ON dms(user2_id);
CREATE INDEX IF NOT EXISTS dms_updated_at_idx ON dms(updated_at DESC);
CREATE INDEX IF NOT EXISTS dms_users_idx ON dms(user1_id, user2_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dms_updated_at
  BEFORE UPDATE ON dms
  FOR EACH ROW
  EXECUTE FUNCTION update_dms_updated_at();

-- Create function to append message to conversation
CREATE OR REPLACE FUNCTION append_dm_message(
  conversation_id uuid,
  sender_id uuid,
  message_text text
)
RETURNS void AS $$
DECLARE
  new_message jsonb;
BEGIN
  -- Create the new message object
  new_message := jsonb_build_object(
    'id', gen_random_uuid(),
    'sender_id', sender_id,
    'content', message_text,
    'created_at', now()
  );
  
  -- Append the message to the messages array
  UPDATE dms 
  SET messages = messages || new_message,
      updated_at = now()
  WHERE id = conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_dm_conversation(
  current_user_id uuid,
  other_user_id uuid,
  current_username text,
  other_username text
)
RETURNS uuid AS $$
DECLARE
  conversation_id uuid;
  ordered_user1_id uuid;
  ordered_user2_id uuid;
  ordered_user1_username text;
  ordered_user2_username text;
BEGIN
  -- Ensure consistent ordering (smaller UUID first)
  IF current_user_id < other_user_id THEN
    ordered_user1_id := current_user_id;
    ordered_user2_id := other_user_id;
    ordered_user1_username := current_username;
    ordered_user2_username := other_username;
  ELSE
    ordered_user1_id := other_user_id;
    ordered_user2_id := current_user_id;
    ordered_user1_username := other_username;
    ordered_user2_username := current_username;
  END IF;
  
  -- Try to find existing conversation
  SELECT id INTO conversation_id
  FROM dms
  WHERE user1_id = ordered_user1_id AND user2_id = ordered_user2_id;
  
  -- If not found, create new conversation
  IF conversation_id IS NULL THEN
    INSERT INTO dms (user1_id, user2_id, user1_username, user2_username)
    VALUES (ordered_user1_id, ordered_user2_id, ordered_user1_username, ordered_user2_username)
    RETURNING id INTO conversation_id;
  END IF;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;