#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="knative"
KN_VERSION="v1.13.0"

echo "==> Creating k3d cluster (no Traefik)"
k3d cluster create "$CLUSTER_NAME" \
  --port 8082:30080@agent:0 \
  -p 8081:80@loadbalancer \
  --agents 2 \
  --k3s-arg "--disable=traefik@server:0" \
  --image rancher/k3s:v1.34.1-k3s1

echo "==> Waiting for k3s to be ready"
kubectl wait --for=condition=ready node --all --timeout=300s

echo "==> Installing Knative Serving CRDs"
kubectl apply -f "https://github.com/knative/serving/releases/download/knative-${KN_VERSION}/serving-crds.yaml"

echo "==> Installing Knative Serving core"
kubectl apply -f "https://github.com/knative/serving/releases/download/knative-${KN_VERSION}/serving-core.yaml"

echo "==> Waiting for Knative control plane"
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=controller -n knative-serving --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=webhook -n knative-serving --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=autoscaler -n knative-serving --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=activator -n knative-serving --timeout=300s

echo "==> Installing Kourier (network layer)"
kubectl apply -f "https://github.com/knative/net-kourier/releases/download/knative-${KN_VERSION}/kourier.yaml"

echo "==> Waiting for Kourier gateway"
kubectl wait --for=condition=ready pod -l app=3scale-kourier-gateway -n kourier-system --timeout=300s

echo "==> Configuring Knative to use Kourier"
kubectl patch configmap/config-network \
  -n knative-serving \
  --type merge \
  -p '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'

echo "==> Detecting k3d loadbalancer IP"
INGRESS_IP=$(kubectl get svc -n kourier-system kourier -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$INGRESS_IP" ]; then
  # Fallback: use node IP
  INGRESS_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
fi
echo "Ingress IP: $INGRESS_IP"

echo "==> Configuring Magic DNS (slip.io)"
kubectl patch configmap/config-domain \
  -n knative-serving \
  --type merge \
  -p "{\\\"data\\\":{\\\"$INGRESS_IP.sslip.io\\\":\\\"\\\"}}"

echo "==> Done. Knative Serving is installed."
echo "    Access services via: curl -H \"Host: <ksvc-name>.default.$INGRESS_IP.sslip.io\" http://localhost:8081"
