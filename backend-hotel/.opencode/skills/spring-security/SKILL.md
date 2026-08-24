---
name: spring-security
description: Security conventions for backend-hotel — Spring Security setup, authentication, RBAC, hotel-level authorization, OWASP risks, IDOR prevention, input validation, secrets handling. Use when implementing or reviewing security-sensitive code.
---

# Spring Security Conventions

Multi-hotel platform: the two non-negotiables are **RBAC** and **hotel-level isolation**.

## Authentication / authorization

- Stateless API security: JWT (or session) with explicit filter chain; no anonymous writes
- Every endpoint declared in the security config (deny-by-default posture); public endpoints explicit and minimal
- Roles vs permissions: coarse roles (admin, hotel_manager, guest…) plus fine-grained permission checks where real
- **Hotel scoping**: a principal carries the hotel ids it may access; every hotel-scoped controller/service resolves the requested hotel against the principal — IDOR across hotels is a blocker; no trusting client-supplied hotel ids without an authorization check
- Reject with 403 (not 404) for authenticated-but-unauthorized; avoid information disclosure on existence probing where sensitive

## OWASP basics

- Input: Jakarta validation on all DTOs; never concatenate user input into JPQL/SQL; escape/normalize where rendered
- Sensitive data: never log credentials, tokens, PII fields; masks in logs; TLS expected
- Webhooks/integrations: verify provider signatures; idempotent handling
- Uploads (Cloudinary): size/type limits, random keys, no user-controlled paths

## Secrets and configuration

- All secrets via environment variables; `application.yaml` carries placeholders only
- Never commit `.env*` files or keys; `.gitignore` protects them
- Actuator endpoints not exposed publicly (or secured); devtools not active in production profile
- Dependencies: keep Spring Boot and starters current; watch advisories

## Error handling

- Global `@RestControllerAdvice`: consistent envelope, no internals leaked (no stack traces, no DB errors to clients)