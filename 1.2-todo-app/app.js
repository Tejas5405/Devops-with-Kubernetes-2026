const http = require("node:http");

const PORT = parseInt(process.env.PORT, 10) || 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Todo app\n");
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});
