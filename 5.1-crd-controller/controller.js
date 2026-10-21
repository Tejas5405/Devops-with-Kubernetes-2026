const https = require("node:https");
const fs = require("node:fs");

const API_BASE = "https://kubernetes.default.svc";
const NAMESPACE = process.env.POD_NAMESPACE || "default";
const GROUP = "stable.dwk";
const VERSION = "v1";
const PLURAL = "dummysites";

const TOKEN = fs.readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/token", "utf8").trim();
const CA_CERT = fs.readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt");

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

const httpsOptions = { ca: CA_CERT };

function apiRequest(path, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers,
      ca: CA_CERT,
      rejectUnauthorized: true,
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function watchResource(resource, pathPrefix = "") {
  return new Promise((resolve) => {
    const path = `${pathPrefix}/apis/${GROUP}/${VERSION}/namespaces/${NAMESPACE}/${resource}?watch=true`;
    const opts = {
      hostname: "kubernetes.default.svc",
      port: 443,
      path,
      method: "GET",
      headers: { Authorization: `Bearer ${TOKEN}` },
      ca: CA_CERT,
      rejectUnauthorized: true,
      timeout: 0,
    };
    const req = https.request(opts, (res) => {
      let buffer = "";
      res.on("data", (chunk) => {
        buffer += chunk.toString();
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          try {
            const event = JSON.parse(line);
            handleEvent(resource, event);
          } catch (_) {}
        }
      });
    });
    req.on("error", (err) => {
      console.error(`Watch error for ${resource}:`, err.message);
      setTimeout(() => resolve(watchResource(resource, pathPrefix)), 5000);
    });
    req.end();
  });
}

function handleEvent(resource, event) {
  const type = event.type;
  const obj = event.object;

  if (resource === PLURAL) {
    if (type === "ADDED") {
      handleDummySiteAdded(obj);
    } else if (type === "DELETED") {
      handleDummySiteDeleted(obj);
    }
  } else if (resource === "deployments") {
    // handled implicitly
  }
}

function handleDummySiteAdded(dummySite) {
  const name = dummySite.metadata.name;
  const websiteUrl = dummySite.spec.website_url;
  console.log(`DummySite added: ${name}, website_url: ${websiteUrl}`);

  fetchWebsite(websiteUrl)
    .then((html) => {
      return Promise.all([
        createConfigMap(name, html),
        createDeployment(name),
        createService(name),
        createIngress(name),
      ]);
    })
    .then(() => {
      console.log(`Resources created for DummySite: ${name}`);
    })
    .catch((err) => {
      console.error(`Failed to create resources for ${name}:`, err.message);
    });
}

function handleDummySiteDeleted(dummySite) {
  const name = dummySite.metadata.name;
  console.log(`DummySite deleted: ${name}, cleaning up`);
  Promise.all([
    deleteResource("", "v1", "configmaps", `${name}-html`),
    deleteResource("apps", "v1", "deployments", name),
    deleteResource("", "v1", "services", `${name}-svc`),
    deleteResource("networking.k8s.io", "v1", "ingresses", `${name}-ingress`),
  ]).then(() => {
    console.log(`Cleanup done for DummySite: ${name}`);
  }).catch((err) => {
    console.error(`Cleanup error for ${name}:`, err.message);
  });
}

function fetchWebsite(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const mod = isHttps ? require("node:https") : require("node:http");
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "GET",
      ...(isHttps ? { rejectUnauthorized: false } : {}),
    };
    mod.get(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve(data || `<html><body><h1>Mirror of ${url}</h1><p>No content</p></body></html>`);
      });
    }).on("error", (err) => {
      resolve(`<html><body><h1>Mirror of ${url}</h1><p>Error fetching: ${err.message}</p></body></html>`);
    });
  });
}

function createConfigMap(name, html) {
  const body = {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: { name: `${name}-html`, namespace: NAMESPACE },
    data: { "index.html": html },
  };
  return apiRequest(`/api/v1/namespaces/${NAMESPACE}/configmaps`, "POST", body);
}

function createDeployment(name) {
  const body = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: { name, namespace: NAMESPACE },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: name } },
      template: {
        metadata: { labels: { app: name } },
        spec: {
          containers: [{
            name: "web",
            image: "nginx:alpine",
            ports: [{ containerPort: 80 }],
            volumeMounts: [{ name: "html", mountPath: "/usr/share/nginx/html" }],
          }],
          volumes: [{ name: "html", configMap: { name: `${name}-html` } }],
        },
      },
    },
  };
  return apiRequest(`/apis/apps/v1/namespaces/${NAMESPACE}/deployments`, "POST", body);
}

function createService(name) {
  const body = {
    apiVersion: "v1",
    kind: "Service",
    metadata: { name: `${name}-svc`, namespace: NAMESPACE },
    spec: {
      selector: { app: name },
      ports: [{ port: 80, targetPort: 80 }],
    },
  };
  return apiRequest(`/api/v1/namespaces/${NAMESPACE}/services`, "POST", body);
}

function createIngress(name) {
  const body = {
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: { name: `${name}-ingress`, namespace: NAMESPACE },
    spec: {
      rules: [{
        http: {
          paths: [{
            path: "/",
            pathType: "Prefix",
            backend: { service: { name: `${name}-svc`, port: { number: 80 } } },
          }],
        },
      }],
    },
  };
  return apiRequest(`/apis/networking.k8s.io/v1/namespaces/${NAMESPACE}/ingresses`, "POST", body);
}

function deleteResource(apiGroup, version, resource, name) {
  let path;
  if (apiGroup === "") {
    path = `/api/${version}/namespaces/${NAMESPACE}/${resource}/${name}`;
  } else {
    path = `/apis/${apiGroup}/${version}/namespaces/${NAMESPACE}/${resource}/${name}`;
  }
  return apiRequest(path, "DELETE").catch((err) => {
    console.error(`Delete error ${resource}/${name}:`, err.message);
    return { status: 0, body: null };
  });
}

function listExisting() {
  return apiRequest(`/apis/${GROUP}/${VERSION}/namespaces/${NAMESPACE}/${PLURAL}`)
    .then((res) => {
      const items = res.body.items || [];
      items.forEach((item) => handleDummySiteAdded(item));
    })
    .catch((err) => {
      console.error("Failed to list existing DummySites:", err.message);
    });
}

console.log("DummySite controller starting...");
console.log(`Namespace: ${NAMESPACE}`);

listExisting().then(() => {
  Promise.all([
    watchResource(PLURAL),
    watchResource("deployments"),
    watchResource("configmaps"),
    watchResource("services"),
    watchResource("ingresses", "/apis/networking.k8s.io/v1"),
  ]);
});
