
-- Drop existing chat_messages table if exists
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Recreate chat_messages table with proper structure
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  chat_session_id INTEGER REFERENCES chat_sessions(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  subject TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX chat_messages_session_idx ON chat_messages(chat_session_id);
CREATE INDEX chat_messages_user_created_idx ON chat_messages(user_id, created_at);
CREATE INDEX chat_messages_subject_idx ON chat_messages(subject);
