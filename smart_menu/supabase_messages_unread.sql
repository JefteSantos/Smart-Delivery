-- Executar no SQL Editor do Supabase

-- 1. Cria a coluna is_read se ela não existir
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 2. Cria política para permitir atualização da coluna is_read
CREATE POLICY "update_messages_read_status"
ON messages FOR UPDATE
TO authenticated
USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
)
WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
);
