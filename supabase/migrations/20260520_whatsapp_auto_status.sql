-- Función para actualizar el estado del lead a 'contacted' cuando se envía un WhatsApp saliente
CREATE OR REPLACE FUNCTION handle_outbound_whatsapp_status()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id UUID;
  v_current_status VARCHAR;
BEGIN
  -- Obtener el lead_id y su estado actual de la conversación vinculada
  SELECT c.lead_id, l.status
  INTO v_lead_id, v_current_status
  FROM wa_conversations c
  JOIN leads l ON l.id = c.lead_id
  WHERE c.id = NEW.conversation_id;

  -- Si el lead existe y su estado es 'new', actualizarlo a 'contacted'
  IF v_lead_id IS NOT NULL AND v_current_status = 'new' THEN
    -- Actualizar estado del lead
    UPDATE leads
    SET status = 'contacted'
    WHERE id = v_lead_id;

    -- Registrar en el historial del lead
    INSERT INTO lead_history (lead_id, event_type, description, metadata)
    VALUES (
      v_lead_id,
      'status_change',
      'Estado cambiado a Contactado por envío de WhatsApp',
      jsonb_build_object('source', 'outbound_whatsapp_trigger', 'message_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar la función después de insertar un mensaje saliente
CREATE OR REPLACE TRIGGER tr_outbound_whatsapp_status
AFTER INSERT ON wa_messages
FOR EACH ROW
WHEN (NEW.direction = 'outbound')
EXECUTE FUNCTION handle_outbound_whatsapp_status();
