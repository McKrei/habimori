APP_NAME := habimori-app

.PHONY: help install dev lint typecheck test test-e2e build start docker-build docker-run app deploy

help:
	@echo "Available targets:"
	@echo "  install      Install dependencies"
	@echo "  dev          Run dev server"
	@echo "  lint         Run eslint"
	@echo "  typecheck    Run TypeScript typecheck"
	@echo "  test         Run unit tests (Vitest)"
	@echo "  test-e2e     Run Playwright tests"
	@echo "  build        Build production bundle"
	@echo "  start        Start production server"
	@echo "  docker-build Build Docker image"
	@echo "  docker-run   Run Docker container"
	@echo "  app          Build and run Docker image"
	@echo "  deploy       Build app and Docker image"

install:
	npm install

dev:
	npm run dev

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm run test

test-e2e:
	npm run test:e2e

build:
	npm run build

start:
	npm run start

docker-build:
	docker build -t $(APP_NAME) .

docker-run:
	docker run --rm -p 3000:3000 --name $(APP_NAME) $(APP_NAME)

app: docker-build docker-run

deploy: build docker-build
	@echo "Built $(APP_NAME). Push/deploy using your infrastructure."
