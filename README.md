<div align="center">

<img height="120px" src=".github/logo.png" alt="Boostify Logo">

<h1>Boostify</h1>

<p>
<strong>Maximize your Discord server boost management</strong>
</p>

<p>
<img src="https://img.shields.io/github/actions/workflow/status/teamboostify/boostify/node.js.yml?branch=main&style=flat-square" alt="Build Status">
<img src="https://img.shields.io/github/license/teamboostify/boostify?style=flat-square&color=FF47B5" alt="License">
<img src="https://img.shields.io/github/v/tag/teamboostify/boostify?style=flat-square&color=FF47B5" alt="Version">
<img src="https://img.shields.io/github/forks/teamboostify/boostify?style=flat-square&color=FF47B5" alt="Forks">
<img src="https://img.shields.io/github/stars/teamboostify/boostify?style=flat-square&color=FF47B5&cacheSeconds=60" alt="Stars">
</p>

<p>
<a href="https://discord.gg/vZgeWhZ9aF">
<img src="https://img.shields.io/discord/1453868977720922287?style=flat-square&logo=discord&logoColor=white&label=Support%20Server&color=5865F2" alt="Discord">
</a>
</p>

</div>

---

# 📖 Overview

> [!NOTE]
> **Boostify is currently a work-in-progress project.**
>
> Our team is actively improving stability, adding new features, and making Boostify better every release. If you encounter an issue, please open a GitHub issue or join our Discord server for support.

---

# 🚀 Quick Start

Get Boostify running in minutes using the official cloud version or self-host it yourself.

## Choose Your Setup

| Option | Description |
| --- | --- |
| ☁️ **Cloud Hosted** | Use the official Boostify bot instantly. |
| 🖥️ **Self Hosted** | Deploy your own Boostify instance using Node.js or Docker. |

---

# ☁️ Cloud Hosted

The fastest way to start using Boostify.

## 1. Invite Boostify

[Invite Boostify](https://discord.com/oauth2/authorize?client_id=1453802179789066442)

---

## 2. Required Permissions

Boostify requires the following permissions:

- Add Reactions
- Embed Links
- Manage Roles
- Send Messages
- View Server Subscription Insights

> [!IMPORTANT]
> Place the Boostify role above any reward roles you want it to manage.

---

## 3. Configure Your Server

Once invited, configure features like:

- 🎁 Booster reward roles
- 💬 Auto thank-you messages
- 📜 Logging
- 🛡️ Moderation
- 📊 Booster analytics
- ⚡ Freemium perks

---

# 🖥️ Self Hosting

Self-host Boostify for full control and customization.

---

# Requirements

## Required

- Node.js 20+
- PostgreSQL
- Git
- Discord Bot Token

## Optional

- Docker
- PM2
- Reverse Proxy (Nginx/Caddy)

---

# Installation

## 1. Clone the Repository

```bash
git clone https://github.com/teamboostify/boostify.git

cd boostify
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file in the project root.

```env
DEBUG=true

BOT_TOKEN=your_bot_token
CLIENT_ID=
GUILD_ID=

GREET_CHANNEL_ID=
LOG_CHANNEL_ID=
MASTER_GUILD=

DATABASE_URL=postgresql://user:password@localhost:5432/boostify
```

> [!WARNING]
> Never share your bot token or commit your `.env` file publicly.

---

# Database Setup

Generate the Prisma client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate deploy
```

---

# Running Boostify

## Development

```bash
npm run dev
```

## Production

```bash
npm run build

npm start
```

---

# 🐳 Docker Deployment

Boostify supports Docker deployments out of the box.

## Build the Image

```bash
docker build -t boostify .
```

## Run the Container

```bash
docker run -d \
  --name boostify \
  --env-file .env \
  boostify
```

## Run with Docker Compose (recommended)

A `docker-compose.yml` is included — it runs the bot **and** a local PostgreSQL
database, with the schema pushed automatically on startup:

```bash
cp .env.example .env   # fill in BOT_TOKEN, CLIENT_ID, etc.
docker compose up -d
```

The bot image is pulled from `ghcr.io/teamboostify/boostify:latest` (built
automatically by the `build-and-push` GitHub Actions workflow on every push to
`main`). If the image isn't available locally yet, Compose builds it from the
`Dockerfile` instead. To build it yourself and skip the pull:

```bash
docker compose build
docker compose up -d
```

### Using an external / managed database

Already have a Postgres somewhere (Neon, Supabase, Railway, your VPS, ...)?
Point the bot at it instead of running the bundled one:

```bash
# .env
COMPOSE_PROFILES=          # <-- remove/blank "local-db" so the bundled db doesn't start
DATABASE_URL=postgresql://user:password@your-host:5432/boostify
```

```bash
docker compose up -d
```

The bundled `db` service is gated behind the `local-db` profile — with it off,
Compose only starts the bot, and `DATABASE_URL` from your `.env` is passed
straight through. Note that the container still runs `prisma db push` on
startup to sync the schema, so make sure the DB user has rights to do that
(or run `bunx prisma db push` yourself beforehand).

> Inside Docker, `localhost` refers to the container itself — always use a
> hostname your container can reach (no `localhost`) for external databases.

Useful commands:

```bash
docker compose logs -f bot   # tail bot logs
docker compose down           # stop everything
docker compose down -v        # stop and wipe the database volume
```

> With the bundled database, Compose wires `DATABASE_URL` to the `db` service
> for you — no need to set it manually.

---

# 🏗️ Recommended Production Stack

For the best production experience:

- Docker
- PM2
- Linux VPS
- Managed PostgreSQL
- Reverse Proxy (Nginx or Caddy)

---

# ✨ Features

- 🚀 Boost Tracking
- 🎁 Reward Roles
- 💬 Auto Thank-You Messages
- 📊 Booster Analytics
- 🛡️ Moderation
- 📜 Logging
- ⚡ Freemium Perks
- 🐳 Docker Support
- 🔧 Self Hosting
- 🌐 Cloud Hosted Version

---

# ❤️ Support

Need help?

- 💬 [Join the Discord Support Server](https://discord.gg/vZgeWhZ9aF)
- 🐞 [Open a GitHub Issue](https://github.com/teamboostify/boostify/issues/new/choose)
- 📖 [Read the Documentation](https://docs.boostify.breaddevv.cc/)

---

<div align="center">

Made with ❤️ by **Team Boostify**

</div>
