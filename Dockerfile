# syntax=docker/dockerfile:1

FROM oven/bun:1
WORKDIR /app

# Install ALL deps (build tools and the prisma CLI are usually devDependencies)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Generate the Prisma client (only if the project uses Prisma) and build
# DATABASE_URL is only needed to generate the client on a Postgres schema.
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/boostify"
ENV DATABASE_URL=$DATABASE_URL
RUN if [ -f prisma/schema.prisma ]; then bunx prisma generate; fi
RUN bun run build

ENV NODE_ENV=production

# Give the non-root user ownership
RUN chown -R bun:bun /app
USER bun

# Push the schema on startup (needs DATABASE_URL at runtime), then start
CMD ["sh", "-c", "if [ -f prisma/schema.prisma ]; then bunx prisma db push; fi && bun run start"]