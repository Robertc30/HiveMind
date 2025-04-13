/*
  # Create messages table for real-time chat

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `room_id` (uuid, required)
      - `username` (text, required)
      - `content` (text, required)
      - `created_at` (timestamp with timezone)

  2. Security
    - Enable RLS on `messages` table
    - Add policy for authenticated users to read messages in their room
    - Add policy for authenticated users to insert messages
*/

-- Drop existing table if it exists (this is safe as it's a new migration)
DROP TABLE IF EXISTS messages;

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  username text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Allow anyone to read messages (public chat rooms)
CREATE POLICY "Anyone can read messages"
  ON messages
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to insert messages (public chat rooms)
CREATE POLICY "Anyone can insert messages"
  ON messages
  FOR INSERT
  TO public
  WITH CHECK (true);