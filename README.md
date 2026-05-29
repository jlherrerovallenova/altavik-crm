# Altavik CRM

Altavik CRM es una plataforma integral de gestión de clientes (Customer Relationship Management) diseñada específicamente para la gestión de ventas inmobiliarias, leads, inventario de propiedades y automatización de marketing.

## 🛠 Stack Tecnológico

El proyecto sigue una arquitectura **Jamstack**, separando el frontend del backend de manera eficiente:

- **Frontend:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/) (Iconografía)
- **Backend & Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, Realtime)
- **Email Marketing:** [Resend](https://resend.com/) (Envíos) + [Unlayer](https://unlayer.com/) (Editor Visual)
- **Generación de Documentos:** `docxtemplater`, `jspdf`, `pdf-lib`

## 🚀 Módulos Principales

1. **Gestión de Leads & Pipeline:** Tablero Kanban para arrastrar y soltar leads entre fases. Ficha completa del cliente con cronología (timeline) de interacciones y gestor de tareas.
2. **Inventario de Propiedades:** Gestión de disponibilidad, precios, anexos (PDFs) y vinculación directa de inmuebles a procesos de venta.
3. **Ventas y Documentación:** Generación automática de contratos de reserva y compraventa inyectando variables dinámicas del cliente y de la propiedad.
4. **Comunicaciones:**
   - **Bandeja de Entrada (Email):** Sincronización de correos entrantes y envíos desde la plataforma.
   - **Campañas (Newsletters):** Creación visual de boletines y envío masivo segmentado.
   - **WhatsApp:** Gestor de plantillas dinámicas y bandeja de entrada para chats en tiempo real.
5. **Dashboard & Analítica:** KPIs en tiempo real, embudo de conversión y priorización de tareas diarias.

## ⚙️ Instalación y Configuración Local

1. **Clonar el repositorio y entrar al directorio:**
   ```bash
   git clone <url-del-repo>
   cd altavik-crm
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno:**
   Crea un archivo `.env` en la raíz del proyecto basándote en un posible `.env.example` o con las siguientes variables necesarias:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
   ```

4. **Levantar el entorno de desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible por defecto en `http://localhost:5173`.

## 📦 Despliegue (Producción)

Para compilar la aplicación para producción:
```bash
npm run build
```

Se recomienda alojar el directorio `dist` generado en plataformas optimizadas para frontend como **Vercel** o **Netlify**. El backend y la base de datos se mantienen de forma serverless en **Supabase**. Las tareas programadas o cron jobs (como la sincronización IMAP) pueden requerir un alojamiento en Node.js 24/7 como **Railway** o **Render**.

## 🤝 Contribución y Buenas Prácticas

- **Tipado Estricto:** Asegúrate de tipar correctamente todas las interfaces e integraciones con Supabase en la carpeta `src/types`.
- **Componentes Reutilizables:** Todos los elementos visuales base están en `src/components`. Utiliza clases utilitarias de Tailwind siempre que sea posible.
- **Variables de Supabase:** Nunca expongas la `SERVICE_ROLE_KEY` en el frontend, utiliza únicamente la `ANON_KEY` y asegura el acceso de datos mediante *Row Level Security* (RLS) en las tablas de PostgreSQL.
