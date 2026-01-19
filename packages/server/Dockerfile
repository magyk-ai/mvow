FROM node:24-slim

WORKDIR /app

# Copy workspace config
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./

# Copy package manifests
COPY packages/shared/package.json ./packages/shared/
COPY packages/engine/package.json ./packages/engine/
COPY packages/server/package.json ./packages/server/

# Install all dependencies (including dev deps for tsx)
RUN npm ci

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/engine ./packages/engine
COPY packages/server ./packages/server

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start server using tsx to run TypeScript directly
CMD ["npx", "tsx", "packages/server/src/index.ts"]
