/*
  # Move DM messages to separate table

  1. Tables
    - Create dm_messages table
      - id uuid primary key
      - conversation_id uuid references dms(id) on delete cascade
      - sender_id uuid references users(id)
      - content text
      - created_at timestamptz default now()
      - reactions jsonb default '{}'
    - Index on conversation_id
    - Index on created_at

  2. Functions
    - Update append_dm_message and toggle_dm_reaction to use dm_messages
*/

-- Create table for DM messages
CREATE TABLE IF NOT EXISTS dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES dms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reactions jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS dm_messages_conversation_id_idx ON dm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS dm_messages_created_at_idx ON dm_messages(created_at DESC);

-- Replace append_dm_message to insert into dm_messages
DROP FUNCTION IF EXISTS append_dm_message(uuid, uuid, text);
CREATE OR REPLACE FUNCTION append_dm_message(
  conversation_id uuid,
  sender_id uuid,
  message_text text
)
RETURNS void AS $$
BEGIN
  INSERT INTO dm_messages (conversation_id, sender_id, content)
  VALUES (conversation_id, sender_id, message_text);
  UPDATE dms SET updated_at = now() WHERE id = conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace toggle_dm_reaction for new table structure
DROP FUNCTION IF EXISTS toggle_dm_reaction(uuid, text, text, text);
CREATE OR REPLACE FUNCTION toggle_dm_reaction(
  conversation_id uuid,
  message_id uuid,
  user_id uuid,
  emoji text
) RETURNS void AS $$
DECLARE
  current_reactions jsonb;
  emoji_users jsonb;
  user_exists boolean;
BEGIN
  SELECT COALESCE(reactions, '{}'::jsonb) INTO current_reactions
  FROM dm_messages
  WHERE id = message_id AND conversation_id = conversation_id;

  emoji_users := COALESCE(current_reactions -> emoji, '[]'::jsonb);

  SELECT EXISTS(
    SELECT 1 FROM jsonb_array_elements_text(emoji_users) AS u
    WHERE u = user_id::text
  ) INTO user_exists;

  IF user_exists THEN
    emoji_users := (
      SELECT COALESCE(jsonb_agg(u), '[]'::jsonb)
      FROM jsonb_array_elements_text(emoji_users) AS u
      WHERE u <> user_id::text
    );
    IF jsonb_array_length(emoji_users) = 0 THEN
      current_reactions := current_reactions - emoji;
    ELSE
      current_reactions := jsonb_set(current_reactions, ARRAY[emoji], emoji_users);
    END IF;
  ELSE
    emoji_users := emoji_users || jsonb_build_array(user_id::text);
    current_reactions := jsonb_set(current_reactions, ARRAY[emoji], emoji_users);
  END IF;

  UPDATE dm_messages
  SET reactions = current_reactions
  WHERE id = message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION append_dm_message(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_dm_reaction(uuid, uuid, uuid, text) TO authenticated;
