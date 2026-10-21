# syntax=docker/dockerfile:1

FROM oven/bun:1
WORKDIR /app

# Install ALL deps (build tools and the prisma CLI are usually devDependencies)
COPY package.json bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts

# Copy source
COPY . .

# Emit the Prisma 8 data contract (src/prisma/contract.prisma -> contract.json
# and contract.d.ts) and build. The emit step is offline — it needs no database.
RUN bunx prisma contract emit
RUN bun run build

ENV NODE_ENV=production

# Default connection string; the runtime environment overrides it.
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/boostify"
ENV DATABASE_URL=$DATABASE_URL

# Give the non-root user ownership
RUN chown -R bun:bun /app
USER bun

# The schema is owned by the data contract, never pushed. `db init` is the
# non-destructive successor of `db push`: it creates whatever the contract is
# missing, leaves compatible objects alone, refuses changes that would drop
# data, and signs the database. On an adopted database it is a no-op.
CMD ["sh", "-c", "if [ -n \"$DATABASE_URL\" ]; then bunx prisma db init --db \"$DATABASE_URL\" || exit 1; fi; exec bun run start"]