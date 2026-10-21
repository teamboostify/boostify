# syntax=docker/dockerfile:1

FROM oven/bun:1
WORKDIR /app

# Prefer IPv4 for DNS resolution (VPS has no IPv6)
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

COPY package.json bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY . .

ARG DATABASE_URL="postgresql://user:pass@localhost:5432/boostify"
ENV DATABASE_URL=$DATABASE_URL
RUN if [ -f prisma/schema.prisma ]; then bunx prisma generate; fi
RUN bun run build

ENV NODE_ENV=production

RUN chown -R bun:bun /app
USER bun

CMD ["sh", "-c", "if [ -f prisma/schema.prisma ]; then bunx prisma db push; fi && bun run start"]
