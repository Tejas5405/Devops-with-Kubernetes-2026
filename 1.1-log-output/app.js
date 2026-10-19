const { randomUUID } = require("node:crypto");
const http = require("node:http");
const fs = require("node:fs");

const LOG_INTERVAL_MS = 5000;
const HTTP_PORT = parseInt(process.env.PORT, 10) || 3000;
const COUNTER_FILE = "/data/counter.txt";

const logMessage = (uuid) => {
  const timestamp = new Date().toISOString();
  process.stdout.write(`${timestamp}: ${uuid}\n`);
};

const uuid = randomUUID();

logMessage(uuid);

const intervalId = setInterval(() => {
  logMessage(uuid);
}, LOG_INTERVAL_MS);

const readCounter = () => {
  try {
    const data = fs.readFileSync(COUNTER_FILE, "utf8");
    return data.trim();
  } catch (err) {
    return "0";
  }
};

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    const timestamp = new Date().toISOString();
    const pongs = readCounter();
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end(`${timestamp}: ${uuid}.\nPing / Pongs: ${pongs}\n`);
  } else {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain");
    res.end("Not found\n");
  }
});

server.listen(HTTP_PORT, () => {
  console.log(`HTTP server listening on port ${HTTP_PORT}`);
});

const shutdown = (signal) => {
  process.stdout.write(`Received ${signal}, shutting down...\n`);
  clearInterval(intervalId);
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
