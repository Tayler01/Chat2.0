/*
  # Create push notification subscriptions table

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key) - Unique identifier for each subscription
      - `user_id` (uuid) - Reference to the user who owns this subscription
      - `subscription` (jsonb) - The push subscription object from the browser
      - `created_at` (timestamptz) - When the subscription was created

  2. Security
    - Enable RLS on `subscriptions` table
    - Add policy for users to manage their own subscriptions

  3. Indexes
    - Add index on user_id for efficient lookups
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions"
  ON subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);