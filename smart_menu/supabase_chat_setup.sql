-- ============================================================
-- CHAT ENTRE CLIENTE E RESTAURANTE
-- Roda no Supabase SQL Editor
-- ============================================================

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id    uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sender_id   uuid        NOT NULL,
    sender_role TEXT        NOT NULL CHECK (sender_role IN ('client', 'master')),
    content     TEXT        NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscas por pedido (a query mais comum do chat)
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages (order_id, created_at ASC);

-- Ativa RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS DE ACESSO (RLS)
-- ============================================================

-- [SELECT] Clientes leem mensagens dos próprios pedidos
--          Master lê mensagens de qualquer pedido
CREATE POLICY "read_messages"
ON messages FOR SELECT
TO authenticated
USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
);

-- [INSERT] Qualquer usuário autenticado pode enviar mensagem,
-- desde que o sender_id seja o dele e o pedido seja acessível a ele
CREATE POLICY "insert_messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = auth.uid()
    AND (
        order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
    )
);

-- ============================================================
-- REALTIME: habilita publicação de INSERT na tabela
-- ============================================================
-- Rode este comando caso o Realtime ainda não esteja ativo:
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- (Normalmente já está ativo, mas execute se não receber mensagens em tempo real)
