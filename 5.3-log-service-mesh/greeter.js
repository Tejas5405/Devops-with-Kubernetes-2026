const http = require("node:http");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const GREETING = process.env.GREETING || "Hello";

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/greet") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end(`${GREETING}\n`);
  } else if (req.method === "GET" && req.url === "/healthz") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("ok\n");
  } else {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain");
    res.end("Not found\n");
  }
});

server.listen(PORT, () => {
  console.log(`Greeter listening on port ${PORT}`);
});
