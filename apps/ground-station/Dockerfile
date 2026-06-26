ARG NODE_VERSION=24.16.0
ARG NODE_VARIANT=trixie-slim
FROM node:${NODE_VERSION}-${NODE_VARIANT} AS base

FROM base AS setup

# Enable pnpm without manual setup
RUN corepack enable
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
WORKDIR /app
RUN pnpm add turbo --global
# Copy monorepo contents
COPY . .
# And choice the geo-transponder
RUN turbo prune ground-station --docker

FROM base AS builder

# Install ca-certificates
RUN apt update && apt install -yqq ca-certificates python3 build-essential
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

FROM node:${NODE_VERSION}-${NODE_VARIANT} AS runner

WORKDIR /app
# Do not run as root
RUN addgroup --system --gid 1001 groundstation
RUN adduser --system --uid 1001 groundstation
USER groundstation
# Copy from previous step
COPY --from=builder /app .
# And run :)
CMD ["node", "apps/ground-station/dist/index.js"]