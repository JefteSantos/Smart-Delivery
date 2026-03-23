-- ============================================================
-- SOLUÇÃO PARA O REALTIME (Supabase RLS Subquery Bug)
-- ============================================================
-- O Supabase Realtime *bloqueia* e silencia transmissões em tabelas 
-- que possuem políticas de segurança (RLS) usando "SELECT" (Subqueries).
-- Para consertar, vamos colocar o 'user_id' do pedido diretamente na 
-- tabela de mensagens de forma automática usando um gatilho escondido!

-- 1. Cria a coluna do dono do pedido na mensagem
ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Atualiza as mensagens antigas (se houver) para não quebrarem
UPDATE messages SET user_id = (SELECT user_id FROM orders WHERE orders.id = messages.order_id) WHERE user_id IS NULL;

-- 3. Cria a função automática que puxa o dono do pedido antes de salvar a mensagem
CREATE OR REPLACE FUNCTION fill_message_user_id() RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id := (SELECT user_id FROM orders WHERE id = NEW.order_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Anexa a função na tabela de mensagens
DROP TRIGGER IF EXISTS trg_fill_message_user_id ON messages;
CREATE TRIGGER trg_fill_message_user_id
BEFORE INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION fill_message_user_id();

-- 5. Recria a Política de Leitura (AGORA SUPER LEVE PARA O REALTIME!)
DROP POLICY IF EXISTS "read_messages" ON messages;
CREATE POLICY "read_messages"
ON messages FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
);

-- 6. Recria a Política de UPDATE (Para as lidas/não lidas funcionarem no Realtime tabmém)
DROP POLICY IF EXISTS "update_messages_read_status" ON messages;
CREATE POLICY "update_messages_read_status"
ON messages FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid() 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
)
WITH CHECK (
    user_id = auth.uid() 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
);
