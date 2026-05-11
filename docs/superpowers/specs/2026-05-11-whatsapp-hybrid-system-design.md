# Diseño Técnico: Sistema Híbrido de Plantillas WhatsApp

Este documento detalla la implementación de un sistema de plantillas inteligente para WhatsApp en Altavik CRM, combinando robustez de código con flexibilidad de base de datos.

## 1. Objetivos
- Centralizar la lógica de mensajes de WhatsApp.
- Permitir variables dinámicas (nombre, género, hora del día).
- Soportar tanto plantillas críticas del sistema como plantillas personalizables por el usuario.
- Mantener el flujo "semiautomático" (abrir WhatsApp Web) para evitar costes de API oficial.

## 2. Arquitectura de Datos

### Tabla `whatsapp_templates` (Supabase)
```sql
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('system', 'marketing')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Variables Soportadas
- `{nombre}`: Nombre de pila del lead.
- `{saludo}`: "Buenos días", "Buenas tardes" o "Buenas noches" según la hora actual.
- `{interesado}`: "interesado" o "interesada" basado en detección heurística del nombre.
- `{propiedad}`: (Opcional) Nombre de la promoción o vivienda seleccionada.

## 3. Componentes Técnicos

### `src/services/whatsappService.ts`
Motor central de parseo. 
- Función `parseTemplate(body, lead, metadata)`: Reemplaza las variables.
- Función `getSystemTemplates()`: Retorna plantillas fijas (ej: "Primer Contacto").
- Función `getWhatsAppUrl(phone, message)`: Genera el enlace `wa.me`.

### `src/hooks/useWhatsAppTemplates.ts`
Hook de React para:
- Cargar plantillas de la DB (marketing).
- Combinarlas con las de sistema.
- Gestionar estados de carga y error.

## 4. Integración en UI

### Modales Actualizados
- **BulkWhatsAppModal.tsx**: Permitirá elegir entre plantillas antes de iniciar el envío masivo.
- **EmailComposerModal.tsx** (Pestaña WhatsApp): Reemplazará los textos "hardcoded" por el selector de plantillas.
- **CreateTaskModal.tsx**: Usará plantillas de recordatorio para el seguimiento automático.

## 5. Próximos Pasos
1. Ejecutar migración SQL en Supabase.
2. Implementar `whatsappService.ts`.
3. Crear el hook `useWhatsAppTemplates.ts`.
4. Refactorizar `EmailComposerModal.tsx` para usar el nuevo sistema.
5. Refactorizar `BulkWhatsAppModal.tsx`.
