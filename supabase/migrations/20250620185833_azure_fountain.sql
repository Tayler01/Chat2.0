/*
  # Fix reaction toggle functions

  This migration fixes the JSONB casting errors in the reaction toggle functions.
  The functions now properly handle JSONB operations without attempting to cast to text[].

  1. Functions Updated
    - `toggle_message_reaction` - Fixed JSONB handling for messages table
    - `toggle_dm_reaction` - Fixed JSONB handling for DMs table
  
  2. Changes Made
    - Use proper JSONB operators and functions
    - Handle null reactions properly
    - Use JSONB array operations instead of text array casting
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS toggle_message_reaction(uuid, text, text);
DROP FUNCTION IF EXISTS toggle_dm_reaction(uuid, text, text, text);

-- Create or replace the toggle_message_reaction function
CREATE OR REPLACE FUNCTION toggle_message_reaction(
  message_id uuid,
  user_id text,
  emoji text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_reactions jsonb;
  emoji_users jsonb;
  user_exists boolean;
BEGIN
  -- Get current reactions for the message
  SELECT COALESCE(reactions, '{}'::jsonb) INTO current_reactions
  FROM messages 
  WHERE id = message_id;
  
  -- Get current users for this emoji (default to empty array if not exists)
  emoji_users := COALESCE(current_reactions -> emoji, '[]'::jsonb);
  
  -- Check if user already reacted with this emoji
  SELECT EXISTS(
    SELECT 1 FROM jsonb_array_elements_text(emoji_users) AS user_elem
    WHERE user_elem = user_id
  ) INTO user_exists;
  
  IF user_exists THEN
    -- Remove user from emoji reactions
    emoji_users := (
      SELECT jsonb_agg(user_elem)
      FROM jsonb_array_elements_text(emoji_users) AS user_elem
      WHERE user_elem != user_id
    );
    
    -- If no users left for this emoji, remove the emoji entirely
    IF jsonb_array_length(COALESCE(emoji_users, '[]'::jsonb)) = 0 THEN
      current_reactions := current_reactions - emoji;
    ELSE
      current_reactions := jsonb_set(current_reactions, ARRAY[emoji], emoji_users);
    END IF;
  ELSE
    -- Add user to emoji reactions
    emoji_users := emoji_users || jsonb_build_array(user_id);
    current_reactions := jsonb_set(current_reactions, ARRAY[emoji], emoji_users);
  END IF;
  
  -- Update the message with new reactions
  UPDATE messages 
  SET reactions = current_reactions
  WHERE id = message_id;
END;
$$;

-- Create or replace the toggle_dm_reaction function
CREATE OR REPLACE FUNCTION toggle_dm_reaction(
  conversation_id uuid,
  message_id text,
  user_id text,
  emoji text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_messages jsonb;
  updated_messages jsonb;
  message_obj jsonb;
  current_reactions jsonb;
  emoji_users jsonb;
  user_exists boolean;
  i integer;
BEGIN
  -- Get current messages array
  SELECT COALESCE(messages, '[]'::jsonb) INTO current_messages
  FROM dms 
  WHERE id = conversation_id;
  
  -- Initialize updated_messages as empty array
  updated_messages := '[]'::jsonb;
  
  -- Loop through messages to find and update the target message
  FOR i IN 0..jsonb_array_length(current_messages) - 1 LOOP
    message_obj := current_messages -> i;
    
    -- Check if this is the message we want to update
    IF message_obj ->> 'id' = message_id THEN
      -- Get current reactions for this message
      current_reactions := COALESCE(message_obj -> 'reactions', '{}'::jsonb);
      
      -- Get current users for this emoji
      emoji_users := COALESCE(current_reactions -> emoji, '[]'::jsonb);
      
      -- Check if user already reacted with this emoji
      SELECT EXISTS(
        SELECT 1 FROM jsonb_array_elements_text(emoji_users) AS user_elem
        WHERE user_elem = user_id
      ) INTO user_exists;
      
      IF user_exists THEN
        -- Remove user from emoji reactions
        emoji_users := (
          SELECT COALESCE(jsonb_agg(user_elem), '[]'::jsonb)
          FROM jsonb_array_elements_text(emoji_users) AS user_elem
          WHERE user_elem != user_id
        );
        
        -- If no users left for this emoji, remove the emoji entirely
        IF jsonb_array_length(emoji_users) = 0 THEN
          current_reactions := current_reactions - emoji;
        ELSE
          current_reactions := jsonb_set(current_reactions, ARRAY[emoji], emoji_users);
        END IF;
      ELSE
        -- Add user to emoji reactions
        emoji_users := emoji_users || jsonb_build_array(user_id);
        current_reactions := jsonb_set(current_reactions, ARRAY[emoji], emoji_users);
      END IF;
      
      -- Update the message object with new reactions
      message_obj := jsonb_set(message_obj, '{reactions}', current_reactions);
    END IF;
    
    -- Add message to updated array
    updated_messages := updated_messages || jsonb_build_array(message_obj);
  END LOOP;
  
  -- Update the conversation with new messages array
  UPDATE dms 
  SET messages = updated_messages,
      updated_at = now()
  WHERE id = conversation_id;
END;
$$;