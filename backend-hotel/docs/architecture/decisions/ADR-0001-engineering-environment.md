# ADR-0001: AI Engineering Environment Setup

- Status: accepted (2026-08-18, environment setup task)
- Scope: `.opencode/` engineering environment for backend-hotel

## Context

The backend (Spring Boot 4.1.0, Java 21, Maven, PostgreSQL, Flyway, Kafka, Testcontainers) needed an AI-agent engineering environment that enforces a production lifecycle: architecture review → database review → implementation → unit/integration/API tests → security review → database re-review → code review → documentation → final test. The host had no JDK 21 (only JDK 17), and no project-scoped opencode configuration existed.

## Decisions

1. **Project-scoped setup in `backend-hotel/.opencode/`** — agents, skills, commands, and `opencode.json` live in the backend project (mirroring the established `frontend-hotel/.opencode/` convention). Global config remains untouched.
2. **Implementation agent is the primary `build` agent; nine read-only review subagents** own the gates: `architect`, `database`, `testing`, `security`, `api-docs`, `code-reviewer`, `devops`, `kafka`, `integration`. All reviewers have `edit: deny`; they review, validate, and advise — they do not rewrite implementation. Java/Spring implementation (role B) is owned by the primary agent guided by `AGENTS.md` and skills, not by a duplicate subagent.
3. **Eight project skills** encode domain conventions: `backend-project-facts`, `java-spring-boot`, `postgresql-flyway`, `testing`, `rest-api-openapi`, `spring-security`, `kafka-events`, `external-providers`. Skills are the shared knowledge base; agents are the owners of gates.
4. **Two commands**: `/verify` (fast build+test gate) and `/domain-review` (full lifecycle gate ending in DOMAIN COMPLETE / REJECTED).
5. **JDK 21 user-space install** — Temurin 21.0.12 installed at `~/.local/share/jdk/jdk-21.0.12+8` and `JAVA_HOME` exported in `~/.zshrc` (system JDK 17 cannot build; sudo not available; no system package changes). Maven wrapper 3.9.16 is used — no system Maven install.
6. **No third-party opencode plugins installed** — the native skill/agent/command/MCP features cover all current needs. Candidates that need credentials or a live target (GitHub MCP, PostgreSQL MCP, Postman MCP) are deferred and require user action (see environment-setup report).
7. **Existing global config preserved** — the Supabase MCP in `~/.config/opencode/opencode.jsonc` is unrelated to the backend and was left untouched.
8. **Testing and database principles enforced from the start** — no H2, Testcontainers + real PostgreSQL + Flyway for persistence tests (already proven: `TestcontainersConfiguration`); the Oracle-dialect schema in `../database/collection-schema.sql` stays a read-only reference until the dedicated database phase adapts it to PostgreSQL.

## Consequences

- A feature is not complete when it compiles — it must pass `/domain-review`.
- Backend work requires JDK 21 on PATH (new shells pick it up from `~/.zshrc`).
- Any change to `.opencode/` requires an opencode restart to take effect.