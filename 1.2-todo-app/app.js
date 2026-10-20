const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const CACHE_DIR = process.env.CACHE_DIR || "/data/cache";
const IMAGE_FILE = path.join(CACHE_DIR, "image.jpg");
const META_FILE = path.join(CACHE_DIR, "meta.json");
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS, 10) || 10 * 60 * 1000;
const IMAGE_URL = process.env.IMAGE_URL || "https://picsum.photos/1200";

const PG_HOST = process.env.PG_HOST || "postgres-svc.project.svc.cluster.local";
const PG_PORT = parseInt(process.env.PG_PORT, 10) || 5432;
const PG_USER = process.env.PG_USER || "postgres";
const PG_PASSWORD = process.env.PG_PASSWORD || "example";
const PG_DATABASE = process.env.PG_DATABASE || "postgres";

fs.mkdirSync(CACHE_DIR, { recursive: true });

const client = new Client({
  host: PG_HOST,
  port: PG_PORT,
  user: PG_USER,
  password: PG_PASSWORD,
  database: PG_DATABASE,
});

let connected = false;

const connectWithRetry = async () => {
  while (!connected) {
    try {
      await client.connect();
      connected = true;
      await client.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id SERIAL PRIMARY KEY,
          text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log("Connected to Postgres and initialized todos table");
    } catch (err) {
      console.error("Postgres connection failed, retrying in 2s...", err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
};

connectWithRetry();

const isCacheValid = () => {
  try {
    const meta = JSON.parse(fs.readFileSync(META_FILE, "utf8"));
    return Date.now() - meta.fetchedAt < CACHE_TTL_MS;
  } catch (err) {
    return false;
  }
};

const fetchImage = (maxRedirects = 5) => {
  return new Promise((resolve, reject) => {
    const fetch = (url, redirects) => {
      if (redirects <= 0) {
        return reject(new Error("Too many redirects"));
      }
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetch(res.headers.location, redirects - 1);
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          fs.writeFileSync(IMAGE_FILE, buffer);
          fs.writeFileSync(META_FILE, JSON.stringify({ fetchedAt: Date.now() }));
          resolve();
        });
      }).on("error", reject);
    };
    fetch(IMAGE_URL, maxRedirects);
  });
};

const getTodosHtml = async () => {
  try {
    const result = await client.query(
      `SELECT text FROM todos ORDER BY created_at DESC`
    );
    const todos = result.rows.map((row) => `<li>${row.text}</li>`).join("");
    return todos || "<li>No todos yet.</li>";
  } catch (err) {
    return "<li>Error loading todos.</li>";
  }
};

const MAX_TODO_LENGTH = 140;

const addTodo = async (text) => {
  try {
    await client.query(`INSERT INTO todos (text) VALUES ($1)`, [text]);
  } catch (err) {
    console.error("Error adding todo:", err.message);
  }
};

const logRequest = (method, url, detail = "") => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${method} ${url} ${detail}`);
};

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    logRequest("GET", "/");
    if (!isCacheValid()) {
      try {
        await fetchImage();
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain");
        res.end("Failed to fetch image\n");
        return;
      }
    }
    const todosHtml = await getTodosHtml();
    const html = `<!DOCTYPE html>
<html>
<head><title>Todo App</title></head>
<body>
<h1>Todo App</h1>
<img src="/image" alt="Random image" style="max-width:100%;">
<form method="POST" action="/">
<input type="text" name="todo" placeholder="Enter a todo (max 140 chars)" maxlength="140" style="width:300px; margin-bottom:10px; display:block;">
<button type="send">Send</button>
</form>
<h2>Todos</h2>
<ul>
${todosHtml}
</ul>
<p>Server is running.</p>
</body>
</html>`;
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  } else if (req.method === "POST" && req.url === "/") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      const params = new URLSearchParams(body);
      const todo = params.get("todo");
      logRequest("POST", "/", `todo="${todo || ""}"`);
      if (!todo) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain");
        res.end("Todo text is required\n");
        return;
      }
      if (todo.length > MAX_TODO_LENGTH) {
        console.error(
          `[${new Date().toISOString()}] REJECTED todo too long (${todo.length} chars): "${todo.substring(0, 50)}..."`
        );
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain");
        res.end(`Todo exceeds ${MAX_TODO_LENGTH} character limit\n`);
        return;
      }
      await addTodo(todo);
      res.statusCode = 302;
      res.setHeader("Location", "/");
      res.end();
    });
  } else if (req.method === "GET" && req.url === "/image") {
    logRequest("GET", "/image");
    try {
      const image = fs.readFileSync(IMAGE_FILE);
      res.statusCode = 200;
      res.setHeader("Content-Type", "image/jpeg");
      res.end(image);
    } catch (err) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain");
      res.end("Image not found\n");
    }
  } else {
    logRequest(req.method, req.url);
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain");
    res.end("Not found\n");
  }
});

server.listen(PORT, () => {
  console.log(`Todo app listening on port ${PORT}`);
});
