-- ============================================================
-- SETUP DE PUSH NOTIFICATIONS
-- Roda no Supabase SQL Editor (depois do supabase_chat_setup.sql)
-- ============================================================

-- Tabela de tokens de push (clientes + master)
CREATE TABLE IF NOT EXISTS push_tokens (
    user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    token      TEXT        NOT NULL,
    platform   TEXT,       -- 'ios', 'android'
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem ler tokens (necessário para enviar push)
CREATE POLICY "read_push_tokens"
ON push_tokens FOR SELECT
TO authenticated
USING (true);

-- Cada usuário só pode escrever o próprio token
CREATE POLICY "manage_own_push_token"
ON push_tokens FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Adiciona coluna de push token do master nas configurações
-- (salvo separadamente para que clientes possam notificar o restaurante)
-- ============================================================
ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS master_push_token TEXT,
    ADD COLUMN IF NOT EXISTS master_user_id    uuid;
