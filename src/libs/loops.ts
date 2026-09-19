import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { logger } from "./logger.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

interface LoopModule {
  schedule: string;
  execute: () => void | Promise<void>;
}

export async function loadLoops() {
  const loops = path.join(__dirname, "..", "loops");
  if (!fs.existsSync(loops)) {
    logger.warn(
      "Loops folder wasn't found — this may cause the system to be slow, and not lightweight!",
    );
    return;
  }

  const loopFiles = fs
    .readdirSync(loops)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

  if (loopFiles.length === 0) {
    logger.warn("No loop files found — nothing to schedule.");
    return;
  }

  for (const file of loopFiles) {
    const filePath = path.join(loops, file);
    let fileInfo: LoopModule | undefined;
    try {
      fileInfo = (await import(pathToFileURL(filePath).href)).default;
    } catch (err) {
      logger.error(`Failed to load loop "${file}": ${err}`);
      continue;
    }

    if (!fileInfo?.schedule || typeof fileInfo.execute !== "function") {
      logger.warn(`Skipping ${file} - missing schedule or execute`);
      continue;
    }

    const run = async () => {
      try {
        await fileInfo.execute();
      } catch (err) {
        logger.error(`Loop "${file}" failed: ${err}`);
      }
    };

    try {
      Bun.cron(fileInfo.schedule, () => run(), { tz: "UTC" });
      void run();
      logger.success(`Loaded loop "${file}" (schedule: ${fileInfo.schedule})`);
    } catch (err) {
      logger.error(
        `Failed to schedule loop "${file}" with "${fileInfo.schedule}": ${err}`,
      );
    }
  }
}