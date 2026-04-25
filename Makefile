.DEFAULT_GOAL := help

CLIENT      ?= fitness_creator
VIDEO       ?=
FRAMES      ?= 3
CONFIG_DIR  ?= config/clients

.PHONY: help install test run list clean

help:
	@echo ""
	@echo "  Caption Writer"
	@echo "  ─────────────────────────────────────────────────────"
	@echo "  make install          Set up venv and install deps"
	@echo "  make test             Run with synthetic video (default client)"
	@echo "  make test CLIENT=lifestyle_blogger"
	@echo "  make run  VIDEO=clip.mp4               Run on a real video"
	@echo "  make run  VIDEO=clip.mp4 CLIENT=tech_reviewer FRAMES=5"
	@echo "  make list             List available client profiles"
	@echo "  make clean            Remove venv and cached files"
	@echo ""

install:
	python3 -m venv .venv
	.venv/bin/pip install --quiet --upgrade pip
	.venv/bin/pip install --quiet -r requirements.txt
	@echo "✓ Environment ready. Activate with: source .venv/bin/activate"

test:
	@bash run.sh --client $(CLIENT) --frames $(FRAMES) --config-dir $(CONFIG_DIR)

run:
	@if [ -z "$(VIDEO)" ]; then \
		echo "Error: VIDEO is required.  Usage: make run VIDEO=path/to/clip.mp4"; \
		exit 1; \
	fi
	@bash run.sh --client $(CLIENT) --video $(VIDEO) --frames $(FRAMES) --config-dir $(CONFIG_DIR)

list:
	@bash run.sh --list-clients

clean:
	rm -rf .venv logs/*.log __pycache__ src/__pycache__
	@echo "✓ Cleaned."
