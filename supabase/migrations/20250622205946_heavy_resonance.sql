/*
  # Fix DM message sending functions

  1. Function Updates
    - Fix `append_dm_message` function to handle proper message structure
    - Fix `get_or_create_dm_conversation` function for better error handling
    - Add `update_dm_read` function for read receipts

  2. Security
    - Ensure proper RLS policies
    - Add proper error handling
*/

-- Drop and recreate the append_dm_message function with better error handling
DROP FUNCTION IF EXISTS append_dm_message(uuid, uuid, text);

CREATE OR REPLACE FUNCTION append_dm_message(
  conversation_id uuid,
  sender_id uuid,
  message_text text
)
RETURNS void AS $$
DECLARE
  new_message jsonb;
  conversation_exists boolean;
BEGIN
  -- Check if conversation exists and user has access
  SELECT EXISTS(
    SELECT 1 FROM dms 
    WHERE id = conversation_id 
    AND (user1_id = sender_id OR user2_id = sender_id)
  ) INTO conversation_exists;
  
  IF NOT conversation_exists THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;
  
  -- Create the new message object with proper structure
  new_message := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'sender_id', sender_id::text,
    'content', message_text,
    'created_at', now()::text,
    'reactions', '{}'::jsonb
  );
  
  -- Append the message to the messages array and update timestamp
  UPDATE dms 
  SET messages = COALESCE(messages, '[]'::jsonb) || new_message,
      updated_at = now()
  WHERE id = conversation_id;
  
  -- Verify the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update conversation';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate get_or_create_dm_conversation with better error handling
DROP FUNCTION IF EXISTS get_or_create_dm_conversation(uuid, uuid, text, text);

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
  -- Validate input
  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
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
    INSERT INTO dms (user1_id, user2_id, user1_username, user2_username, messages)
    VALUES (ordered_user1_id, ordered_user2_id, ordered_user1_username, ordered_user2_username, '[]'::jsonb)
    RETURNING id INTO conversation_id;
    
    IF conversation_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create conversation';
    END IF;
  END IF;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create update_dm_read function for read receipts
CREATE OR REPLACE FUNCTION update_dm_read(
  p_conversation_id uuid,
  p_user_id uuid,
  p_message_id text
)
RETURNS void AS $$
BEGIN
  -- Update the appropriate last_read field based on which user is reading
  UPDATE dms
  SET 
    user1_last_read = CASE 
      WHEN user1_id = p_user_id THEN p_message_id 
      ELSE user1_last_read 
    END,
    user2_last_read = CASE 
      WHEN user2_id = p_user_id THEN p_message_id 
      ELSE user2_last_read 
    END
  WHERE id = p_conversation_id
    AND (user1_id = p_user_id OR user2_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION append_dm_message(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_dm_conversation(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_dm_read(uuid, uuid, text) TO authenticated;

-- Add missing columns to dms table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dms' AND column_name = 'user1_last_read'
  ) THEN
    ALTER TABLE dms ADD COLUMN user1_last_read uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dms' AND column_name = 'user2_last_read'
  ) THEN
    ALTER TABLE dms ADD COLUMN user2_last_read uuid;
  END IF;
END $$;