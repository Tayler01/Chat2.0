/*
  # Prune old messages after insert

  1. Trigger Function
    - `prune_old_messages` deletes oldest rows when `messages` exceeds 100 entries
    - Keeps only the 100 newest messages based on `created_at`

  2. Trigger
    - Runs after each insert into `messages`
    - Created only if it does not already exist
*/

-- Create or replace the pruning function
CREATE OR REPLACE FUNCTION prune_old_messages()
RETURNS TRIGGER AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT count(*) INTO total_count FROM messages;

  IF total_count > 100 THEN
    DELETE FROM messages
    WHERE id IN (
      SELECT id FROM messages
      ORDER BY created_at ASC
      OFFSET 100
    );
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists once
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'prune_old_messages_trigger'
  ) THEN
    CREATE TRIGGER prune_old_messages_trigger
      AFTER INSERT ON messages
      FOR EACH STATEMENT
      EXECUTE FUNCTION prune_old_messages();
  END IF;
END $$;
