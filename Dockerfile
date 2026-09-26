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

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1