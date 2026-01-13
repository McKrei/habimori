.PHONY: install dev run lint typecheck build start test test-unit test-integration test-e2e test-all ci docker-build docker-run docker-stop docker-reload app clean

	
	
install:
	npm install

dev:
	npm run dev

run: dev

lint:
	npm run lint

typecheck:
	npm run typecheck

build:
	npm run build

start:
	npm run start

test:
	npm test

test-unit:
	npx vitest run --exclude tests/integration

test-integration:
	npx vitest run tests/integration

test-e2e:
	npm run test:e2e

ci: lint typecheck test

test-all: lint typecheck build test test-e2e
APP_NAME ?= habimori-app
IMAGE_NAME ?= habimori-app
BIND ?= 127.0.0.1
PORT ?= 3000
ENV_FILE ?= ./.env

docker-build:
	set -a; . $(ENV_FILE); set +a; \
	docker build \
	  --build-arg NEXT_PUBLIC_SUPABASE_URL \
	  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY \
	  -t $(IMAGE_NAME) .

docker-run:
	docker run -d --restart unless-stopped \
	  -p $(BIND):$(PORT):3000 \
	  --env-file $(ENV_FILE) \
	  --name $(APP_NAME) \
	  $(IMAGE_NAME)

docker-stop:
	docker stop $(APP_NAME) 2>/dev/null || true
	docker rm $(APP_NAME) 2>/dev/null || true

docker-reload: docker-stop docker-build docker-run

docker-dev-reload: APP_NAME=habimori-app-dev
docker-dev-reload: IMAGE_NAME=habimori-app-dev
docker-dev-reload: PORT=3001
docker-dev-reload: docker-reload

docker-dev-stop: APP_NAME=habimori-app-dev
docker-dev-stop: docker-stop

app: docker-build docker-run

clean:
	rm -rf .next
