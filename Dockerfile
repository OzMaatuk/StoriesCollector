# syntax=docker/dockerfile:1
ARG NODE_VERSION=24

# ── Stage 1: deps + build ──────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS builder

RUN npm install -g npm@latest
WORKDIR /workspace

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma

# Install ALL deps (dev included) for build
RUN npm ci

# Prisma generate needs DATABASE_URL - pass as build arg
ARG DATABASE_URL
ARG DIRECT_URL
RUN DATABASE_URL=$DATABASE_URL DIRECT_URL=$DIRECT_URL npx prisma generate

COPY . .
# Build also needs DATABASE_URL
RUN DATABASE_URL=$DATABASE_URL DIRECT_URL=$DIRECT_URL npm run build

# ── Stage 2: production image ──────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /workspace

# Copy only what's needed to run
COPY --from=builder /workspace/package*.json ./
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/.next ./.next
COPY --from=builder /workspace/prisma ./prisma

# Install only production deps in the clean stage
RUN npm ci --omit=dev

ENV NODE_ENV=production \
    PRISMA_CLIENT_ENGINE_TYPE=binary

USER node
EXPOSE 3000
CMD ["npm", "start"]
