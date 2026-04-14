-- Reactions table for message reactions
CREATE TABLE IF NOT EXISTS reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  emoji TEXT NOT NULL CHECK (emoji IN ('fire', 'skull', '100')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, session_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read reactions" ON reactions FOR SELECT USING (true);
CREATE POLICY "Public insert reactions" ON reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete reactions" ON reactions FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE reactions;

NOTIFY pgrst, 'reload schema';
