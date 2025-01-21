
ALTER TABLE chat_messages 
ADD COLUMN session_id TEXT,
ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
