# Hotel Collection platform — developer entry points.
# Thin wrappers only: all logic lives in scripts/ (single source of truth).
#   make start / stop / restart / status / health / logs [S=backend]
#   make build / test [T=--backend] / lint / clean [C="--images --all"]
#   make db-start / db-stop / db-reset [R="--yes"] / db-migrate
#   make backup [B="--gzip"] / restore [F=backups/postgres/<file>.sql]

S :=
T :=
C :=
R :=
B :=
F :=

.PHONY: help setup build start dev prod stop restart status logs test e2e lint clean \
        db-start db-stop db-reset db-migrate backup restore health

help: ## list available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## one-time machine setup (.env, secrets, directories)
	./scripts/setup.sh

build: ## build all application images
	./scripts/build.sh

start: ## start the full platform
	./scripts/start.sh

dev: ## start in development mode (bind mounts + dev servers)
	./scripts/start.sh --dev

prod: ## start with the production overlay
	./scripts/start.sh --prod

stop: ## stop the platform (data preserved)
	./scripts/stop.sh

restart: ## restart the platform
	./scripts/restart.sh

status: ## show containers, health, ports
	./scripts/status.sh

logs: ## tail logs (make logs S=backend F=-f)
	./scripts/logs.sh $(S) $(F)

test: ## run test suites (make test T=--frontend)
	./scripts/test.sh $(T)

e2e: ## run Playwright suites against a running stack
	./scripts/test.sh --e2e

lint: ## eslint both frontends
	./scripts/lint.sh

clean: ## remove build artifacts (make clean C="--images")
	./scripts/clean.sh $(C)

db-start: ## start postgres (+kafka)
	./scripts/db-start.sh

db-stop: ## stop postgres (+kafka)
	./scripts/db-stop.sh

db-reset: ## DESTRUCTIVE: recreate database (make db-reset R=--yes)
	./scripts/db-reset.sh $(R)

db-migrate: ## re-run backend boot to apply pending Flyway migrations
	./scripts/db-migrate.sh

backup: ## database backup (make backup B=--gzip)
	./scripts/db-backup.sh $(B)

restore: ## database restore (make restore F=<file> plus append --yes if desired)
	./scripts/db-restore.sh $(F)

health: ## exit non-zero if any service is unhealthy
	./scripts/health.sh
