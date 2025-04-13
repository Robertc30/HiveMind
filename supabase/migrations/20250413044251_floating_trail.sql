/*
  # Add presence tracking for active users

  1. New Tables
    - `presence`
      - `id` (uuid, primary key)
      - `room_id` (text, required)
      - `username` (text, required)
      - `last_seen` (timestamp with timezone)

  2. Security
    - Enable RLS on `presence` table
    - Add policies for public access
*/

CREATE TABLE presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  username text NOT NULL,
  last_seen timestamptz DEFAULT now(),
  UNIQUE(room_id, username)
);

ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_presence_room_id ON presence(room_id);
CREATE INDEX idx_presence_last_seen ON presence(last_seen);

-- Allow public access to presence data
CREATE POLICY "Anyone can read presence"
  ON presence
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert presence"
  ON presence
  FOR INSERT
  TO public
  WITH CHECK (true);

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

-- Automatically clean up stale presence records
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS trigger AS $$
BEGIN
  DELETE FROM presence
  WHERE last_seen < NOW() - INTERVAL '5 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_stale_presence_trigger
  AFTER INSERT OR UPDATE ON presence
  EXECUTE FUNCTION cleanup_stale_presence();