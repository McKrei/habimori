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

docker-build:
	set -a; . ./.env; set +a; \
	docker build \
	  --build-arg NEXT_PUBLIC_SUPABASE_URL \
	  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY \
	  -t habimori-app .

docker-run:
	docker run -d --restart unless-stopped \
	  -p 127.0.0.1:3000:3000 \
	  --env-file ./.env \
	  --name habimori-app \
	  habimori-app

docker-stop:
	docker stop habimori-app 2>/dev/null || true
	docker rm habimori-app 2>/dev/null || true

docker-reload: docker-stop docker-build docker-run

app: docker-build docker-run

clean:
	rm -rf .next
