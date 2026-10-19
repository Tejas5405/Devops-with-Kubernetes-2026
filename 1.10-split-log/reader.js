const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const LOG_FILE = "/usr/src/app/files/log.txt";

const server = http.createServer((req, res) => {
  if (req.method === "GET") {
    let content = "";
    try {
      content = fs.readFileSync(LOG_FILE, "utf8");
    } catch (err) {
      content = "No log data available yet.\n";
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end(content);
  } else {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain");
    res.end("Not found\n");
  }
});

server.listen(PORT, () => {
  console.log(`Reader server listening on port ${PORT}`);
});
