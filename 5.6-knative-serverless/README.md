# Exercise 5.6: Knative Serving on k3d

## Prerequisites

Create a k3d cluster **without Traefik** (Knative needs its own network layer — Kourier):

```bash
k3d cluster create knative \
  --port 8082:30080@agent:0 \
  -p 8081:80@loadbalancer \
  --agents 2 \
  --k3s-arg "--disable=traefik@server:0" \
  --image rancher/k3s:v1.34.1-k3s1
```

Knative Serving requires Kubernetes 1.34+.

## Install Knative Serving

Install Knative CRDs and core:

```bash
# Knative CRDs
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-crds.yaml

# Knative core
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-core.yaml
```

Wait for pods to be ready:

```bash
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=controller -n knative-serving --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=webhook -n knative-serving --timeout=300s
```

## Install Kourier (network layer)

```bash
kubectl apply -f https://github.com/knative/net-kourier/releases/download/knative-v1.13.0/kourier.yaml
```

Configure Knative to use Kourier:

```bash
kubectl patch configmap/config-domain \
  -n knative-serving \
  --type merge \
  -p '{"data":{"example.com":""}}'

kubectl patch configmap/config-network \
  -n knative-serving \
  --type merge \
  -p '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'
```

Wait for Kourier:

```bash
kubectl wait --for=condition=ready pod -l app=3scale-kourier-gateway -n kourier-system --timeout=300s
```

## Configure Magic DNS (slip.io)

Knative services get DNS names like `hello.default.example.com`. Magic DNS uses `sslip.io` so no external DNS is needed:

```bash
kubectl patch configmap/config-domain \
  -n knative-serving \
  --type merge \
  -p '{"data":{"192.168.240.3.sslip.io":""}}'
```

Replace `192.168.240.3` with your k3d loadbalancer node IP:

```bash
kubectl get nodes -o wide
# or
kubectl get svc -n kourier-system
```

## Verify installation

```bash
kubectl get pods -n knative-serving
kubectl get pods -n knative-serving-ingress
kubectl get svc -n kourier-system
```

All pods should be Running/Ready. If any crash, check logs:

```bash
kubectl logs -n knative-serving deploy/controller
kubectl logs -n knative-serving deploy/webhook
```

## Access a Knative service from host

```bash
curl -H "Host: hello.default.192.168.240.3.sslip.io" http://localhost:8081
```

## Files

- `install-knative.sh` — full installation script
