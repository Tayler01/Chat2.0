/*
  # Add message read receipts

  1. Create `message_reads` table for group chat read receipts
  2. Add per-user last read columns to `dms` table for DM receipts
  3. Functions to update read state
*/

-- Create table for message read receipts
CREATE TABLE IF NOT EXISTS message_reads (
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert read receipts" ON message_reads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view read receipts" ON message_reads
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS message_reads_message_id_idx ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS message_reads_user_id_idx ON message_reads(user_id);

-- Add DM last read columns if they do not exist
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

-- Upsert group message read receipt
CREATE OR REPLACE FUNCTION upsert_message_read(p_message_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO message_reads(message_id, user_id, read_at)
  VALUES (p_message_id, p_user_id, now())
  ON CONFLICT (message_id, user_id)
  DO UPDATE SET read_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update DM read state
CREATE OR REPLACE FUNCTION update_dm_read(
  p_conversation_id uuid,
  p_user_id uuid,
  p_message_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE dms
  SET user1_last_read = CASE WHEN user1_id = p_user_id THEN p_message_id ELSE user1_last_read END,
      user2_last_read = CASE WHEN user2_id = p_user_id THEN p_message_id ELSE user2_last_read END
  WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_message_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_dm_read(uuid, uuid, uuid) TO authenticated;
