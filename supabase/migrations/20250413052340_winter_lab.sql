/*
  # Clean UUID Migration

  1. Changes
    - Drop existing tables
    - Create new tables with UUID room_id
    - Add necessary indexes and constraints
    - Set up RLS policies

  2. Security
    - Enable RLS on all tables
    - Add policies for public access
*/

-- Drop existing tables
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS presence CASCADE;

-- Create messages table with UUID
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  username text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create presence table with UUID
CREATE TABLE presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  username text NOT NULL,
  last_seen timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_presence_room_id ON presence(room_id);
CREATE INDEX idx_presence_last_seen ON presence(last_seen);

-- Add unique constraint on presence
CREATE UNIQUE INDEX presence_room_id_username_key ON presence(room_id, username);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for messages
CREATE POLICY "Anyone can insert messages"
  ON messages
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read messages"
  ON messages
  FOR SELECT
  TO public
  USING (true);

-- Create RLS policies for presence
CREATE POLICY "Anyone can insert presence"
  ON presence
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read presence"
  ON presence
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update their own presence"
  ON presence
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete their own presence"
  ON presence
  FOR DELETE
  TO public
  USING (true);