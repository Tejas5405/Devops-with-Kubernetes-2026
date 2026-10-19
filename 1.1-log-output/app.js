const { randomUUID } = require("node:crypto");

const LOG_INTERVAL_MS = 5000;

const logMessage = (uuid) => {
  const timestamp = new Date().toISOString();
  process.stdout.write(`${timestamp}: ${uuid}\n`);
};

const uuid = randomUUID();

logMessage(uuid);

const intervalId = setInterval(() => {
  logMessage(uuid);
}, LOG_INTERVAL_MS);

const shutdown = (signal) => {
  process.stdout.write(`Received ${signal}, shutting down...\n`);
  clearInterval(intervalId);
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
