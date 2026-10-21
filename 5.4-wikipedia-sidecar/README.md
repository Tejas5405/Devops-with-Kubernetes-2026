# Exercise 5.4: Wikipedia with init container and sidecar

## Architecture

- **Init container** (`wiki-init`): curls the Kubernetes Wikipedia page and saves it to the shared `emptyDir` volume before nginx starts
- **Main container** (`nginx`): serves whatever content is in `/usr/share/nginx/html`
- **Sidecar container** (`wiki-sidecar`): periodically curls a random Wikipedia page and overwrites `index.html` in the shared volume

## Deployment

```bash
# Without sidecar (init only)
kubectl apply -f manifests/wikipedia-pod.yaml

# With sidecar (init + sidecar)
kubectl apply -f manifests/wikipedia-pod-with-sidecar.yaml
```

## Access

```bash
kubectl port-forward pod/wikipedia-pod-with-sidecar 8080:80
curl http://localhost:8080
```

## How it works

1. The init container runs first, fetching the Kubernetes Wikipedia page into the shared volume
2. Once the init container completes successfully, the nginx container starts and serves the page
3. The sidecar runs continuously in the background, waiting a random time between 5-15 minutes (300-900 seconds), then fetches a random Wikipedia page and replaces `index.html`
4. nginx continues serving whatever content is currently in the volume
