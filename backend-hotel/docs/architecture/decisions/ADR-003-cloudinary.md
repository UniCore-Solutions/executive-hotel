# ADR-003: Cloudinary behind MediaStorageProvider

- Status: proposed (pending approval)
- Date: 2026-08-18

## Context

The platform stores hotel/room/experience imagery. Cloudinary is the chosen vendor. Business services must not couple to the vendor SDK.

## Decision

1. `MediaStorageProvider` port (upload/delete) is the only interface business code uses; `CloudinaryProvider` (in `infrastructure/provider`) is the sole adapter.
2. The `media` table stores `url` (display) and `storage_key` (Cloudinary public_id — the deletion handle).
3. Media deletion = DB row removal + async storage delete with retry/reconciliation; orphans tolerated.
4. Config via env vars (`CLOUDINARY_URL`); timeouts and bounded retries in the adapter; no vendor types cross the port boundary.

## Consequences

- Swapping providers later changes only the adapter.
- Tests use `FakeMediaStorageProvider`; no live Cloudinary calls in CI.