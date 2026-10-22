# ShopFlow — local developer commands. Run `make help` to list them.
.DEFAULT_GOAL := help
PWD := $(shell pwd)

.PHONY: help up down clean logs ps test test-product test-cart test-order test-payment test-notification test-frontend

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
