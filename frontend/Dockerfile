# Build context is the repository root (see docker-compose.yml).
# NOTE: not verified with a local `docker build` in this environment (no
# Docker available). Please run `docker build -f frontend/Dockerfile .`
# from the repo root and report any issues.

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace=frontend

COPY frontend ./frontend
RUN npm run build --workspace=frontend

FROM nginx:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
