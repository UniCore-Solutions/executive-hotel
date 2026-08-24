# Repository & Documentation Cleanup Report

Date: 2026-08-19 · Scope: `backend-hotel` — full repository inspection, code
cleanup, documentation restructuring, and knowledge-base standardization.
Every item below was inspected before classification; nothing was deleted or
archived without verification of references, imports, build config, and
documentation links.

## 1. Cleanup Summary

- **Inspected**: whole repo (root files, `src/main`, `src/test`, `docs`,
  `scripts`, `postman`, `.opencode`, `.mvn`, resources, build config).
- **Deleted**: 6 files (1 boilerplate, 4 dead-code classes, 2 merged doc
  originals).
- **Archived**: 16 historical documents into `docs/archive/` (banner-added,
  cross-links fixed).
- **Restructured**: `docs/` into the canonical layout
  (`architecture/`, `api/`, `security/`, `development/`, `operations/`,
  `audits/`, `archive/`) with a valid `docs/README.md` index.
- **Created**: root `README.md` (did not exist), `docs/README.md`,
  `docs/operations/configuration.md`, `docs/archive/README.md`.
- **Updated**: `AGENTS.md` (doc paths + knowledge hierarchy + stale rule 7),
  6 active docs, 5 Java javadoc references, 6 `.opencode` references.
- **Verified**: `./mvnw test` 109/109 green, app starts, zero broken
  documentation links, zero stale doc references.

## 2. Files Deleted

| Path | Reason | Verification |
|---|---|---|
| `HELP.md` | Spring Initializr boilerplate ("Getting Started" reference) — no project content, no references anywhere | grep across repo for `HELP` — no references; standard generated file |
| `src/main/java/com/hotelcollection/hotel/eventing/domain/port/out/EventConsumptionRepository.java` | dead code — interface has no consumer (consumption ledger never read/written by any module) | grep: referenced only by its own JPA impl; no test usage; compile + full suite green after removal |
| `src/main/java/com/hotelcollection/hotel/eventing/adapter/persistence/EventConsumptionRepositoryJpaRepository.java` | dead code — same | same |
| `src/main/java/com/hotelcollection/hotel/eventing/domain/model/EventConsumption.java` | dead code — entity unused (the `event_consumption` table stays; it is Flyway-schema-owned) | same |
| `src/main/java/com/hotelcollection/hotel/eventing/domain/model/EventConsumptionId.java` | dead code — embedded id unused | same |
| `docs/api-testing.md` | content fully merged into `docs/development/testing.md` (with updated 109-test inventory) | new doc verified complete (unit/arch/integration tables, security scenarios, determinism, context support) |
| `docs/testing.md` | content fully merged into `docs/development/testing.md` (hard constraints, pyramid, determinism) | same |

No temporary artifacts existed: no `*.log`, `*.tmp`, `*.bak`, `*.swp`,
`*.orig`, `.DS_Store`, or debug files anywhere outside the gitignored
`target/` build output.

## 3. Files Archived

All archived docs carry a banner marking them historical with a pointer to
the current sources of truth; footers and cross-links were fixed.

| Original path | New path | Reason for archiving |
|---|---|---|
| `docs/architecture.md` | `docs/archive/architecture/architecture-draft.md` | DRAFT pre-implementation design (module structure, REST, capability tokens) — superseded by the implemented modular monolith |
| `docs/database.md` | `docs/archive/architecture/database-design.md` | DRAFT proposed PostgreSQL schema + change register D-1…D-15 — superseded by the frozen V1–V18 migrations |
| `docs/events.md` | `docs/archive/architecture/events-design.md` | DRAFT Kafka/outbox design — implemented (outbox, relay, recovery); current facts in architecture doc |
| `docs/security.md` | `docs/archive/architecture/security-design.md` | DRAFT security proposal — explicitly superseded by the security review (marked as such in the original) |
| `docs/integrations.md` | `docs/archive/architecture/integrations-design.md` | DRAFT provider-port design — implemented (MediaStorageProvider etc.); current facts in architecture doc |
| `docs/foundation-plan.md` | `docs/archive/planning/foundation-plan.md` | pre-implementation foundation spec (C1–C23 register) — completed |
| `docs/backoffice-implementation-map.md` | `docs/archive/planning/backoffice-implementation-map.md` | DRAFT plan for an unbuilt back-office app; backend extension scope since implemented |
| `docs/planning/API_SPLIT_RECOMMENDATION.md` | `docs/archive/planning/api-split-recommendation.md` | recommendation that was implemented (hybrid GraphQL/REST) — historical record |
| `docs/planning/REST_GRAPHQL_API_ARCHITECTURE_PLAN.md` | `docs/archive/planning/rest-graphql-api-architecture-plan.md` | superseded plan, never approved |
| `docs/planning/CLIENT_PLATFORM_INDEX_DATA_ARCHITECTURE.md` | `docs/archive/planning/client-platform-index-data-architecture.md` | approved design for the platform-index phase (V13/V14, media REST) — implemented; record kept (also referenced from 3 javadocs, re-pointed) |
| `docs/planning/CLIENT_PLATFORM_INDEX_IMPLEMENTATION_REPORT.md` | `docs/archive/audits/client-platform-index-implementation-report.md` | completed-phase implementation report |
| `docs/BACKEND-ARCHITECTURE-SECURITY-QUALITY-REPORT.md` | `docs/archive/audits/2026-08-18-architecture-security-quality-report.md` | phase audit of the flat-layout era (41-test snapshot) |
| `docs/BACKEND-DOMAIN-GRAPHQL-IMPLEMENTATION-REPORT.md` | `docs/archive/audits/2026-08-18-domain-graphql-implementation-report.md` | phase audit (31-test snapshot) |
| `docs/database-foundation-report.md` | `docs/archive/audits/2026-08-18-database-foundation-report.md` | phase audit of the DB foundation (V1–V8) |
| `docs/backend-code-quality-review.md` | `docs/archive/audits/2026-08-18-code-quality-review.md` | review of the flat-layout era, superseded by later reviews |
| `docs/MODULAR-MONOLITH-REFACTOR-REPORT.md` | `docs/archive/audits/2026-08-19-modular-monolith-refactor-report.md` | record of the modular-monolith refactor (98-test snapshot) — key history |

## 4. Files Updated (active documentation)

| File | Change |
|---|---|
| `README.md` (root, **created**) | project overview, stack, structure, prerequisites, run/test/GraphQL instructions, config, doc links |
| `docs/README.md` (rewritten) | full documentation index; every link verified valid |
| `AGENTS.md` | doc knowledge hierarchy (`AGENTS.md → docs/README.md → section docs → code`); rules to read invariants + architecture before changes; stale rule 7 ("REST semantics/OpenAPI") corrected to GraphQL-first + approved REST splits; docs list replaced with new paths |
| `docs/architecture/architecture.md` | companion links re-pointed; refactor report → archive; testing doc link |
| `docs/architecture/domain-requirements.md` | header corrected (109 tests, 53 tables, V1–V18); `KafkaOutboxRelay` → `OutboxRelay` + stale-claim recovery |
| `docs/architecture/persistence.md` | header corrected (V1–V18, 53 tables) + V15–V18 evolution notes |
| `docs/security/security.md` | superseded-DRAFT pointer → archive path |
| `docs/api/graphql.md` | testing-doc link; REST pointer |
| `docs/api/api-guidelines.md` | planning-doc link → archive; footer → docs index |
| `docs/development/setup.md` | DRAFT banner removed; corrected `verify`/Spotless/JaCoCo claims to actual state; corrected env-vars list; test/db links |
| `docs/audits/BACKEND_FINAL_AUDIT.md` | doc-path references updated to the new layout |
| 5 Java files | javadoc paths: `docs/planning/…` → archive path; `docs/backend-invariants.md` → `docs/architecture/invariants.md`; one user-facing VALIDATION message path string |
| 6 `.opencode` files | `docs/api.md` → `docs/api/graphql.md`; `docs/decisions` → `docs/architecture/decisions` |

## 5. Files Merged (duplication removed)

| Before | After | What happened |
|---|---|---|
| `docs/api-testing.md` + `docs/testing.md` | `docs/development/testing.md` | two testing docs → one: hard constraints + pyramid + live 109-test inventory + determinism + gates; originals deleted |
| `docs/backend-architecture.md` + `docs/architecture.md` (draft) | `docs/architecture/architecture.md` + archive | the draft described a design that never existed; the implemented architecture doc is the single source of truth; draft archived |
| `docs/security.md` + `docs/backend-security-review.md` | `docs/security/security.md` + archive | implemented-state security review is the single source; pre-implementation draft archived |
| `docs/domain-model.md` | `docs/architecture/persistence.md` | kept as the single persistence/domain-model doc (renamed + corrected) |

## 6. Documentation Structure (final)

```
docs/
├── README.md                      documentation index (links verified)
├── architecture/
│   ├── architecture.md            the one architecture doc
│   ├── persistence.md             entities ↔ schema, aggregates
│   ├── invariants.md              non-negotiable backend rules
│   ├── domain-requirements.md     R1–R37 → implementation + tests
│   └── decisions/                 ADR-0001 … ADR-008
├── api/
│   ├── graphql.md                 GraphQL operations + error codes
│   ├── api-guidelines.md          REST splits + conventions
│   └── frontend-contract.md       frontend ↔ backend matrix
├── security/
│   └── security.md                S1–S12 findings, authz matrix
├── development/
│   ├── setup.md                   setup, commands, conventions
│   └── testing.md                 test pyramid + 109-test inventory
├── operations/
│   └── configuration.md           env vars, profiles, properties
├── audits/
│   ├── BACKEND_FINAL_AUDIT.md
│   └── REPOSITORY_AND_DOCUMENTATION_CLEANUP.md   (this report)
└── archive/
    ├── README.md                  archive index + "historical" warning
    ├── architecture/              5 pre-implementation design docs
    ├── planning/                  5 phase plans/recommendations
    └── audits/                    6 completed-phase reports
```

Root: `README.md`, `AGENTS.md`, `pom.xml`, `docker-compose.yml`,
`.env.example`, `.gitignore`, `.gitattributes`, `mvnw`, `mvnw.cmd`, `.mvn/`,
`src/`, `docs/`, `scripts/`, `postman/`, `data/` (runtime, gitignored),
`.opencode/` (agents/commands/skills/config).

## 7. Code Cleanup

- **Dead code removed**: the entire unused `EventConsumption` ledger class
  cluster (port interface, JPA adapter, entity, embedded id) — no consumer
  anywhere; the `event_consumption` table itself remains Flyway-schema-owned.
- **Stale references fixed**: 5 Java javadocs + 1 runtime message pointed at
  moved docs; 6 `.opencode` files pointed at a nonexistent `docs/api.md`.
- **No temp/generated artifacts committed**: `target/`, `data/media/`,
  `logs/`, `.env*` are gitignored (verified against `.gitignore`);
  no stray `*.log/*.tmp/*.bak/*.orig/*~` files exist.
- **No commented-out code or debug leftovers** found in `src/main`.
- Kept deliberately (not dead): empty-but-designated layers/adapters (e.g.
  notification has no consumer yet — the module API is the intended seam),
  `updateAvailability` (deprecated but exposed), mock payment provider.

## 8. AI Agent Improvements

- `AGENTS.md` now leads with the knowledge hierarchy and explicitly directs
  agents to `docs/architecture/invariants.md` + `docs/architecture/architecture.md`
  before behavior changes, and to record decisions as ADRs under
  `docs/architecture/decisions/`.
- Rule 7 (API contract) corrected to the actual GraphQL-first + approved
  REST-split reality (it previously mandated REST semantics/OpenAPI that do
  not exist).
- `docs/README.md` is a one-page, fully-valid index — agents can navigate
  from a single entry point.
- `.opencode` reviewer prompts (api-docs, architect, code-reviewer,
  domain-review, external-providers, rest-api-openapi) no longer point at
  nonexistent docs.
- Archive carries an explicit "HISTORICAL ONLY" banner so agents cannot
  mistake old reports for current architecture.

## 9. New Developer Readiness

A new developer can now start from the root `README.md` alone:
project purpose, stack, module structure, prerequisites, `docker compose up
-d`, `JWT_SECRET=$(openssl rand -hex 32) ./mvnw spring-boot:run`, `./mvnw
test`, GraphQL/GraphiQL access, seed script, and the docs index. From
`docs/development/setup.md` they get real commands, conventions, and the
quality-gate reality (what is and is not wired). No document tells them to
run a tool that does not exist (previous docs claimed Spotless/JaCoCo
gates; corrected).

## 10. Documentation Consistency

- **Architecture docs ↔ code**: `docs/architecture/architecture.md` was
  rewritten against the implemented modular monolith in the prior audit and
  re-verified; the only remaining architecture doc (the draft) is archived
  with a banner.
- **GraphQL docs ↔ schema**: `docs/api/graphql.md` verified against the
  loaded schema (14 schema resources, all queries/mutations mapped).
- **Security docs ↔ implementation**: `docs/security/security.md` describes
  the implemented S1–S12 state; the superseded draft is archived.
- **Development docs ↔ real commands**: verified against `pom.xml`,
  `application.yaml`, `.env.example`, and the test suite.
- **No duplicate sources of truth remain** for architecture, testing,
  security, setup, or API.
- **No secrets** in any documentation or code (verified; `.env` gitignored,
  `JWT_SECRET` env-only).

## 11. Verification

| Command / check | Result |
|---|---|
| `./mvnw test` (full suite, Testcontainers) | **109/109 green, 0 failures, 0 errors** (13 classes) — run after all deletions and reference changes |
| App restart (`spring-boot:run` with `JWT_SECRET`) | started cleanly; `/actuator/health` 200, readiness/liveness UP; `/graphiql` 307 (dev profile) |
| Link checker (all markdown links in `docs/`, `README.md`, `AGENTS.md`) | 0 broken links |
| Stale-reference grep (old doc names across `src/`, `docs/`, `.opencode/`) | clean |
| Archive link audit (relative links inside `docs/archive/`) | fixed to archive-relative/active targets |
| Temp-artifact scan (`*.log/*.tmp/*.bak/*.swp/*.orig/*~/.DS_Store`) | none |
| `EventConsumption` reference scan | none after removal (compile + tests green) |

## 12. Remaining Issues

- `.opencode/agents/api-docs.md` and `.opencode/skills/rest-api-openapi/`
  still describe an aspirational springdoc/OpenAPI review posture that does
  not match the GraphQL-first reality (their file paths are fixed; the
  substance is an agent-prompt rewrite, out of scope for this cleanup).
- `event_consumption` table (V8) remains in the schema with no Java consumer
  — schema is Flyway-frozen; removing it would need a migration and is a
  deliberate future decision.
- No git repository exists: `.gitignore` is ready, but history hygiene
  (tracked secrets, history rewrite) cannot be exercised until a repo is
  created; no secrets were found in the working tree.
- Archived docs intentionally preserve outdated commands/figures (e.g. "41
  tests", "no rate limiter") — they are historical snapshots; the archive
  banner and `docs/archive/README.md` mark them clearly.
- CI/CD (GitHub Actions), Dockerfile, and the prod deployment profile
  remain unimplemented (documented in `BACKEND_FINAL_AUDIT.md`).