<div align="center">
    <img height="120px" src=".github/logo.png" alt="Boostify Logo" />
    <h1>Boostify</h1>
    <p><strong>Maximize your Discord server boost management</strong></p>
    <img src="https://img.shields.io/github/actions/workflow/status/teamboostify/boostify/node.js.yml?style=flat-square" />
    <img src="https://img.shields.io/github/license/teamboostify/boostify?style=flat-square&color=FF47B5" />
    <img src="https://img.shields.io/github/v/tag/teamboostify/boostify?style=flat-square&color=FF47B5" />
    <img src="https://img.shields.io/github/forks/teamboostify/boostify?style=flat-square&color=FF47B5" />
    <img src="https://img.shields.io/github/checks-status/teamboostify/boostify/main?style=flat-square&color=FF47B5" /><br />
    <img src="https://img.shields.io/github/stars/teamboostify/boostify?style=flat-square&color=FF47B5" />
    <a href="https://discord.gg/vZgeWhZ9aF">
        <img src="https://img.shields.io/discord/1453868977720922287?style=flat-square&logo=Discord&logoColor=white&label=Support%20Server&color=7289da" />
    </a>
</div>

### Overview

> [!NOTE]
> **Boostify** is a work-in-progress project. While our team ensures everything in our platform works flawlessly, you're more than welcome to make an issue if you find an issue. Please join our Discord server if you require any assistance: [discord.gg/vZgeWhZ9aF](https://discord.gg/vZgeWhZ9aF).

---

# Quick Start

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

Invite Boostify to your Discord server:

👉 https://discord.com/oauth2/authorize?client_id=1453802179789066442

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

- Booster reward roles
- Auto thank-you messages
- Logging
- Moderation
- Booster analytics
- Freemium perks

Continue to the documentation for advanced configuration.

---

# 🖥️ Self Hosting

Self-host Boostify for full control and customization.

---

## Requirements

### Required

- Node.js 20+
- PostgreSQL
- Git
- Discord Bot Token

### Optional

- Docker
- PM2
- Reverse Proxy (Nginx/Caddy)

---

# Installation

## 1. Clone the Repository

```bash
git clone https://github.com/teamboostify/boostify.git
cd boostify
````

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

# Docker Deployment

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

---

# Recommended Production Stack

For the best production experience, we recommend:

* Docker
* PM2
* Linux VPS
* Managed PostgreSQL
* Reverse Proxy (Nginx or Caddy)

---

# Features

* 🚀 Boost Tracking
* 🎁 Reward Roles
* 💬 Auto Thank-You Messages
* 📊 Booster Analytics
* 🛡️ Moderation
* 📜 Logging
* ⚡ Freemium Perks
* 🐳 Docker Support
* 🔧 Self Hosting
* 🌐 Cloud Hosted Version

---

# Support

Need help?

* Join the support server: [https://discord.gg/vZgeWhZ9aF](https://discord.gg/vZgeWhZ9aF)
* Open an issue on GitHub
* Check the documentation

---

<div align="center">
   Made with ❤️ by Team Boostify
</div>
