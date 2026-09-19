# syntax=docker/dockerfile:1

FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

FROM base AS runtime
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER bun

CMD ["bun", "run", "start"]