# Build context is the repository root (see docker-compose.yml).
# NOTE: written for a monorepo using npm workspaces; not verified with a
# local `docker build` in this environment (no Docker available). Please
# run `docker build -f backend/Dockerfile .` from the repo root and report
# any issues.

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm ci --workspace=backend

COPY backend/tsconfig.json backend/tsconfig.build.json ./backend/
COPY backend/prisma ./backend/prisma
COPY backend/src ./backend/src
RUN npm run prisma:generate --workspace=backend
RUN npm run build --workspace=backend

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm ci --workspace=backend --omit=dev

COPY backend/prisma ./backend/prisma
RUN npm run prisma:generate --workspace=backend
COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
