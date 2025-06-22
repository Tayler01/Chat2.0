/*
  # Fix toggle_message_reaction function overloading

  1. Problem
    - Multiple `toggle_message_reaction` functions exist with conflicting parameter types
    - One has `user_id` as `text`, another as `uuid`
    - This creates ambiguity that prevents Supabase from choosing the correct function

  2. Solution
    - Drop all existing `toggle_message_reaction` functions
    - Create a single function with proper `uuid` type for `user_id`
    - Ensure the function properly handles message reactions in JSONB format

  3. Function Behavior
    - Toggles a user's reaction on a message
    - If user hasn't reacted with that emoji, adds the reaction
    - If user has already reacted with that emoji, removes the reaction
    - Updates the `reactions` JSONB column in the `messages` table
*/

-- Drop all existing toggle_message_reaction functions to resolve overloading
DROP FUNCTION IF EXISTS public.toggle_message_reaction(uuid, text, text);
DROP FUNCTION IF EXISTS public.toggle_message_reaction(uuid, uuid, text);

-- Create the correct function with proper parameter types
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(
  message_id uuid,
  user_id uuid,
  emoji text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_reactions jsonb;
  emoji_users jsonb;
  user_id_text text;
BEGIN
  -- Convert UUID to text for JSON operations
  user_id_text := user_id::text;
  
  -- Get current reactions for the message
  SELECT reactions INTO current_reactions
  FROM messages
  WHERE id = message_id;
  
  -- Initialize reactions if null
  IF current_reactions IS NULL THEN
    current_reactions := '{}'::jsonb;
  END IF;
  
  -- Get current users for this emoji
  emoji_users := current_reactions -> emoji;
  
  -- Initialize emoji array if it doesn't exist
  IF emoji_users IS NULL THEN
    emoji_users := '[]'::jsonb;
  END IF;
  
  -- Check if user has already reacted with this emoji
  IF emoji_users ? user_id_text THEN
    -- Remove user from emoji reactions
    emoji_users := emoji_users - user_id_text;
    
    -- If no users left for this emoji, remove the emoji entirely
    IF jsonb_array_length(emoji_users) = 0 THEN
      current_reactions := current_reactions - emoji;
    ELSE
      current_reactions := jsonb_set(current_reactions, ARRAY[emoji], emoji_users);
    END IF;
  ELSE
    -- Add user to emoji reactions
    emoji_users := emoji_users || jsonb_build_array(user_id_text);
    current_reactions := jsonb_set(current_reactions, ARRAY[emoji], emoji_users);
  END IF;
  
  -- Update the message with new reactions
  UPDATE messages
  SET reactions = current_reactions
  WHERE id = message_id;
END;
$$;
