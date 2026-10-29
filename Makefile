# ShopFlow — local developer commands. Run `make help` to list them.
.DEFAULT_GOAL := help
PWD := $(shell pwd)

.PHONY: help up down clean logs ps test images images-local argocd-ui k8s-status k8s-url k8s-mail test-product test-cart test-order test-payment test-notification test-frontend

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[1m%-18s\033[0m %s\n", $$1, $$2}'

up: ## Build and start the whole stack
	docker compose up -d --build
	@echo ""
	@echo "  Shop:   http://localhost:3000"
	@echo "  Emails: http://localhost:8025"
	@echo "  The Service Bus emulator takes about a minute to be ready."

down: ## Stop the stack (keeps data)
	docker compose down

clean: ## Stop the stack and delete all local data
	docker compose down -v

logs: ## Follow logs from the app services
	docker compose logs -f product-service cart-service order-service payment-service notification-service frontend

ps: ## Show container status
	docker compose ps

# Tests run inside containers, so you don't need Python, Java, Go or Node installed.
test: test-product test-cart test-order test-payment test-notification test-frontend ## Run every service's tests

test-product: ## Product service tests (Python)
	docker run --rm -v $(PWD)/services/product-service:/app -w /app python:3.12-slim \
	  sh -c "pip install -q -r requirements-dev.txt && ruff check . && pytest -q -p no:cacheprovider"

test-cart: ## Cart service tests (Python)
	docker run --rm -v $(PWD)/services/cart-service:/app -w /app python:3.12-slim \
	  sh -c "pip install -q -r requirements-dev.txt && ruff check . && pytest -q -p no:cacheprovider"

test-order: ## Order service tests (Java)
	docker run --rm -v $(PWD)/services/order-service:/app -v shopflow-m2:/root/.m2 -w /app \
	  maven:3.9-eclipse-temurin-21 mvn -B -q test

test-payment: ## Payment service tests (Go). Also writes go.sum: commit it.
	docker run --rm -v $(PWD)/services/payment-service:/app -w /app golang:1.24 \
	  sh -c "go mod tidy && go vet ./... && go test ./..."

test-notification: ## Notification service tests (Node)
	docker run --rm -v $(PWD)/services/notification-service:/app -w /app node:22-alpine \
	  sh -c "npm ci --no-audit --no-fund && npm test"

test-frontend: ## Frontend type check and production build (Next.js)
	docker run --rm -v $(PWD)/services/frontend:/app -w /app node:22-alpine \
	  sh -c "npm ci --no-audit --no-fund && npm run build"

# ---- Azure (Phase 3) -------------------------------------------------------
# ACR = your registry name, e.g. make images ACR=acrshopflow0q6q39
SERVICES := product-service cart-service order-service payment-service notification-service frontend
TAG      ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo dev)
INFRA_DIR ?= ../shopflow-infra

check-acr:
	@test -n "$(ACR)" || { echo "Set ACR, e.g. make images ACR=acrshopflow0q6q39"; exit 1; }

images: check-acr ## Build all images in Azure (ACR Tasks, linux/amd64) and tag with the git commit
	@for s in $(SERVICES); do \
	  echo "== building $$s:$(TAG)"; \
	  az acr build --registry $(ACR) --image shopflow/$$s:$(TAG) --image shopflow/$$s:latest \
	    --platform linux/amd64 services/$$s || exit 1; \
	done

images-local: check-acr ## Build on this Mac for linux/amd64 and push to ACR (when ACR Tasks are blocked)
	az acr login --name $(ACR)
	@for s in $(SERVICES); do \
	  echo "== building $$s:$(TAG) for linux/amd64"; \
	  docker buildx build --platform linux/amd64 \
	    -t $(ACR).azurecr.io/shopflow/$$s:$(TAG) -t $(ACR).azurecr.io/shopflow/$$s:latest \
	    --push services/$$s || exit 1; \
	done

# Deployment is GitOps: the pipeline commits the image tag to shopflow-gitops and
# Argo CD rolls it out. These targets are for looking, not for deploying.
ENV ?= dev
NS  := shopflow-$(ENV)

argocd-ui: ## Argo CD UI on http://localhost:8080 (prints the admin password first)
	@kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 --decode; echo
	kubectl -n argocd port-forward svc/argocd-server 8080:80

k8s-status: ## Show pods and the public IP (ENV=dev|prod)
	kubectl -n $(NS) get pods,svc

k8s-url: ## Print the shop's public URL (ENV=dev|prod)
	@echo "http://$$(kubectl -n $(NS) get svc frontend-public -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"

k8s-mail: ## Open the email inbox (Mailpit) on http://localhost:8025 (ENV=dev|prod)
	kubectl -n $(NS) port-forward svc/mailpit 8025:8025
