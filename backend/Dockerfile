# API de ReservaUNAB (NestJS). Imagen en dos etapas: se compila con todas las dependencias
# y la imagen final lleva solo lo necesario para ejecutar.
FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
# tzdata: para que TZ=America/Santiago funcione dentro del contenedor
RUN apk add --no-cache tzdata
ENV NODE_ENV=production TZ=America/Santiago
COPY --from=compilacion /app/package.json ./
COPY --from=compilacion /app/node_modules ./node_modules
COPY --from=compilacion /app/dist ./dist
USER node
EXPOSE 3000
# Docker considera la API lista cuando /api/salud responde (PostgreSQL y MongoDB conectados)
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=6 \
  CMD wget -qO- http://localhost:3000/api/salud > /dev/null || exit 1
# Aplica migraciones, carga datos de prueba si la base está vacía y arranca la API
CMD ["sh", "-c", "node dist/database/seed.js && node dist/main.js"]
