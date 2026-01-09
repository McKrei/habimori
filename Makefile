.PHONY: run app

run:
	npm run dev

app:
	docker build -t habimori-app .
	docker run --rm -p 3000:3000 --name habimori-app habimori-app
