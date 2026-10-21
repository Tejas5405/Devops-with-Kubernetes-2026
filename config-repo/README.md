# Configuration Repository

This repository contains only Kubernetes configuration (Kustomize manifests, ArgoCD Applications).
The application code lives in a separate repository: https://github.com/Tejas5405/K8

## Structure

```
config-repo/
├── base/
│   ├── kustomization.yaml
│   ├── todo-app-deployment.yaml
│   ├── todo-app-service.yaml
│   ├── todo-app-configmap.yaml
│   ├── todo-app-db-configmap.yaml
│   ├── todo-app-db-secret.yaml
│   ├── todo-app-postgres-service.yaml
│   ├── todo-app-postgres-statefulset.yaml
│   ├── broadcaster-deployment.yaml
│   ├── broadcaster-service.yaml
│   └── broadcaster-configmap.yaml
├── overlays/
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   ├── staging-patch.yaml
│   │   └── db-configmap-patch.yaml
│   └── production/
│       ├── kustomization.yaml
│       ├── cronjob.yaml
│       ├── production-patch.yaml
│       └── db-configmap-patch.yaml
└── argocd/
    ├── staging-application.yaml
    └── production-application.yaml
```

## GitOps Flow

1. **Code repo** (`Tejas5405/K8`): Developer pushes code changes → GitHub Action builds/pushes Docker images → updates image tags in this config repo
2. **Config repo** (this repo): ArgoCD watches this repo and applies changes to the cluster
3. Images are referenced by digest/tag in kustomization.yaml files
4. Separation of concerns: code changes don't require config repo access, and config changes don't require code repo access
