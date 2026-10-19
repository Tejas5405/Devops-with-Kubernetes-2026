const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const LOG_INTERVAL_MS = 5000;
const LOG_DIR = "/usr/src/app/files";
const LOG_FILE = path.join(LOG_DIR, "log.txt");

const uuid = randomUUID();

fs.mkdirSync(LOG_DIR, { recursive: true });

const writeLogLine = () => {
  const timestamp = new Date().toISOString();
  const line = `${timestamp}: ${uuid}\n`;
  fs.appendFileSync(LOG_FILE, line);
};

writeLogLine();

const intervalId = setInterval(writeLogLine, LOG_INTERVAL_MS);

const shutdown = (signal) => {
  process.stdout.write(`Received ${signal}, shutting down...\n`);
  clearInterval(intervalId);
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
