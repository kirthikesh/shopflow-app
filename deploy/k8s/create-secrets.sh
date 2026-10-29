#!/usr/bin/env bash
# Creates the shopflow-secrets Kubernetes secret in one environment's namespace.
# Values never touch Git: Argo CD deploys everything else from shopflow-gitops,
# but the secret is created here, by the pipeline.
#   NS                            target namespace (default shopflow-dev)
#   POSTGRES_PASSWORD             generated once, then kept (changing it would lock out the existing database)
#   SERVICEBUS_CONNECTION_STRING  taken from the environment if set (the pipeline does this),
#                                 otherwise read from the shopflow-infra Terraform outputs
# Phase 7 replaces this with Key Vault + Workload Identity.
set -euo pipefail

INFRA_DIR="${INFRA_DIR:-../shopflow-infra}"
NS="${NS:-shopflow-dev}"

kubectl get namespace "$NS" >/dev/null 2>&1 || kubectl create namespace "$NS"
# Pod Security Standards, same as Argo CD sets: Postgres needs "baseline".
kubectl label namespace "$NS" --overwrite \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted >/dev/null

SB_CONN="${SERVICEBUS_CONNECTION_STRING:-$(terraform -chdir="$INFRA_DIR/envs/dev" output -raw servicebus_connection_string)}"

if PG_PASS=$(kubectl -n "$NS" get secret shopflow-secrets -o jsonpath='{.data.POSTGRES_PASSWORD}' 2>/dev/null) && [ -n "$PG_PASS" ]; then
  PG_PASS=$(printf '%s' "$PG_PASS" | base64 --decode)
  echo "Keeping the existing Postgres password."
else
  PG_PASS=$(openssl rand -hex 24)
  echo "Generated a new Postgres password."
fi

kubectl -n "$NS" create secret generic shopflow-secrets \
  --from-literal=POSTGRES_PASSWORD="$PG_PASS" \
  --from-literal=SERVICEBUS_CONNECTION_STRING="$SB_CONN" \
  --dry-run=client -o yaml | kubectl apply -f -
