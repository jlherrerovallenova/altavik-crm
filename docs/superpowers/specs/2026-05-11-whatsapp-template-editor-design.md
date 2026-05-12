# Diseño Técnico: Gestor de Plantillas WhatsApp (Ajustes)

Este documento detalla la implementación de una interfaz administrativa en Altavik CRM para gestionar las plantillas de WhatsApp, permitiendo al equipo crear, editar y previsualizar mensajes de marketing.

## 1. Objetivos
- Proporcionar una interfaz amigable para gestionar la tabla `whatsapp_templates`.
- Incluir previsualización dinámica de variables (`{nombre}`, `{saludo}`, etc.).
- Integrar la gestión dentro del flujo existente de "Ajustes".
- Proteger las plantillas de sistema para asegurar la continuidad del negocio.

## 2. Cambios en UI/UX

### Nueva Pestaña: `src/components/settings/WhatsAppTab.tsx`
- **Lista lateral**: Muestra todas las plantillas activas e inactivas.
- **Editor principal**:
  - Campo para el nombre de la plantilla.
  - Textarea para el cuerpo del mensaje.
  - Toggle para activar/desactivar.
- **Previsualizador**: Bloque visual que muestra el resultado final parseado en tiempo real.

### Integración en Menú
- **`src/components/settings/SettingsSidebar.tsx`**: Añadir opción "Plantillas WhatsApp" con icono `MessageCircle`.
- **`src/pages/Settings.tsx`**: Registrar el nuevo componente en el `renderTabContent`.

## 3. Lógica de Datos
- **Lectura**: Carga inicial de todas las filas de `whatsapp_templates`.
- **Escritura**: 
  - `upsert` para guardar cambios o crear nuevas.
  - Validación: No permitir borrar plantillas con `category: 'system'`.
- **Reactividad**: Actualización inmediata de la lista tras guardar.

## 4. Próximos Pasos
1. Crear el componente `WhatsAppTab.tsx`.
2. Actualizar el Sidebar de ajustes para incluir el acceso.
3. Conectar la lógica de guardado con Supabase.
4. Refinar el estilo glassmorphism para mantener la coherencia visual.
