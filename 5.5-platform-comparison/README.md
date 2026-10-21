# Exercise 5.5: Platform Comparison — Rancher vs OpenShift

## Verdict

**Rancher is better** for our use case (small/medium teams wanting multi-cluster Kubernetes management with flexibility and lower cost).

## Comparison

### Rancher

**Pros:**
- Open source (Rancher core is Apache 2.0), no licensing fees for the management plane
- Works with any Kubernetes distribution — k3s, RKE, EKS, GKE, AKS, self-hosted
- Multi-cluster management from a single pane of glass
- Lightweight — runs on modest hardware, good for k3d/k3s home labs
- Simple UI for cluster provisioning, app catalog (Helm), and user/rbac management
- Active community and broad integrations

**Cons:**
- Advanced features (continuous delivery, monitoring, logging, backup) require paid Rancher Prime or separate open-source components (Rancher Backup, Longhorn, Fleet)
- Less enterprise-grade out-of-the-box than OpenShift (no built-in source-to-image, no bundled CI/CD)
- Support is community unless you pay for Rancher Prime

### OpenShift (Red Hat)

**Pros:**
- Enterprise-grade, fully supported by Red Hat
- Security-first by default (restricted SCCs, immutable containers, SELinux)
- Bundled CI/CD (OpenShift Pipelines/Pipelines-as-Code), monitoring (Prometheus), logging, service mesh
- Certified Kubernetes distribution — predictable upgrades and lifecycle
- Strong enterprise ecosystem and partner support

**Cons:**
- Expensive — Red Hat subscription required for production use
- Heavier — runs on RHEL/CoreOS, more resource overhead than k3s/Rancher
- Opinionated — locks you into Red Hat's stack (CRI-O, OVNKubernetes, etc.)
- Steeper learning curve; stricter defaults make simple dev workflows harder

## Why Rancher wins here

For a learning/homelab/k3d context like this course, Rancher wins because it's open source, lightweight, distribution-agnostic, and lets you manage multiple k3s/k3d clusters without paying Red Hat licensing or wrestling with OpenShift's security constraints. OpenShift is the better choice for regulated enterprises that need a fully supported, batteries-included platform.
