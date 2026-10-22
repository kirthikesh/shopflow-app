# Kubernetes manifests

Plain Kustomize. `base/` is environment-neutral; `overlays/dev/` points images at the dev registry.
Phase 6 moves these into the `shopflow-gitops` repo as Helm charts deployed by GitOps.

| What | How |
|---|---|
| Namespace | `shopflow`, Pod Security Standards: enforce `baseline`, warn on `restricted` |
| App pods | Non-root, read-only root filesystem, all capabilities dropped, seccomp `RuntimeDefault`, no service account token |
| Network | Default-deny ingress; each service accepts traffic only from the callers that need it (enforced by Cilium) |
| Secrets | `create-secrets.sh` builds them from Terraform outputs (or, in the pipeline, from Azure directly); nothing secret is committed |
| Data (dev only) | Postgres StatefulSet on an Azure managed disk, Redis, Mailpit |
| Messaging | Real Azure Service Bus (Standard), provisioned by `shopflow-infra` |
| Entry point | `frontend-public` Service of type `LoadBalancer` |

The pipeline deploys on every push to `main`. By hand, from the repo root:
`make images-local ACR=<registry name>` then `make deploy ACR=<registry name>`.
