# Exercise 1.9 — Ping-pong application

## Behavior

The ping-pong application responds to GET requests on `/pingpong` with `pong N`, where `N` starts at 0 and increments with each request. The counter is stored in memory and resets when the process restarts.

## Build and run locally

Build the image:

```
docker build -t ping-pong:1.9 ./1.9-ping-pong
```

Run the container:

```
docker run --rm -p 3000:3000 -e PORT=3000 ping-pong:1.9
```

Test with curl:

```
curl http://localhost:3000/pingpong
curl http://localhost:3000/pingpong
```

## Deploy to Kubernetes

```
docker build -t ping-pong:1.9 ./1.9-ping-pong
k3d image import ping-pong:1.9 -c k3s-default
kubectl apply -f 1.9-ping-pong/manifests/deployment.yaml
kubectl apply -f 1.9-ping-pong/manifests/service.yaml
```
