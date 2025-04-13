/*
  # Update schema to use UUIDs

  1. Changes
    - Modify messages table to use UUID for room_id
    - Modify presence table to use UUID for room_id
    - Add indexes for better query performance
    - Add NOT NULL constraints for required fields

  2. Security
    - Maintain existing RLS policies
*/

-- Update messages table
ALTER TABLE messages
ALTER COLUMN room_id TYPE uuid USING room_id::uuid,
ALTER COLUMN content SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Update presence table
ALTER TABLE presence
ALTER COLUMN room_id TYPE uuid USING room_id::uuid,
ALTER COLUMN username SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presence_room_id ON presence(room_id);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen);