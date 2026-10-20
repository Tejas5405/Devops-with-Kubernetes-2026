const http = require("node:http");
const { Client } = require("pg");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const PG_HOST = process.env.PG_HOST || "postgres-svc.exercises.svc.cluster.local";
const PG_PORT = parseInt(process.env.PG_PORT, 10) || 5432;
const PG_USER = process.env.PG_USER || "postgres";
const PG_PASSWORD = process.env.PG_PASSWORD || "example";
const PG_DATABASE = process.env.PG_DATABASE || "postgres";

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
        CREATE TABLE IF NOT EXISTS counters (
          name TEXT PRIMARY KEY,
          value INTEGER NOT NULL DEFAULT 0
        )
      `);
      await client.query(`
        INSERT INTO counters (name, value) VALUES ('pingpong', 0)
        ON CONFLICT (name) DO NOTHING
      `);
      console.log("Connected to Postgres and initialized counters table");
    } catch (err) {
      console.error("Postgres connection failed, retrying in 2s...", err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
};

connectWithRetry();

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/pingpong") {
    client
      .query(
        `UPDATE counters SET value = value + 1 WHERE name = 'pingpong' RETURNING value`
      )
      .then((result) => {
        const counter = result.rows[0].value;
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain");
        res.end(`pong ${counter}\n`);
      })
      .catch((err) => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain");
        res.end("Database error\n");
      });
  } else {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain");
    res.end("Not found\n");
  }
});

server.listen(PORT, () => {
  console.log(`Ping-pong server listening on port ${PORT}`);
});
