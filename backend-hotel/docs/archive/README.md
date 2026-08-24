# Archive — Historical Documentation

Everything in this directory is **historical**. It records previous phases,
proposals, and review reports of the project. It is kept because it explains
*why* decisions were made and *how* the project evolved — it is **not**
current documentation.

- Do not treat archived documents as the current architecture, API, or setup.
- Do not delete archived documents casually; they are the project's memory.
- If you need to change something described here, the change belongs in the
  active documentation, not here.

**Current source of truth:**

- Project overview & setup: [`../README.md`](../README.md) (docs index)
- Architecture: [`../architecture/architecture.md`](../architecture/architecture.md)
- API: [`../api/`](../api/)
- Security: [`../security/security.md`](../security/security.md)
- Development: [`../development/`](../development/)
- Operations: [`../operations/configuration.md`](../operations/configuration.md)
- Audits: [`../audits/`](../audits/)

## Contents

### `architecture/` — pre-implementation design docs (2026-08-18)

The original DRAFT architecture, database, events, security, and
integrations proposals. They were written before any code existed; the
implemented architecture diverged from them (flat layered → modular
monolith, GraphQL-first, hybrid REST splits). See `architecture.md` for the
current design.

| File | Historical record of |
|---|---|
| `architecture-draft.md` | original proposed module/package structure & decisions A-1…A-10 |
| `database-design.md` | Oracle→PostgreSQL review + proposed schema (change register D-1…D-15) |
| `events-design.md` | proposed Kafka/outbox design (mostly implemented as designed) |
| `security-design.md` | proposed security architecture (superseded by the security review) |
| `integrations-design.md` | proposed provider ports (Cloudinary/Resend/SMS) |

### `planning/` — phase plans & recommendations

| File | Historical record of |
|---|---|
| `foundation-plan.md` | the "implementation-ready" database/backend foundation spec (C1–C23 register) |
| `api-split-recommendation.md` | GraphQL vs REST split recommendation (later implemented as the hybrid surface) |
| `rest-graphql-api-architecture-plan.md` | superseded hybrid-API plan (never approved) |
| `client-platform-index-data-architecture.md` | approved design for the client platform index phase (V13/V14, media REST) |
| `backoffice-implementation-map.md` | draft plan for a future back-office app (backend side since implemented) |

### `audits/` — completed-phase review reports

| File | Historical record of |
|---|---|
| `2026-08-18-architecture-security-quality-report.md` | first full review (41-test era, flat layout) |
| `2026-08-18-domain-graphql-implementation-report.md` | domain + GraphQL implementation phase (31-test era) |
| `2026-08-18-database-foundation-report.md` | database foundation phase (V1–V8) |
| `2026-08-18-code-quality-review.md` | code quality review of the flat-layout era |
| `2026-08-19-modular-monolith-refactor-report.md` | the modular-monolith refactor record (98-test era) |
| `client-platform-index-implementation-report.md` | platform index phase report (V13/V14) |

Current audits live in [`../audits/`](../audits/) (e.g. `BACKEND_FINAL_AUDIT.md`).