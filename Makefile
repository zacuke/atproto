
SHELL = /bin/bash
.SHELLFLAGS = -o pipefail -c

DOCKER_AVAIL := $(strip $(shell docker ps >/dev/null 2>&1 && echo 1 || echo 0))
WIN_DOCKER := $(and $(findstring Windows_NT,$(OS)),$(DOCKER_AVAIL))
WIN_PKG := $(strip $(shell node packages/dev-infra/make-scripts/has-win-packages.js))
MAKEFILE_PATH := $(abspath $(firstword $(MAKEFILE_LIST)))

.PHONY: help
help: ## Print info about all commands
	@node packages/dev-infra/make-scripts/print-help.js $(abspath $(firstword $(MAKEFILE_PATH)))

.PHONY: build
build: ## Compile all modules
	pnpm build

.PHONY: test
test: ## Run all tests
ifdef WIN_DOCKER
ifdef WIN_PKG
	@echo Rebuilding node_modules to match docker. Run make deps to switch back to win32.
	@- rmdir /s /q node_modules >nul 2>&1
	wsl sudo make deps
	wsl make build
endif
endif
ifdef DOCKER_AVAIL
	pnpm clean-docker
endif
	node packages/dev-infra/make-scripts/run-test-shards.js

.PHONY: run-dev-env
run-dev-env: ## Run a "development environment" shell
	cd packages/dev-env; NODE_ENV=development pnpm run start

.PHONY: run-dev-env-logged
run-dev-env-logged: ## Run a "development environment" shell (with logging)
	cd packages/dev-env; LOG_ENABLED=true NODE_ENV=development pnpm run start | pnpm exec pino-pretty

.PHONY: codegen
codegen: ## Re-generate packages from lexicon/ files
	pnpm codegen

.PHONY: lint
lint: ## Run style checks and verify syntax
	pnpm verify

.PHONY: fmt
fmt: ## Run syntax re-formatting
	pnpm format

.PHONY: fmt-lexicons
fmt-lexicons: ## Run syntax re-formatting, just on .json files
	pnpm exec eslint ./lexicons/ --ext .json --fix

.PHONY: deps
deps: ## Installs dependent libs using 'pnpm install'
	pnpm install --frozen-lockfile

.PHONY: all
all: ## Alias for 'make deps && make build && make test'
	make deps && make build && make test
