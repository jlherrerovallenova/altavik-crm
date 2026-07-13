-- Políticas RLS para wa_conversations
CREATE POLICY "Usuarios autenticados pueden ver conversaciones"
  ON wa_conversations FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear conversaciones"
  ON wa_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar conversaciones"
  ON wa_conversations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Políticas RLS para wa_messages
CREATE POLICY "Usuarios autenticados pueden ver mensajes"
  ON wa_messages FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear mensajes"
  ON wa_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar mensajes"
  ON wa_messages FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
