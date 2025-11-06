# syntax=docker/dockerfile:1
ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-alpine AS base
RUN npm install -g npm@latest
WORKDIR /workspace

# Install OpenSSL (required for Prisma on Alpine)
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Copy Prisma schema BEFORE running generate
COPY prisma ./prisma

# Manually run prisma generate (bypass postinstall issues)
RUN npx prisma generate

# Install ONLY production dependencies
# --omit=dev skips dev deps, but postinstall still runs
# RUN npm ci --omit=dev --ignore-scripts
RUN npm ci --omit=dev --ignore-scripts

WORKDIR /workspace/src/app
RUN npm run build

# Copy built app (from your build process)
# Adjust path if your build output is different
# COPY dist ./dist

# Optional: Copy other necessary files
# COPY .env.production ./.env

ENV NODE_ENV=production \
    PRISMA_CLIENT_ENGINE_TYPE=binary

USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]