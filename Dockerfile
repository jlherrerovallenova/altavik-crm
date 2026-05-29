# Dockerfile para ejecutar los automatismos de fondo (Worker) de Altavik CRM
FROM node:20-alpine

# Crear directorio de la app
WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias necesarias (omitiendo devDependencies para producción)
RUN npm ci --omit=dev

# Copiar el resto del código del backend/scripts
COPY scripts/ ./scripts/

# Variables de entorno que se esperan en tiempo de ejecución (definidas en Railway/Render)
# ENV EMAIL_USER=...
# ENV EMAIL_PASS=...
# ENV EMAIL_HOST=...
# ENV VITE_SUPABASE_URL=...
# ENV VITE_SUPABASE_ANON_KEY=...
# ENV VITE_GEMINI_API_KEY=...

# Iniciar el worker de fondo
CMD ["node", "scripts/emailWorker.js"]
