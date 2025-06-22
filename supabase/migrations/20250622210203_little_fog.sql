/*
  # Fix update_dm_read function conflict

  1. Problem
    - Multiple `update_dm_read` functions exist with conflicting parameter types
    - PostgREST cannot determine which function to call due to ambiguity
    - One function expects `p_message_id` as `text`, another as `uuid`

  2. Solution
    - Drop all existing `update_dm_read` functions
    - Create a single, properly defined function with correct parameter types
    - Message IDs should be `uuid` type to match the messages table schema

  3. Function Purpose
    - Updates the last read message for a user in a DM conversation
    - Used to track read receipts in direct messages
*/

-- Drop all existing update_dm_read functions to resolve conflicts
DROP FUNCTION IF EXISTS public.update_dm_read(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.update_dm_read(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.update_dm_read(p_conversation_id uuid, p_user_id uuid, p_message_id text);
DROP FUNCTION IF EXISTS public.update_dm_read(p_conversation_id uuid, p_user_id uuid, p_message_id uuid);

-- Create the correct update_dm_read function
CREATE OR REPLACE FUNCTION public.update_dm_read(
  p_conversation_id uuid,
  p_user_id uuid,
  p_message_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the appropriate last_read field based on which user is calling
  UPDATE public.dms
  SET 
    user1_last_read = CASE 
      WHEN user1_id = p_user_id THEN p_message_id 
      ELSE user1_last_read 
    END,
    user2_last_read = CASE 
      WHEN user2_id = p_user_id THEN p_message_id 
      ELSE user2_last_read 
    END,
    updated_at = now()
  WHERE id = p_conversation_id
    AND (user1_id = p_user_id OR user2_id = p_user_id);
END;
$$;