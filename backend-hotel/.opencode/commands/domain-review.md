---
description: Run the full domain-complete lifecycle gate — architecture, database, implementation, tests, security, code review, API contract, documentation, final test. Verdict: DOMAIN COMPLETE or REJECTED.
agent: build
---

Run the full lifecycle gate for the given domain/feature ($ARGUMENTS). A domain is complete only when every step below passes — compiling code is NOT completion.

1. **Architecture review** — run the `architect` subagent: layering, boundaries, SOLID, provider abstraction, scalability
2. **Database review** — run the `database` subagent: PostgreSQL schema/Flyway migration correctness, constraints, indexes, transactions, multi-hotel integrity (and for new domains, review of the existing Oracle schema in `../database/collection-schema.sql` where relevant)
3. **Implementation check** — verify the implementation matches the reviewed design and AGENTS.md rules; fix all findings from steps 1–2
4. **Unit tests** — JUnit 5 + Mockito + AssertJ covering services, domain invariants, edge cases
5. **Integration tests** — Testcontainers with real PostgreSQL (Flyway applied) and Kafka where applicable
6. **API tests** — MockMvc/WebTestClient: status codes, validation, error envelope, pagination
7. **Security review** — run the `security` subagent: RBAC, hotel-level isolation (IDOR), input validation, secrets; security blockers reject
8. **Database review (re-run)** — run the `database` subagent on the final state
9. **Code review** — run the `code-reviewer` subagent on the final diff
10. **API/documentation review** — run the `api-docs` subagent: OpenAPI accuracy, docs/api/graphql.md updated, error contract
11. **Final test** — `./mvnw test` green from clean state
12. **Documentation** — docs/ updated (architecture, database, security, testing, api as applicable; ADRs for decisions)

Report each gate with its verdict. End with a single final verdict: **DOMAIN COMPLETE** or **REJECTED** (list the blocking findings).