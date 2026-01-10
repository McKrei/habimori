.PHONY: install dev run lint typecheck build start test test-e2e ci docker-build docker-run app clean

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

test-e2e:
	npm run test:e2e

ci: lint typecheck test

docker-build:
	docker build -t habimori-app .

docker-run:
	docker run -d --restart unless-stopped -p 3000:3000 --name habimori-app habimori-app

docker-stop:
	docker stop habimori-app 2>/dev/null || true
	docker rm habimori-app 2>/dev/null || true

app: docker-build docker-run

clean:
	rm -rf .next
