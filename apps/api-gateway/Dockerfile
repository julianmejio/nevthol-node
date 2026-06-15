ARG NODE_VERSION=24.16.0
FROM node:${NODE_VERSION}-slim AS base

FROM base AS setup

# Enable pnpm without manual setup
RUN corepack enable
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
WORKDIR /app
RUN pnpm add turbo --global
# Copy monorepo contents
COPY . .
# And choice the api-gateway
RUN turbo prune api-gateway --docker

FROM base AS builder

# Install ca-certificates
RUN apt update && apt install -yqq ca-certificates
# Enable pnpm
RUN corepack enable
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
# Copy from previous step
COPY --from=setup /app/out/json/ .
# Install
RUN pnpm i
COPY --from=setup /app/out/full/ .
# And build
RUN pnpm build

FROM node:${NODE_VERSION}-slim AS runner

WORKDIR /app
# Do not run as root
RUN addgroup --system --gid 1001 api
RUN adduser --system --uid 1001 api
USER api
# Copy from previous step
COPY --from=builder /app .
# And run :)
CMD ["node", "apps/api-gateway/dist/index.js"]