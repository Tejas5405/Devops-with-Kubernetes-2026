# Exercise 5.7: Deploy Ping-pong to Knative Serverless

## Overview

Replace the standard Deployment-based ping-pong service with a Knative Serving service so it runs serverlessly (scale-to-zero, automatic scaling, on-demand instances).

## Prerequisites

Knative Serving must be installed on the k3d cluster (see `5.6-knative-serverless/`).

PostgreSQL must be running in the `exercises` namespace (from exercise 2.7 / 4.x).

## Deploy

```bash
# Deploy the Knative Service for ping-pong
kubectl apply -f manifests/ksvc-ping-pong.yaml

# Wait for it to be ready
kubectl wait ksvc ping-pong -n exercises --for=condition=Ready --timeout=300s

# Get the Knative service URL
kubectl get ksvc ping-pong -n exercises
```

## Access

Knative creates a Kubernetes Service of the same name, so the ping-pong endpoint is reachable inside the cluster at:

```
http://ping-pong.exercises.svc.cluster.local/pingpong
```

The log output app should call this fully-qualified DNS name:

```js
const PINGPONG_URL = process.env.PINGPONG_URL || "http://ping-pong.exercises.svc.cluster.local/pingpong";
```

### External access (browser)

To access from outside the cluster, use the Kourier ingress with the Knative service's DNS host:

```bash
kubectl get ksvc ping-pong -n exercises -o jsonpath='{.status.url}'
# e.g. http://ping-pong.exercises.192.168.240.3.sslip.io

curl -H "Host: ping-pong.exercises.192.168.240.3.sslip.io" http://localhost:8081/pingpong
```

## Files

- `manifests/ksvc-ping-pong.yaml` — Knative Service definition

## Notes

- Knative Serving handles scaling (including scale-to-zero) automatically
- The container keeps the same Postgres connection logic; only the deployment mechanism changes
- Use `http://ping-pong.exercises.svc.cluster.local/pingpong` (fully qualified) to avoid host-routing issues inside Knative
