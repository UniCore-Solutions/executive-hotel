---
description: Run the fast quality gate — compile, unit + integration tests (Testcontainers), and report results.
agent: build
---

Run the verification gate for backend-hotel:

1. `./mvnw test` — compile + all unit and integration tests (Testcontainers PostgreSQL + Kafka; never H2)
2. If any test fails, fix the issue and re-run until green
3. Report each phase explicitly: compile OK, tests run count, failures/errors/skipped

Only report SUCCESS when the Maven build actually completed with BUILD SUCCESS and 0 failures.