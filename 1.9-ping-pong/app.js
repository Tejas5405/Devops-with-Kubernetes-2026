const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const COUNTER_FILE = "/data/counter.txt";

let counter = 0;

const readCounter = () => {
  try {
    const data = fs.readFileSync(COUNTER_FILE, "utf8");
    counter = parseInt(data.trim(), 10) || 0;
  } catch (err) {
    counter = 0;
  }
};

const writeCounter = () => {
  fs.writeFileSync(COUNTER_FILE, counter.toString());
};

readCounter();

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/pingpong") {
    const response = `pong ${counter}`;
    counter += 1;
    writeCounter();
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end(response + "\n");
  } else {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain");
    res.end("Not found\n");
  }
});

server.listen(PORT, () => {
  console.log(`Ping-pong server listening on port ${PORT}`);
});
