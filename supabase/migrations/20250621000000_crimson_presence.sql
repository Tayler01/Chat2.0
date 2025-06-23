/*
  # Track user presence

  1. Schema
    - Add `last_active` timestamptz column to `users` with default `now()`
    - Index on `last_active` for quick lookups

  2. Function
    - `update_user_last_active` sets the column for the current auth user
    - Grant execute permission to `authenticated`
*/

-- Add last_active column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE users ADD COLUMN last_active timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS users_last_active_idx ON users(last_active DESC);

-- RPC to update current user's last_active
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS void AS $$
BEGIN
  UPDATE users SET last_active = now() WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_user_last_active() TO authenticated;
