/*
  # Restructure direct messages
  
  This migration normalizes direct messages into their own table instead of
  storing them as a JSON array in `dms`. Each message now has its own row for
  faster queries and realtime updates.

  1. New table `dm_messages`
     - `id` uuid primary key
     - `conversation_id` references dms(id)
     - `sender_id` references users(id)
     - `content` text
     - `reactions` jsonb
     - `created_at` timestamptz

  2. Remove `messages` column from `dms`

  3. Updated functions
     - `append_dm_message` inserts into `dm_messages`
     - `toggle_dm_reaction` updates reactions on `dm_messages`

  4. Row level security policies for `dm_messages`

  5. Trigger to bump `dms.updated_at` whenever a message is inserted or updated
*/

-- Create dm_messages table
CREATE TABLE IF NOT EXISTS dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES dms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  reactions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS dm_messages_conversation_idx
  ON dm_messages(conversation_id, created_at DESC);

-- Migrate existing messages from JSON array
INSERT INTO dm_messages (id, conversation_id, sender_id, content, reactions, created_at)
SELECT (msg->>'id')::uuid,
       d.id,
       (msg->>'sender_id')::uuid,
       msg->>'content',
       COALESCE(msg->'reactions', '{}'::jsonb),
       (msg->>'created_at')::timestamptz
FROM dms d,
     LATERAL jsonb_array_elements(d.messages) AS msg;

-- Remove old messages column
ALTER TABLE dms DROP COLUMN IF EXISTS messages;

-- Enable RLS
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

-- Allow participants to read messages
CREATE POLICY "Users can read DM messages" ON dm_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dms
      WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- Allow participants to insert messages
CREATE POLICY "Users can insert DM messages" ON dm_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM dms
      WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- Allow participants to update messages (for reactions)
CREATE POLICY "Users can update DM messages" ON dm_messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dms
      WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dms
      WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- Trigger to update conversation timestamp
CREATE OR REPLACE FUNCTION touch_dm_conversation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dms SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_dm_conversation_insert ON dm_messages;
CREATE TRIGGER touch_dm_conversation_insert
AFTER INSERT ON dm_messages
FOR EACH ROW EXECUTE FUNCTION touch_dm_conversation();

DROP TRIGGER IF EXISTS touch_dm_conversation_update ON dm_messages;
CREATE TRIGGER touch_dm_conversation_update
AFTER UPDATE ON dm_messages
FOR EACH ROW EXECUTE FUNCTION touch_dm_conversation();

-- Replace append_dm_message to insert into dm_messages
DROP FUNCTION IF EXISTS append_dm_message(uuid, uuid, text);
CREATE OR REPLACE FUNCTION append_dm_message(
  conversation_id uuid,
  sender_id uuid,
  message_text text
) RETURNS void AS $$
BEGIN
  INSERT INTO dm_messages (conversation_id, sender_id, content)
  VALUES (conversation_id, sender_id, message_text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace toggle_dm_reaction to operate on dm_messages
DROP FUNCTION IF EXISTS toggle_dm_reaction(uuid, text, uuid, text);
DROP FUNCTION IF EXISTS toggle_dm_reaction(uuid, uuid, text);
CREATE OR REPLACE FUNCTION toggle_dm_reaction(
  message_id uuid,
  user_id uuid,
  emoji text
) RETURNS void AS $$
DECLARE
  current_reactions jsonb;
  emoji_users jsonb;
  user_id_text text;
BEGIN
  user_id_text := user_id::text;
  SELECT reactions INTO current_reactions FROM dm_messages WHERE id = message_id;
  IF current_reactions IS NULL THEN
    current_reactions := '{}'::jsonb;
  END IF;
  emoji_users := current_reactions -> emoji;
  IF emoji_users IS NULL THEN
    emoji_users := '[]'::jsonb;
  END IF;
  IF emoji_users ? user_id_text THEN
    emoji_users := (
      SELECT COALESCE(jsonb_agg(u), '[]'::jsonb)
      FROM jsonb_array_elements_text(emoji_users) AS u
      WHERE u <> user_id_text
    );
    IF jsonb_array_length(emoji_users) = 0 THEN
      current_reactions := current_reactions - emoji;
    ELSE
      current_reactions := jsonb_set(current_reactions, ARRAY[emoji], emoji_users);
    END IF;
  ELSE
    emoji_users := emoji_users || jsonb_build_array(user_id_text);
    current_reactions := jsonb_set(current_reactions, ARRAY[emoji], emoji_users);
  END IF;
  UPDATE dm_messages SET reactions = current_reactions WHERE id = message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION append_dm_message(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_dm_reaction(uuid, uuid, text) TO authenticated;

