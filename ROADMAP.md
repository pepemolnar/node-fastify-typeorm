# Build Order

A dependency-aware sequence for the pending items listed in the [README Roadmap](README.md#roadmap). The pending items aren't independent — some unblock others (Redis underpins jobs, idempotency, and token revocation; the adapter pattern wraps the external client; resilience protects it). This order front-loads cheap, high-leverage work, then introduces each new piece of infrastructure once, so nothing is built twice.

**Driving principle:** infrastructure once, patterns before the code that leans on them, contract last.

---

## Phase 1 — Guardrails & foundations

_Cheap, protect everything that follows._

1. **Pre-commit hooks** — lock in quality gates before more code lands.
2. **Security hardening** (helmet + CORS) — close obvious gaps early.

## Phase 2 — Shaping patterns ✅

_Refactors later work builds on._

3. **Factory pattern** ✅ — creation helpers reused by seeding and tests.
4. **Database seeding** ✅ — now built on the factories.
5. **Builder pattern** ✅ — fluent query/filter assembly.
6. **Cursor-based pagination** ✅ — a natural first consumer of the query builder.
7. **Repository & Unit of Work** ✅ — formalize the model layer before more call sites depend on it.

## Phase 3 — Infrastructure layer

_Introduce Redis + outbound calls, once._

8. **Adapter pattern** — the seam Redis (and the external client) plugs into. Moved here from Phase 2: the `Cache` port and its Redis implementation are best built together, so the adapter now leads the caching work rather than standing alone.
9. **Redis cache layer** — stands up Redis behind the `Cache` interface/adapter.
10. **Rate limiting** — reuses the Redis store; protects auth endpoints.
11. **Resilience** (retry + circuit breaker) — the wrapper the external call needs.
12. **External API integration** — lands on the adapter + resilience already in place.
13. **Idempotency keys** — reuses the Redis store from step 9.

## Phase 4 — Async & eventing

_Depends on Redis + the pattern work._

14. **Domain events / Observer** — the decoupling seam for the next two.
15. **Background jobs / message queue** — BullMQ workers consuming those events.
16. **Email service** — dispatched asynchronously via the job queue.
17. **Refresh tokens & rotation** — revocation list stored in Redis.

## Phase 5 — Contract polish ✅

_Evolve the public API last._

18. **RFC 7807 error format** ✅ — refine the error contract once error paths are stable. Every error path (domain `HttpError`, validation, guards, unmatched routes, rate-limit, unexpected) now returns `application/problem+json` with a machine-readable `code`.
19. **API versioning** ✅ — freeze a `/v1` contract before there are real consumers. Application routes sit under `/v1`; `/health`, `/ready`, and `/docs` stay unversioned.

## Phase 6 — Domain-Driven restructure (final)

_Reorganize around the domain, once every piece exists._

By this point `src/` has accumulated a lot of technical folders (controllers, services, models, adapters, guards, resilience, notifications…), and the architectural story is hard to read at a glance — which is why supporting code was temporarily parked under `extras/`. This phase is the deliberate cleanup: flip the structure from _grouped-by-technical-layer_ to _grouped-by-domain_, applying DDD so the codebase itself narrates the design. It comes **last on purpose** — restructuring once, after all the collaborators exist, beats reshuffling at every phase. A single `User` aggregate makes DDD look like ceremony, so this phase also adds a second bounded context (step 26) — that's what proves the modular structure carries more than one domain.

20. **Bounded contexts / feature modules** — regroup `src/` into self-contained modules per context (`users`, `auth`, `notifications`), each owning its own domain / application / infrastructure / interface slices. This dissolves the `extras/` holding pen and makes each context's shape legible on its own.
21. **Domain layer** — rich aggregates with behavior instead of anemic entities, plus value objects (`Email`, `PasswordHash`) that make invalid states unrepresentable. Separate the pure domain model from the TypeORM persistence entity so the domain doesn't depend on the ORM.
22. **Application layer (use cases)** — promote the current services into explicit use-case handlers (`RegisterUser`, `ListUsers`…) that orchestrate domain + ports and hold no domain rules themselves.
23. **Infrastructure layer** — repository _interfaces_ move into the domain (already started with `IUserRepository`); their TypeORM implementations, the cache/external adapters, and entity↔domain mappers live here, behind those interfaces.
24. **Shared kernel** — a single home for cross-cutting primitives (base `Entity`/`ValueObject`, `Result`/error types, the domain-event bus from Phase 4), replacing the `extras/` grab-bag.
25. **Ubiquitous language pass** — align names across code, routes, and docs with the domain vocabulary, so the ubiquitous language is consistent end to end.
26. **Second bounded context (showcase)** — introduce a fresh domain that reuses every pattern above, e.g. **Projects & Tasks**: a `Project` aggregate root owning `Task` entities. It demonstrates what one aggregate can't: child entities under a root, its own invariants (can't complete a project with open tasks; a deadline can't be set in the past), a lifecycle (`active → archived`), a **cross-context reference by id only** (a project knows an `ownerId`, never reaches into the `User` aggregate), and a **domain event** (`TaskCompleted`) that a handler in the notifications context reacts to. This is the payoff step — it proves the module boundaries, the shared kernel, and the event bus all hold up with a second context in play.

---

> Phases 1–2 have no hard dependency on each other and can be reordered to taste; Phases 3–5 are dependency-ordered. **Phase 6 is intentionally last** — it's a structural refactor, not new behavior, so it lands once the full object graph exists and can be reorganized in a single pass.
