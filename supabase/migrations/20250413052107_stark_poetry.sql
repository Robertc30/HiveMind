/*
  # Update schema to use UUIDs

  1. Changes
    - Create new tables with UUID room_id
    - Safely migrate data from old tables
    - Drop old tables after migration
    - Add necessary indexes and constraints

  2. Security
    - Maintain existing RLS policies
*/

-- Create new messages table with UUID
CREATE TABLE IF NOT EXISTS messages_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  username text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create new presence table with UUID
CREATE TABLE IF NOT EXISTS presence_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  username text NOT NULL,
  last_seen timestamptz DEFAULT now()
);

-- Create temporary function to generate UUIDs from text
CREATE OR REPLACE FUNCTION generate_stable_uuid(input_text text) 
RETURNS uuid AS $$
BEGIN
  -- Use MD5 to create a deterministic UUID from text
  RETURN CAST(CONCAT(
    SUBSTR(MD5(input_text), 1, 8), '-',
    SUBSTR(MD5(input_text), 9, 4), '-4',
    SUBSTR(MD5(input_text), 13, 3), '-',
    CAST(CAST(SUBSTR(MD5(input_text), 17, 4) AS bit(16)) | B'1000000000000000' AS hex), '-',
    SUBSTR(MD5(input_text), 21, 12)
  ) AS uuid);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Migrate data from messages to messages_new
INSERT INTO messages_new (id, room_id, username, content, created_at)
SELECT 
  id,
  generate_stable_uuid(room_id) as room_id,
  username,
  content,
  created_at
FROM messages;

-- Migrate data from presence to presence_new
INSERT INTO presence_new (id, room_id, username, last_seen)
SELECT 
  id,
  generate_stable_uuid(room_id) as room_id,
  username,
  last_seen
FROM presence;

-- Drop old tables
DROP TABLE messages;
DROP TABLE presence;

-- Rename new tables to original names
ALTER TABLE messages_new RENAME TO messages;
ALTER TABLE presence_new RENAME TO presence;

-- Create indexes
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_presence_room_id ON presence(room_id);
CREATE INDEX idx_presence_last_seen ON presence(last_seen);

-- Add unique constraint on presence
CREATE UNIQUE INDEX presence_room_id_username_key ON presence(room_id, username);

-- Enable RLS on new tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies for messages
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

-- Recreate RLS policies for presence
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

-- Drop the temporary function
DROP FUNCTION generate_stable_uuid;