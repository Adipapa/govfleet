# ============================================================
# GovFleet Dockerfile
# ============================================================

# ------------------------------------------------------------
# Stage 1 — Build application
# ------------------------------------------------------------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build
RUN npm run build:api


# ------------------------------------------------------------
# Stage 2 — API production image
# ------------------------------------------------------------
FROM node:22-bookworm-slim AS api

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/server/db/schema.sql ./dist-server/db/schema.sql
COPY --from=builder /app/server/db/migrations ./dist-server/db/migrations

EXPOSE 4000

CMD ["node", "dist-server/server.js"]


# ------------------------------------------------------------
# Stage 3 — Frontend production image
# ------------------------------------------------------------
FROM nginx:alpine AS frontend

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
