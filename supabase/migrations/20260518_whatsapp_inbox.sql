-- Tabla de conversaciones WhatsApp (una por lead)
CREATE TABLE IF NOT EXISTS wa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  phone VARCHAR NOT NULL,
  lead_name VARCHAR,
  status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'bot')),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT,
  unread_count INT DEFAULT 0,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de mensajes (hilo de cada conversación)
CREATE TABLE IF NOT EXISTS wa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES wa_conversations(id) ON DELETE CASCADE,
  wa_message_id VARCHAR UNIQUE,  -- ID de Meta, evita duplicados
  direction VARCHAR NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  type VARCHAR DEFAULT 'text' CHECK (type IN ('text', 'template', 'image', 'document')),
  template_name VARCHAR,
  status VARCHAR DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_wa_conversations_phone ON wa_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_lead ON wa_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_last ON wa_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_conv ON wa_messages(conversation_id, sent_at DESC);

-- Habilitar Realtime en estas tablas
ALTER PUBLICATION supabase_realtime ADD TABLE wa_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE wa_messages;

-- Habilitar y configurar Row Level Security (RLS)
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can access WA conversations" ON wa_conversations FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can access WA messages" ON wa_messages FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
