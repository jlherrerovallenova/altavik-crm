/* 
  Añadir seguimiento de feedback a los leads
*/

-- Añadir columna para saber si se ha enviado el correo de opinión
ALTER TABLE leads ADD COLUMN IF NOT EXISTS feedback_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS feedback_sent_at TIMESTAMPTZ;

-- Comentario explicativo
COMMENT ON COLUMN leads.feedback_sent IS 'Indica si se ha enviado el correo automático de opinión (7 días después)';
