.PHONY: install dev build preview clean marimo notebooks

NOTEBOOKS := $(wildcard notebooks/0*.py)
NB_HTML   := $(patsubst notebooks/%.py,public/notebooks/%.html,$(NOTEBOOKS))

install:
	npm install

dev: install notebooks
	npx vite --open

build: install notebooks
	node scripts/generate-sitemap.mjs
	npx vite build

preview: build
	npx vite preview --open

clean:
	rm -rf node_modules dist public/notebooks

# Export all marimo notebooks to static HTML
notebooks: public/notebooks/index.html $(NB_HTML)

public/notebooks/%.html: notebooks/%.py
	@mkdir -p public/notebooks
	-cd notebooks && uv run marimo export html $*.py --output ../public/notebooks/$*.html

public/notebooks/index.html: $(NB_HTML)
	@mkdir -p public/notebooks
	@python3 notebooks/build_index.py

# Open marimo editor
marimo:
	cd notebooks && uv run marimo edit . --no-token
