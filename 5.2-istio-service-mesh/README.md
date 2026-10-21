# Exercise 5.2: Istio Service Mesh with Ambient Mode

## Setup Instructions

### 1. Install Istio CLI
```bash
curl -L https://istio.io/downloadIstio | sh -
export PATH=$PATH:/istio-*/bin
```

### 2. Setup Istio on k3d cluster

Prerequisites:
```bash
# Label the default namespace for ambient mesh
kubectl label namespace default istio.io/dataplane-mode=ambient

# Install Istio with ambient mode
istioctl install --set profile=demo -y

# Enable ambient mode for the namespace
kubectl label namespace default istio.io/dataplane-mode=ambient
```

For k3d specifically, ensure the cluster has:
- CNI enabled (cilium or similar)
- Ports 15021, 15020 exposed on the load balancer

### 3. Deploy Prometheus (required for Kiali)
```bash
kubectl apply -n monitoring -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml
# Or use existing prometheus from exercise 4.3
```

### 4. Deploy Kiali with Prometheus URL
```bash
kubectl apply -f manifests/kiali.yaml
```

### 5. Deploy Sample App
```bash
kubectl apply -f manifests/hello-deployment.yaml
kubectl apply -f manifests/hello-service.yaml
kubectl apply -f manifests/hello-gateway.yaml
kubectl apply -f manifests/hello-httproute.yaml
```

### 6. Generate traffic
```bash
for i in {1..20}; do curl -s http://localhost/; done
```

### 7. Access Kiali
```bash
kubectl port-forward svc/kiali 20001:20001 -n istio-system
```

### Files:
- `kiali.yaml` — Kiali ConfigMap with Prometheus URL
- `hello-deployment.yaml` — Hello world deployment
- `hello-service.yaml` — Hello world service
- `hello-gateway.yaml` — Istio Gateway
- `hello-httproute.yaml` — HTTPRoute for traffic routing

### Traffic Splitting (Canary)
Update `hello-httproute.yaml` to split traffic between v1 and v2:
```yaml
backendRefs:
- name: hello-svc-v1
  port: 80
  weight: 75
- name: hello-svc-v2
  port: 80
  weight: 25
```
