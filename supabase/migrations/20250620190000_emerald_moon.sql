/*
  # Trim old group chat messages

  1. Function
    - Create `trim_old_group_messages` to keep only the 90 most recent rows
  2. Trigger
    - Invoke the function after each insert on `messages`
*/

-- Function to delete messages older than the newest 90
CREATE OR REPLACE FUNCTION public.trim_old_group_messages()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.messages
  WHERE id IN (
    SELECT id
    FROM public.messages
    ORDER BY created_at DESC, id DESC
    OFFSET 90
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to enforce the limit
DROP TRIGGER IF EXISTS trim_old_group_messages_trigger ON public.messages;
CREATE TRIGGER trim_old_group_messages_trigger
  AFTER INSERT ON public.messages
  EXECUTE FUNCTION public.trim_old_group_messages();
