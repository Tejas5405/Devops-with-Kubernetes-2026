const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const { connect, StringCodec } = require("nats");

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

const NATS_URL = process.env.NATS_URL || "nats://my-nats.nats.svc.cluster.local:4222";
const NATS_SUBJECT = "todos";

let nc = null;
const sc = StringCodec();

const connectNATS = async () => {
  while (true) {
    try {
      nc = await connect({ servers: NATS_URL });
      console.log("Connected to NATS");
      break;
    } catch (err) {
      console.error("NATS connection failed, retrying in 2s...", err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
};

const publishTodoEvent = async (action, payload) => {
  if (!nc || nc.isClosed()) return;
  try {
    const message = JSON.stringify({ action, ...payload, ts: new Date().toISOString() });
    await nc.publish(NATS_SUBJECT, sc.encode(message));
  } catch (err) {
    console.error("Failed to publish NATS message:", err.message);
  }
};

fs.mkdirSync(CACHE_DIR, { recursive: true });

const MAX_TODO_LENGTH = 140;
let isHealthy = true;
let dbReady = false;
let client = null;

const createClient = () => {
  return new Client({
    host: PG_HOST,
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASSWORD,
    database: PG_DATABASE,
  });
};

const connectWithRetry = async () => {
  while (!dbReady) {
    client = createClient();
    try {
      await client.connect();
      dbReady = true;
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
      try {
        await client.end();
      } catch (_) {}
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
};

connectWithRetry();
connectNATS();

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
      `SELECT id, text FROM todos ORDER BY created_at DESC`
    );
    const todos = result.rows.map((row) => `<li>${row.text} <form method="POST" action="/todos/${row.id}" style="display:inline;"><button type="submit">Done</button></form></li>`).join("");
    return todos || "<li>No todos yet.</li>";
  } catch (err) {
    return "<li>Error loading todos.</li>";
  }
};

const addTodo = async (text) => {
  try {
    await client.query(`INSERT INTO todos (text) VALUES ($1)`, [text]);
    await publishTodoEvent("created", { text });
  } catch (err) {
    console.error("Error adding todo:", err.message);
  }
};

const markTodoDone = async (id) => {
  try {
    await client.query(`UPDATE todos SET text = CONCAT('[DONE] ', text) WHERE id = $1`, [id]);
    await publishTodoEvent("updated", { id });
  } catch (err) {
    console.error("Error marking todo done:", err.message);
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
<form method="POST" action="/break" style="margin-top:20px; display:inline;">
<button type="submit" style="background-color:#ff4444;color:white;">Break App</button>
</form>
<form method="POST" action="/unbreak" style="display:inline;margin-left:10px;">
<button type="submit" style="background-color:#44ff44;color:black;">Unbreak App</button>
</form>
<p id="health">Status: ${isHealthy ? "Healthy" : "UNHEALTHY"}</p>
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
  } else if (req.method === "POST" && req.url === "/break") {
    logRequest("POST", "/break");
    isHealthy = false;
    res.statusCode = 302;
    res.setHeader("Location", "/");
    res.end();
  } else if (req.method === "POST" && req.url === "/unbreak") {
    logRequest("POST", "/unbreak");
    isHealthy = true;
    res.statusCode = 302;
    res.setHeader("Location", "/");
    res.end();
  } else if (req.method === "GET" && req.url === "/healthz") {
    logRequest("GET", "/healthz");
    if (dbReady && isHealthy) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "ok" }));
    } else {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "unhealthy", dbReady, isHealthy }));
    }
  } else if (req.method === "GET" && req.url === "/metrics") {
    logRequest("GET", "/metrics");
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.end(`# HELP http_requests_total Total number of HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total 1\n# HELP todo_app_health Application health status (1=healthy, 0=unhealthy)\n# TYPE todo_app_health gauge\ntodo_app_health ${isHealthy ? 1 : 0}\n`);
  } else if (req.method === "PUT" && req.url.startsWith("/todos/")) {
    const id = req.url.split("/").pop();
    logRequest("POST", req.url);
    await markTodoDone(id);
    res.statusCode = 302;
    res.setHeader("Location", "/");
    res.end();
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
