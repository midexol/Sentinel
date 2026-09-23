# ==============================================================================
# Sentinel Multi-Stage Production Dockerfile
# ==============================================================================

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build Next.js application & TypeScript CLI daemon
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:cli
RUN npm run build

# Stage 3: Production runtime image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sentinel

# Copy built artifacts and runtime dependencies
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/settings.json ./settings.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Permissions setup
RUN chmod +x ./docker-entrypoint.sh && \
    touch ./sentinel.log && \
    chown -R sentinel:nodejs /app

USER sentinel

# Expose ports:
# 3000 -> Web Observatory Dashboard
# 8545 -> JSON-RPC Proxy for upstream trading bots
EXPOSE 3000
EXPOSE 8545

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["app"]
