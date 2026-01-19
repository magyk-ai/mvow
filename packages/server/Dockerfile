FROM node:24-slim AS builder

WORKDIR /app

# Copy workspace config
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./

# Copy package manifests
COPY packages/shared/package.json ./packages/shared/
COPY packages/engine/package.json ./packages/engine/
COPY packages/server/package.json ./packages/server/

# Install all dependencies
RUN npm ci

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/engine ./packages/engine
COPY packages/server ./packages/server

# Build server
RUN npm run build --workspace=packages/server

# Production stage
FROM node:24-slim

WORKDIR /app

# Copy workspace config for production install
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/engine/package.json ./packages/engine/
COPY packages/server/package.json ./packages/server/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/shared/src ./packages/shared/src
COPY --from=builder /app/packages/engine/src ./packages/engine/src

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start server
CMD ["node", "packages/server/dist/index.js"]
