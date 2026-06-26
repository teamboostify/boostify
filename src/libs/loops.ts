import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { logger } from "./logger.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

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
    logger.warn("No command files found — nothing to register.");
    return;
  }

  for (const file of loopFiles) {
    const filePath = path.join(loops, file);
    let fileInfo;
    try {
      fileInfo = (await import(pathToFileURL(filePath).href)).default;
    } catch (err) {
      logger.error(`Failed to load loop "${file}": ${err}`);
      continue;
    }

    if (!fileInfo?.runEvery || !fileInfo?.execute) {
      logger.warn(`Skipping ${file} - missing runEvery or execute`);
      continue;
    }

    const run = async () => {
      if (running) return;
      running = true;
      try {
        await fileInfo.execute();
      } catch (err) {
        logger.error(`Loop "${file}" failed: ${err}`);
      } finally {
        running = false;
      }
    };

    let running = false;
    void run();
    setInterval(() => {
      void run();
    }, fileInfo.runEvery * 1000);

    logger.success(`Loaded loop "${file}"`);
  }
}
