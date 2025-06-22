/*
  # Add message read receipts

  This migration restores the message read receipts functionality that was
  previously discarded. It creates the `message_reads` table along with the
  `upsert_message_read` function and necessary policies.
*/

-- Create table for message read receipts
CREATE TABLE IF NOT EXISTS message_reads (
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own read receipts
CREATE POLICY "Users can insert read receipts" ON message_reads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow anyone to view read receipts
CREATE POLICY "Users can view read receipts" ON message_reads
  FOR SELECT USING (true);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS message_reads_message_id_idx ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS message_reads_user_id_idx ON message_reads(user_id);

-- Function to upsert a read receipt for a group message
CREATE OR REPLACE FUNCTION upsert_message_read(p_message_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO message_reads(message_id, user_id, read_at)
  VALUES (p_message_id, p_user_id, now())
  ON CONFLICT (message_id, user_id)
  DO UPDATE SET read_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_message_read(uuid, uuid) TO authenticated;
