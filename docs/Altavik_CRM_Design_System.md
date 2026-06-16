# Altavik CRM 2.0 - UI/UX Design System

## 1. Filosofía de Diseño
El CRM adopta una estética **Premium** basada en el **Glassmorphism** (Efecto cristal) combinado con interfaces minimalistas y limpias. La intención es transmitir confianza, modernidad y lujo, acorde al sector inmobiliario de alto nivel.

## 2. Tipografía
Se utiliza una única fuente sans-serif para todo el sistema, asegurando consistencia y legibilidad.
- **Fuente Principal:** `Outfit` (Pesos: 100 a 900).
- **Fallback:** `sans-serif`.
- Se prioriza el peso `600` y `800` para títulos y el `400` para cuerpos de texto. 
- Los "badges" (etiquetas de estado) utilizan fuente en `uppercase` con un peso de `900` y alto tracking (espaciado entre letras).

## 3. Paleta de Colores

### Colores de Marca (Altavik)
Basados en el azul corporativo:
- **Primary (500):** `#6b94b9` - Uso en botones principales y llamadas a la acción.
- **Secondary (800):** `#3a516b` - Uso en elementos secundarios, bordes oscuros o fondos invertidos.
- **Accent (50):** `#f4f7f9` - Uso en fondos de tarjetas y hover states.

### Escala de Grises (Slate Modificado)
- **Background Base:** `#f8fafc` con un ligero gradiente radial para darle profundidad.
- **Textos Oscuros:** `#0f172a` (Slate 900).
- **Deep Slate:** `#1e293b` (Slate 850) y `#020617` (Slate 950) para contrastes muy oscuros o dark modes específicos.

## 4. Clases Utilitarias Core (CSS)

### Glassmorphism (Tarjetas)
Clase: `.glass-card`
- Fondo semitransparente: `bg-white/70`
- Difuminado de fondo: `backdrop-blur-xl`
- Borde sutil: `border border-white/40`
- Sombra premium profunda: `shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]`

### Botones
Clase: `.btn-premium`
- Uso de `overflow-hidden` con transición suave `duration-300`.
- Interacción: `active:scale-95` para un efecto "push" realista.
- Efecto hover mediante pseudo-elemento que añade una capa de luz blanca al pasar el ratón.

### Etiquetas de Estado (Badges)
Clase: `.status-badge`
- Redondeo completo `rounded-full`, padding compacto `px-3 py-1`.
- Tipografía pequeña `text-[10px]` en mayúsculas y en negrita extra.

### Textos
Clase: `.text-gradient`
- Gradiente de texto de izquierda a derecha: `bg-gradient-to-r from-altavik-600 to-altavik-800`.

## 5. Animaciones
- **Entrada Estándar:** `.animate-fade-in-scale`
- Animación fluida de escala y opacidad (`fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1)`) para suavizar la carga de modales, paneles o vistas.

## 6. Iconografía
- **Librería:** `Lucide React`
- **Estilo:** Trazo fino o estándar (generalmente strokeWidth = 2, aunque puede ajustarse a 1.5 para un look más "premium").

## 7. Espaciado y Layout
- **Scrollbar Personalizado:** Diseño delgado (6px) con un track transparente y un "thumb" redondeado usando la escala de grises de Tailwind (`slate-200` y `slate-300` en hover).
- **Grid y Flex:** Uso exhaustivo de las utilidades de Tailwind (Gap 4, Gap 6) para alinear componentes. Los bordes de paneles suelen usar `rounded-xl` o `rounded-2xl`.
