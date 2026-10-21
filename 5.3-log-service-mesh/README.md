# Exercise 5.3: Log App Service Mesh Edition

## Architecture

- Log output app calls greeter service via HTTP GET to `/greet`
- Greeter service has two versions (v1 and v2) with traffic split 75/25
- HTTPRoute `greeter` routes `/greet` path with weighted backendRefs
- All traffic goes through Istio ambient mesh

## Deployment

```bash
# Label namespace for ambient mesh
kubectl label namespace default istio.io/dataplane-mode=ambient

# Deploy greeter (v1 and v2)
kubectl apply -f manifests/greeter-deployments.yaml

# Deploy log output app
kubectl apply -f manifests/log-output-deployment.yaml
kubectl apply -f manifests/log-output-service.yaml

# Deploy HTTPRoute for traffic splitting
kubectl apply -f manifests/greeter-httproute.yaml

# Generate traffic to see the split
for i in {1..50}; do curl -s http://log-output-service-mesh-svc.default.svc.cluster.local:2345/; done
```

## Traffic Split

- v1 gets 75% of traffic (greeting: "Hello from greeter v1")
- v2 gets 25% of traffic (greeting: "Hello from greeter v2")

Verify with Kiali to see the traffic split in the mesh graph.
