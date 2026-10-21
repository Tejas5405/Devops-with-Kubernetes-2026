# Exercise 5.8: CNCF Cloud Native Landscape

## Products/Projects used (circled)

Directly used in this course:

| # | Project | Where used | Course exercise |
|---|---------|------------|-----------------|
| 1 | Kubernetes | Cluster orchestration (k3d/k3s) | All exercises |
| 2 | Helm | Installing Prometheus, NATS | 4.3, 4.6 |
| 3 | Prometheus | Metrics collection & monitoring | 4.3 |
| 4 | Grafana | Dashboards & visualization | 4.3 |
| 5 | Argo CD | GitOps continuous delivery | 4.7, 4.8 |
| 6 | Argo Rollouts | Progressive delivery / canary | 4.4 |
| 7 | NATS | Messaging / pub-sub | 4.6 |
| 8 | Istio | Service mesh (ambient mode) | 5.2, 5.3 |
| 9 | Kiali | Service mesh observability | 5.2, 5.3 |
| 10 | Knative | Serverless platform | 5.6, 5.7 |
| 11 | Kourier | Knative network layer (Ingress) | 5.6 |
| 12 | Docker / containerd | Container runtime & image building | All exercises |
| 13 | Docker Hub | Container image registry | All exercises |
| 14 | GitHub Actions | CI/CD pipelines | 3.6–3.12, 4.7, 4.8 |
| 15 | PostgreSQL | Database (stateful workload) | 2.7, 4.x |
| 16 | Nginx | Ingress controller / web server | 1.7, 5.4 |
| 17 | Node.js | Application runtime | All app exercises |
| 18 | Git | Version control | All exercises |

## Indirectly used (dependencies of tools above)

These were used because something we used depends on them:

| # | Project | Dependency chain | Notes |
|---|---------|------------------|-------|
| A | etcd | Kubernetes stores all cluster state in etcd | Kubernetes → etcd |
| B | CoreDNS | Kubernetes cluster DNS for service discovery | Kubernetes → CoreDNS |
| C | Flannel / Canal | k3d/k3s uses it for pod networking | k3d → k3s → CNI (Flannel) |
| D | Ingress NGINX | k3s Traefik replaced by Kourier/Ingress in some setups | Knative → Kourier → Envoy |
| E | Envoy | Kourier uses Envoy as the data plane proxy | Knative → Kourier → Envoy |
| F | containerd | k3s uses containerd as the CRI | k3s → containerd |

## Outside of the course

Used independently, not part of this course:

| # | Project | Context |
|---|---------|---------|
| X | Terraform | Infrastructure as code (personal projects) |
| Y | Vault | Secrets management (personal projects) |
| Z | Linkerd | Service mesh evaluated but not used in course |

## How to read this list

- **Items 1–18**: Directly used — I deployed, configured, or operated these as part of course exercises.
- **Items A–F**: Indirectly used — dependencies of the above; I didn't configure them directly but they were in the path.
- **Items X–Z**: Outside of course — used in other contexts, not part of DevOps with Kubernetes 2026.
