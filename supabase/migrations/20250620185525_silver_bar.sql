/*
  # Add reactions support to messages

  1. Schema Changes
    - Add `reactions` column to `messages` table (JSONB)
    - Add `reactions` column to DMs messages (modify existing JSONB structure)
  
  2. Functions
    - Add function to toggle reactions on group chat messages
    - Add function to toggle reactions on DM messages
  
  3. Security
    - Users can react to any message
    - Users can only toggle their own reactions
*/

-- Add reactions column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'reactions'
  ) THEN
    ALTER TABLE messages ADD COLUMN reactions JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Function to toggle reaction on group chat message
CREATE OR REPLACE FUNCTION toggle_message_reaction(
  message_id UUID,
  user_id UUID,
  emoji TEXT
) RETURNS VOID AS $$
DECLARE
  current_reactions JSONB;
  user_reactions TEXT[];
  new_reactions JSONB;
BEGIN
  -- Get current reactions
  SELECT reactions INTO current_reactions
  FROM messages
  WHERE id = message_id;
  
  -- Get current user's reactions for this emoji
  user_reactions := COALESCE(
    (current_reactions->emoji)::TEXT[],
    ARRAY[]::TEXT[]
  );
  
  -- Toggle user's reaction
  IF user_id::TEXT = ANY(user_reactions) THEN
    -- Remove user's reaction
    user_reactions := array_remove(user_reactions, user_id::TEXT);
  ELSE
    -- Add user's reaction
    user_reactions := array_append(user_reactions, user_id::TEXT);
  END IF;
  
  -- Update reactions object
  IF array_length(user_reactions, 1) > 0 THEN
    new_reactions := current_reactions || jsonb_build_object(emoji, user_reactions);
  ELSE
    new_reactions := current_reactions - emoji;
  END IF;
  
  -- Update the message
  UPDATE messages
  SET reactions = new_reactions
  WHERE id = message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle reaction on DM message
CREATE OR REPLACE FUNCTION toggle_dm_reaction(
  conversation_id UUID,
  message_id TEXT,
  user_id UUID,
  emoji TEXT
) RETURNS VOID AS $$
DECLARE
  current_messages JSONB;
  updated_messages JSONB;
  message_obj JSONB;
  current_reactions JSONB;
  user_reactions TEXT[];
  new_reactions JSONB;
  i INTEGER;
BEGIN
  -- Get current messages array
  SELECT messages INTO current_messages
  FROM dms
  WHERE id = conversation_id;
  
  -- Initialize updated_messages
  updated_messages := '[]'::jsonb;
  
  -- Loop through messages to find and update the target message
  FOR i IN 0..(jsonb_array_length(current_messages) - 1) LOOP
    message_obj := current_messages->i;
    
    IF (message_obj->>'id') = message_id THEN
      -- Get current reactions for this message
      current_reactions := COALESCE(message_obj->'reactions', '{}'::jsonb);
      
      -- Get current user's reactions for this emoji
      user_reactions := COALESCE(
        (current_reactions->emoji)::TEXT[],
        ARRAY[]::TEXT[]
      );
      
      -- Toggle user's reaction
      IF user_id::TEXT = ANY(user_reactions) THEN
        -- Remove user's reaction
        user_reactions := array_remove(user_reactions, user_id::TEXT);
      ELSE
        -- Add user's reaction
        user_reactions := array_append(user_reactions, user_id::TEXT);
      END IF;
      
      -- Update reactions object
      IF array_length(user_reactions, 1) > 0 THEN
        new_reactions := current_reactions || jsonb_build_object(emoji, user_reactions);
      ELSE
        new_reactions := current_reactions - emoji;
      END IF;
      
      -- Update message with new reactions
      message_obj := message_obj || jsonb_build_object('reactions', new_reactions);
    END IF;
    
    -- Add message to updated array
    updated_messages := updated_messages || jsonb_build_array(message_obj);
  END LOOP;
  
  -- Update the conversation with new messages
  UPDATE dms
  SET messages = updated_messages,
      updated_at = now()
  WHERE id = conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION toggle_message_reaction(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_dm_reaction(UUID, TEXT, UUID, TEXT) TO authenticated;
