# AGENTS.md

Contributor and agent instructions for **Stories Collector**.

For product overview, setup, API reference, and deployment, use [README.md](README.md). This file covers **how to change the code correctly**.

## Layering rules

| Layer | Path | Responsibility |
|-------|------|----------------|
| Routes | `src/app/api/**/route.ts` | HTTP, rate limits, status codes — thin handlers only |
| Services | `src/services/` | Business logic, orchestration, external calls |
| Repositories | `src/repositories/` | Prisma queries and transactions |
| Shared | `src/lib/` | Validation, sanitization, JWT, errors, constants |
| UI | `src/app/[lang]/`, `src/components/` | Pages and components |

**Do not** add Prisma calls or domain logic in route handlers. **Do not** skip layers for convenience.

Import with `@/` → `src/`. Use class-based services/repositories (match existing files).

## Request pipeline (mutating flows)

Every user-submitted payload should follow this order:

1. **Rate limit** — `rateLimit(request)` on public POST routes; return `429` with `X-RateLimit-*` headers (see `src/app/api/stories/route.ts`).
2. **Sanitize** — `sanitizeStoryInput()` strips HTML; `content` allows basic tags only (`src/lib/sanitization.ts`).
3. **Validate** — Zod schemas in `src/lib/validation.ts`; extend schemas here, not inline in routes.
4. **Service** — business rules live in services.
5. **Repository** — persistence only.

### Validation errors

`StoryService.createStory` serializes `ZodError` as `JSON.stringify(error.flatten().fieldErrors)` and throws a plain `Error`. API routes detect this via `error.message.startsWith('{')`. If you add new services, prefer `ValidationError` from `src/lib/errors.ts` instead of inventing a new pattern.

## Domain invariants

### Story language

Client `language` input is **ignored at create time**. `detectStoryLanguage()` in `src/lib/utils.ts` derives `en` | `he` | `fr` from story text. Changing detection logic affects enrichment prompts and listing filters — update related tests.

### Email verification (OTP → JWT)

1. `POST /api/otp/send` and `/verify` proxy to an **external** OTP service (`OTP_SERVICE_URL`).
2. On successful verify, the app signs its **own** JWT via `signToken()` — do not rely on the external service token format.
3. Story submit passes `verificationToken`; service checks token recipient matches `email` and sets `verifiedEmail: true`.
4. Stories without a token are still accepted (`verifiedEmail: false`) — intentional backward compatibility.

### LLM enrichment

- Gated by `ENABLE_LLM_ENRICHMENT=true`. Runs **async** after create (`void enrichmentService.enrichStory(story)`); never block story creation on LLM failure.
- Prompts loaded at service init from `prompts/story_enrichment_{en,he,fr}.txt`; Hebrew is the fallback.
- `GeneratedContent.version === null` = draft; saving via `PUT /api/stories/:id/enrichment` promotes to a numbered version and sets `Story.selectedEnrichmentId`.
- LLM calls go through `src/lib/llm-client.ts` only. Browser must use `/api/chat` proxy — never expose `LLM_API_KEY`.

## Next.js conventions

- App Router with `src/app/[lang]/` for locale pages. Layout sets `dir="rtl"` for Hebrew (`src/lib/i18n.ts`).
- Locale pages use `export const dynamic = 'force-dynamic'` — do not opt pages into static generation without checking DB/API usage.
- Route `params` are typed as `Promise<{ ... }>` (Next.js 16) — always `await params`.
- `output: 'standalone'` in `next.config.js` — keep Docker/production builds compatible.

## Internationalization

i18n is **hand-rolled**, not next-intl hooks (package is present but unused in `src/`):

- Copy lives in `src/locales/{en,he,fr}.json`.
- Types in `src/types/translations.d.ts` — update all three locale files and the type when adding keys.
- Server pages call `getTranslations(lang)` and pass `translations` into client components.
- Locale redirect helper exists in `src/proxy.ts` (wire via middleware if adding locale auto-redirect).

## Database changes

- Schema: `prisma/schema.prisma`. Always ship a migration: `npx prisma migrate dev`.
- `postinstall` runs `prisma generate` — don't commit generated client.
- `StoryRepository.findById` JSON-serializes results for RSC boundaries — preserve this if changing return shape.

## Testing expectations

| Suite | Path | Notes |
|-------|------|-------|
| Unit / integration | `tests/unit/`, `tests/integration/` | Mock repositories with `jest.mock`; inject via cast on private `repository` field |
| E2E (CI-safe) | `tests/e2e/` | No external OTP/LLM |
| E2E (OTP) | `tests/e2e-otp/` | Requires live OTP service in `.env.test` |

CI runs `npm run lint` + `npm test -- --coverage` + migrations against Postgres — **no external services**. Mock `fetch` for OTP/LLM in unit and integration tests.

Coverage excludes `src/app/api/**` and `src/lib/prisma.ts` (see `jest.config.js`) — test behavior through services instead.

## Security — do not regress

- Never commit `.env` or secrets. Document new vars in `.env.example` only.
- Sanitize before validate; never trust client HTML.
- Rate limiting is in-memory per instance — not shared across replicas (document if changing).
- JWT uses custom HMAC (`src/lib/jwt.ts`); `JWT_SECRET` required outside `NODE_ENV=test`.
- OTP routes require `OTP_SERVICE_URL` in production.

## Code style

- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`). Prefix intentionally unused vars with `_`.
- ESLint warns on `console.log` — use `console.warn` / `console.error` or `src/lib/logger.ts`.
- Match existing formatting (Prettier). Minimal, focused diffs — no drive-by refactors.

## Before opening a PR

1. Scope limited to the task.
2. `npm run lint` passes.
3. `npm run test:ci` passes (or targeted tests if change is isolated).
4. Migration included if schema changed.
5. All three locale files updated if UI strings changed.
6. Branch from `develop`; target `develop` (see README for release flow).

## Where to look first

| Task | Start here |
|------|------------|
| New API endpoint | Similar route in `src/app/api/`, then service + repository |
| Form / validation change | `src/lib/validation.ts`, `StoryForm.tsx`, `tests/unit/validation.test.ts` |
| Enrichment / prompts | `src/services/enrichment.service.ts`, `prompts/`, enrichment route |
| New UI string | `src/locales/*.json`, `src/types/translations.d.ts` |
| Auth / OTP | `src/app/api/otp/`, `src/lib/jwt.ts` |
