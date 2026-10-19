const http = require("node:http");

const PORT = parseInt(process.env.PORT, 10) || 3000;

let counter = 0;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/pingpong") {
    const response = `pong ${counter}`;
    counter += 1;
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
