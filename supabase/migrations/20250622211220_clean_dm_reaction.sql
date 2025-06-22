/*
  # Remove outdated DM reaction function

  Drop the old toggle_dm_reaction function that used a UUID for user_id.
  Re-grant execute permission on the remaining version that accepts text
  parameters so authenticated users can continue to toggle reactions.
*/

DROP FUNCTION IF EXISTS public.toggle_dm_reaction(uuid, text, uuid, text);

-- Re-grant execute privileges on the current function
GRANT EXECUTE ON FUNCTION toggle_dm_reaction(uuid, text, text, text) TO authenticated;
