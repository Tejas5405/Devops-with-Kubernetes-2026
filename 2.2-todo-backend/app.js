const http = require("node:http");

const PORT = parseInt(process.env.PORT, 10) || 3000;

let todos = [];

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/todos") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(todos));
  } else if (req.method === "POST" && req.url === "/todos") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        const text = parsed.text;
        if (!text) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Todo text is required" }));
          return;
        }
        const todo = {
          id: Date.now().toString(),
          text,
          created_at: new Date().toISOString(),
        };
        todos.push(todo);
        res.statusCode = 201;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(todo));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
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
  console.log(`Todo backend listening on port ${PORT}`);
});
