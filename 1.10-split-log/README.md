# Exercise 1.10 — Split log output into two containers

## Behavior

The Log output application is split into two containers running in the same pod:

1. **log-writer**: Generates a random UUID on startup and writes a line with the UUID and ISO 8601 timestamp to a shared file every 5 seconds.
2. **log-reader**: HTTP server that reads the shared file and returns its contents via a GET endpoint.

Both containers share an `emptyDir` volume mounted at `/usr/src/app/files`.

## Build and deploy

Build both images:

```
docker build -t log-writer:1.10 -f Dockerfile.writer .
docker build -t log-reader:1.10 -f Dockerfile.reader .
```

Import into k3d:

```
k3d image import log-writer:1.10 -c k3s-default
k3d image import log-reader:1.10 -c k3s-default
```

Deploy:

```
kubectl apply -f manifests/deployment.yaml
kubectl apply -f manifests/service.yaml
kubectl apply -f manifests/ingress.yaml
```

Test via Ingress at `http://localhost:8081/split`.
