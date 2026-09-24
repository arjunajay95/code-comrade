
# ---- Base: shared by both stages ------------------------------------------
# Debian slim rather than Alpine. Prisma's schema engine, which migrations
# run through, needs OpenSSL, and on Alpine it hits known compatibility
# problems. Slim avoids them at a small size cost. Node 22 matches CI.
FROM node:22-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Build: compile TypeScript --------------------------------------------
FROM base AS build

# Copying only the manifests first lets Docker cache the dependency layer.
# As long as package.json and the lockfile are unchanged, npm ci is skipped
# on rebuilds, even when source files change.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- Runtime: what actually ships -----------------------------------------
FROM base AS runtime
ENV NODE_ENV=production

# Production dependencies only. Installing them here, instead of
# copying node_modules from the build stage, is what leaves every dev tool
# out of the final image.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts ./

# The official Node image ships an unprivileged "node" user. Everything
# from here on, including the app itself, runs as that user, not root.
USER node

# Documentation only. Render sets PORT itself, and env.ts reads it.
EXPOSE 4000

# Migrations run on every start, before the server boots. If a
# migration fails, the && stops the server from starting at all, which is
# the safe outcome. exec replaces the shell with Node, so Node becomes the
# container's main process and receives SIGTERM directly. Without exec, the
# shell would receive the signal and not pass it on, and graceful shutdown
# would never run.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/index.js"]