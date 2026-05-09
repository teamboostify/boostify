import { z } from "zod";
import { logger } from "./logger.js";

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  CLIENT_ID: z.string().min(1),
  GUILD_ID: z.string().optional(),
  GREET_CHANNEL_ID: z.string().min(1).optional(),
  LOG_CHANNEL_ID: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}

const result = envSchema.safeParse(process.env);

if (!result.success) {
  result.error.issues.forEach((issue) => {
    logger.fatal(`Missing or invalid env var: ${issue.path.join(".")} — ${issue.message}`);
  });
  process.exit(1);
}

Object.assign(process.env, result.data);