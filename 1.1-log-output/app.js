const { randomUUID } = require("node:crypto");
const http = require("node:http");
const fs = require("node:fs");

const LOG_INTERVAL_MS = 5000;
const HTTP_PORT = parseInt(process.env.PORT, 10) || 3000;
const COUNTER_FILE = "/data/counter.txt";
const INFO_FILE = "/config/information.txt";
const MESSAGE = process.env.MESSAGE || "not set";
const PINGPONG_URL = process.env.PINGPONG_URL || "http://ping-pong-svc.exercises.svc.cluster.local:2346/pingpong";

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

const readInfo = () => {
  try {
    return fs.readFileSync(INFO_FILE, "utf8").trim();
  } catch (err) {
    return "information.txt not found";
  }
};

const infoContent = readInfo();

let pingpongReady = false;

const checkPingPong = () => {
  http.get(PINGPONG_URL, (res) => {
    pingpongReady = res.statusCode === 200;
  }).on("error", () => {
    pingpongReady = false;
  });
};

setInterval(checkPingPong, 5000);
checkPingPong();

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    const timestamp = new Date().toISOString();
    const pongs = readCounter();
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end(`file content: ${infoContent}\nenv variable: MESSAGE=${MESSAGE}\n${timestamp}: ${uuid}.\nPing / Pongs: ${pongs}\n`);
  } else if (req.method === "GET" && req.url === "/healthz") {
    if (pingpongReady) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain");
      res.end("ok\n");
    } else {
      res.statusCode = 503;
      res.setHeader("Content-Type", "text/plain");
      res.end("pingpong not reachable\n");
    }
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
