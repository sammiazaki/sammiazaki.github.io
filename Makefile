.PHONY: install dev build preview clean

install:
	npm install

dev: install
	npx vite --open

build: install
	npx vite build

preview: build
	npx vite preview --open

clean:
	rm -rf node_modules dist
