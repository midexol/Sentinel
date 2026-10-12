# ==============================================================================
# Sentinel Multi-Stage Production Dockerfile
# ==============================================================================

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build Next.js application & TypeScript daemon, then drop dev dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:cli
RUN npm run build
RUN npm prune --omit=dev

# Stage 3: Production runtime image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# All mutable state lives in /app/data (mount a volume there)
ENV LOG_FILE=/app/data/sentinel.log
ENV STATE_FILE=/app/data/sentinel-state.json
ENV SETTINGS_FILE=/app/data/settings.json
# Inside the container the proxy must listen on all interfaces; docker-compose
# publishes it on the host loopback only. Set PROXY_AUTH_TOKEN for anything wider.
ENV PROXY_HOST=0.0.0.0

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs sentinel

# Copy built artifacts and (pruned) runtime dependencies
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/settings.json ./settings.default.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && \
    mkdir -p /app/data && \
    chown -R sentinel:nodejs /app/data /app/.next

USER sentinel

VOLUME ["/app/data"]

# 3000 -> Web dashboard, 8545 -> JSON-RPC proxy for upstream trading bots
EXPOSE 3000
EXPOSE 8545

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health > /dev/null || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["all"]
