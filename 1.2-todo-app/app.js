const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const CACHE_DIR = process.env.CACHE_DIR || "/data/cache";
const IMAGE_FILE = path.join(CACHE_DIR, "image.jpg");
const META_FILE = path.join(CACHE_DIR, "meta.json");
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS, 10) || 10 * 60 * 1000;
const IMAGE_URL = process.env.IMAGE_URL || "https://picsum.photos/1200";

fs.mkdirSync(CACHE_DIR, { recursive: true });

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

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
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
    const html = `<!DOCTYPE html>
<html>
<head><title>Todo App</title></head>
<body>
<h1>Todo App</h1>
<img src="/image" alt="Random image" style="max-width:100%;">
<form>
<input type="text" name="todo" placeholder="Enter a todo (max 140 chars)" maxlength="140" style="width:300px; margin-bottom:10px; display:block;">
<button type="submit">Send</button>
</form>
<h2>Todos</h2>
<ul>
<li>Learn Kubernetes</li>
<li>Deploy applications</li>
<li>Configure networking</li>
<li>Manage storage</li>
</ul>
<p>Server is running.</p>
</body>
</html>`;
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  } else if (req.method === "GET" && req.url === "/image") {
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
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain");
    res.end("Not found\n");
  }
});

server.listen(PORT, () => {
  console.log(`Todo app listening on port ${PORT}`);
});
