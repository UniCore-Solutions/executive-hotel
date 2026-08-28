# Known Issues

One note per defect, with evidence. **Delete an entry when it is fixed** — do not annotate it
as resolved. A list of struck-through items is a list nobody reads.

Every entry needs: what is wrong, how you know (a `file:line`, command, or query), and the
impact.

## Open

### KI-1 — Backend echoes the requested currency onto unconverted MAD amounts

**Evidence:** the `quote` operation returns whatever `currencyCode` the client sends, attached
to MAD figures. No conversion is performed anywhere in the backend.

**Impact:** a client sending `currencyCode: "EUR"` receives MAD amounts labelled EUR — a
silent, roughly 10x price misstatement in a booking funnel. Mitigation today is convention:
send `MAD` and convert for display only.

**Status:** unresolved as of 2026-08-28. Verified by reading the quote path; not re-tested
live in this session.

See [[Architecture/system-overview]].

### KI-2 — `/graphql` authorization fails open

**Evidence:** `/graphql` is `permitAll` at the Spring Security filter chain; there is no
declarative per-field guard. Authorization exists only inside individual resolvers.

**Impact:** any admin resolver missing its `hasRole("super_admin") || inHotel(hotelId)` check
is publicly readable, and behaves normally in tests that do not probe authorization.

**Status:** structural, accepted with reservations — see
[[Decisions/0004-per-resolver-authorization]]. Not a bug to fix in isolation; a property to
review against on every admin resolver change.

## Corrections to previously-documented issues

### Resolved: "two ArchUnit rules are failing"

The archived documentation instructed contributors that `./mvnw test` was red on two ArchUnit
rules and that those failures should be treated as pre-existing.

**This is no longer true.** The *entire* backend suite was run on 2026-08-28:

```
$ ./mvnw test
Tests run: 170, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Both frontends are green too — see [[Testing/test-topology]] for the full baseline.

Recorded here rather than silently dropped because the obsolete guidance is actively
dangerous: it trains people to dismiss architecture-test failures as expected noise, which
would mask a genuine regression. **Any ArchUnit failure now is a real failure.**

This entry can be deleted once the team has absorbed the change.

## Related notes

- [[Testing/test-topology]]
- [[Security/authorization-model]]
