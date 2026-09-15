# Multi-stage production Dockerfile for Fast xBet Telegram Bot
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build production bundle
COPY tsconfig.json esbuild* ./
COPY src ./src
COPY migrations ./migrations

RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Security: Create and run as non-root user
USER node

# Copy built distribution artifact and package definitions
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/migrations ./migrations

# Create volume directory for persistent local SQLite database
USER root
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]
