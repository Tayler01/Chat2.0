/*
  # Create users table and authentication system

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique identifier for each user
      - `email` (text, unique) - User's email address for authentication
      - `username` (text, unique) - Display name/username
      - `avatar_url` (text) - URL to user's profile picture
      - `banner_url` (text) - URL to user's banner image
      - `avatar_color` (text) - Fallback color for avatar
      - `bio` (text) - User biography/description
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last profile update timestamp

  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read all profiles (public profiles)
    - Add policy for users to update their own profile
    - Add policy for authenticated users to insert their profile

  3. Indexes
    - Add index on username for efficient lookups
    - Add index on email for efficient lookups

  4. Functions
    - Create function to automatically create user profile on signup
*/

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  avatar_url text,
  banner_url text,
  avatar_color text NOT NULL DEFAULT '#3B82F6',
  bio text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Create function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, avatar_color)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_color', '#3B82F6')
  );
  RETURN new;
END;
$$ language plpgsql security definer;

-- Create trigger to call the function on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();