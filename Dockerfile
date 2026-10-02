# ---- Stage 1: build (deps + typecheck + vite) ----
FROM node:24-alpine AS build
WORKDIR /app

# VITE_API_URL en build-time: la app construida pega a /api (mismo origen,
# nginx reenvía al backend). Cambiar solo si se sirve el API en otra URL.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

RUN npm run build

# ---- Stage 2: nginx (SPA + proxy /api -> backend) ----
FROM nginx:1.27-alpine

# API_UPSTREAM es RUNTIME, no build: URL completa del backend (con esquema) que
# el template de abajo materializa al arrancar con el entrypoint oficial de
# nginx (envsubst sobre /etc/nginx/templates/*.template -> conf.d). El ENV
# cubre el default de docker compose; Render sobreescribe la env var en runtime.
ENV API_UPSTREAM=http://backend:3000

# El default.conf de la imagen base colisiona con nuestro server (listen 80
# default_server): eliminarlo — el template lo regenera con nuestras reglas.
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
