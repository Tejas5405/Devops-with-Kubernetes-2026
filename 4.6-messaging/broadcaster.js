const http = require("node:http");
const { connect, StringCodec } = require("nats");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const NATS_URL = process.env.NATS_URL || "nats://my-nats.nats.svc.cluster.local:4222";
const NATS_SUBJECT = "todos";
const QUEUE_GROUP = "broadcaster";
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const LOG_ONLY = !WEBHOOK_URL;

let nc = null;
const sc = StringCodec();
let webhookHealthy = !LOG_ONLY;

const connectNATS = async () => {
  while (true) {
    try {
      nc = await connect({ servers: NATS_URL });
      console.log("Broadcaster connected to NATS");
      break;
    } catch (err) {
      console.error("NATS connection failed, retrying in 2s...", err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
};

const checkWebhookHealth = async () => {
  if (LOG_ONLY) {
    webhookHealthy = true;
    return;
  }
  try {
    const resp = await fetchWebhook(WEBHOOK_URL, { method: "GET" }, null);
    webhookHealthy = resp.ok;
  } catch (_) {
    webhookHealthy = false;
  }
};

const fetchWebhook = (url, options, body) => {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const mod = isHttps ? require("node:https") : require("node:http");
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || "POST",
      headers: { "Content-Type": "application/json", ...options.headers },
    };
    const req = mod.request(reqOptions, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const forwardToWebhook = async (message) => {
  if (LOG_ONLY) {
    console.log(`[LOG-ONLY] Would forward to webhook: ${JSON.stringify(message)}`);
    return true;
  }
  if (!webhookHealthy) {
    console.log("Webhook not healthy, skipping forward");
    return false;
  }
  try {
    const result = await fetchWebhook(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" } }, message);
    if (result.ok) {
      console.log(`Forwarded to webhook: ${result.status}`);
      return true;
    } else {
      console.error(`Webhook returned ${result.status}`);
      webhookHealthy = false;
      return false;
    }
  } catch (err) {
    console.error("Failed to forward to webhook:", err.message);
    webhookHealthy = false;
    return false;
  }
};

const server = http.createServer(async (req, res) => {
  if (req.url === "/healthz") {
    res.statusCode = (nc && !nc.isClosed() && webhookHealthy) ? 200 : 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: webhookHealthy && nc && !nc.isClosed() ? "ok" : "unhealthy", nats: nc && !nc.isClosed(), webhook: webhookHealthy, logOnly: LOG_ONLY }));
  } else {
    res.statusCode = 404;
    res.end("Not found\n");
  }
});

server.listen(PORT, () => {
  console.log(`Broadcaster listening on port ${PORT}`);
});

connectNATS().then(() => {
  setInterval(checkWebhookHealth, 10000);
  checkWebhookHealth();

  nc.subscribe(NATS_SUBJECT, { queue: QUEUE_GROUP }, async (msg) => {
    const data = sc.decode(msg.data);
    console.log(`Received NATS message: ${data}`);
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (_) {
      parsed = { raw: data };
    }
    if (nc && !nc.isClosed() && webhookHealthy) {
      await forwardToWebhook(parsed);
    }
  });
});
