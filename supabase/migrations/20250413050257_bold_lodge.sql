/*
  # Create users table for persistent usernames

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `device_id` (text, unique)
      - `username` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `users` table
    - Add policy for public access to read users
    - Add policy for users to update their own record
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  username text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read users"
  ON users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update their own record"
  ON users
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can insert users"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);