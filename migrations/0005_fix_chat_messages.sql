
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS chat_session_id INTEGER REFERENCES chat_sessions(id);
