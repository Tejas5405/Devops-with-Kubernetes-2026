# Exercise 1.2 — Todo app

## Behavior

The application is a todo web server with the following features:

- Serves an HTML page with a cached image from Lorem Picsum (refreshed every 10 minutes)
- Image is cached in a Persistent Volume so it survives container restarts
- Input field (max 140 characters) for entering todos
- Send button
- List of hardcoded todos
- Listens on configurable port via `PORT` environment variable (default 3000)
- Logs `Server started in port NNNN` on startup

## Build and run locally

Build the image:

```
docker build -t todo-app:1.13 ./1.2-todo-app
```

Run the container:

```
docker run --rm -p 3000:3000 -e PORT=3000 todo-app:1.13
```

Run with Node.js directly:

```
PORT=3000 node 1.2-todo-app/app.js
```

## Deploy to Kubernetes

```
docker build -t todo-app:1.13 ./1.2-todo-app
k3d image import todo-app:1.13 -c k3s-default
kubectl apply -f storage/image-cache-pv.yaml
kubectl apply -f storage/image-cache-pvc.yaml
kubectl apply -f 1.2-todo-app/manifests/deployment.yaml
kubectl apply -f 1.2-todo-app/manifests/service.yaml
kubectl apply -f 1.2-todo-app/manifests/ingress.yaml
```

Test via Ingress at `http://localhost:8081/`.

## README

See the root README for the course submission index and release link.
