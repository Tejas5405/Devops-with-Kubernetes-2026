# Exercise 1.1 — Log output

## Behavior

The application generates one random UUID when the process starts and stores it in memory. It immediately prints the UUID together with an ISO 8601 timestamp, then prints the same UUID every five seconds. A new UUID is generated only when a new application process starts.

Example output:

```
2026-03-30T12:15:17.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43
2026-03-30T12:15:22.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43
```

The application handles SIGTERM and SIGINT gracefully.

## Build and run locally

Build the image:

```
docker build -t log-output:1.1 ./1.1-log-output
```

Run the container:

```
docker run --rm log-output:1.1
```

Run with Node.js directly:

```
node 1.1-log-output/app.js
```

## Deploy to Kubernetes

Apply the deployment manifest (image must be available in the cluster, e.g. via `k3d image import`):

```
kubectl apply -f 1.1-log-output/manifests/deployment.yaml
kubectl rollout status deployment/log-output --timeout=120s
```

Inspect logs:

```
kubectl logs deployment/log-output --timestamps=false
kubectl logs -f deployment/log-output
```

## README

See the root README for the course submission index and release link.
