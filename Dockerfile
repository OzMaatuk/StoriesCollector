# Production Dockerfile
ARG NODE_VERSION=20

# ================================
# Base stage
# ================================
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl ca-certificates libstdc++

# ================================
# Dependencies stage
# ================================
FROM base AS deps

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --ommit=dev
RUN npm cache clean --force

# ================================
# Build stage
# ================================
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ================================
# Runner stage
# ================================
FROM base AS runner
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# The node user already exists in Alpine node images
USER node

# Copy built application
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Copy Prisma files for runtime
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]