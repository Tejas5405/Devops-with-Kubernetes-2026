# Exercise 1.2 — Todo app

## Behavior

The application is a simple web server that listens on a configurable port (via the `PORT` environment variable, default 3000). When the server starts, it prints `Server started in port NNNN` to stdout.

## Build and run locally

Build the image:

```
docker build -t todo-app:1.2 ./1.2-todo-app
```

Run the container:

```
docker run --rm -p 3000:3000 -e PORT=3000 todo-app:1.2
```

Run with Node.js directly:

```
PORT=3000 node 1.2-todo-app/app.js
```

## Deploy to Kubernetes

Build and import the image into the k3d cluster:

```
docker build -t todo-app:1.2 ./1.2-todo-app
k3d image import todo-app:1.2 -c k3s-default
kubectl apply -f 1.2-todo-app/manifests/deployment.yaml
kubectl rollout status deployment/todo-app --timeout=120s
```

Inspect logs:

```
kubectl logs deployment/todo-app
```

## README

See the root README for the course submission index and release link.
