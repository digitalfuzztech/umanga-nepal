# Phase 14C - Resources CMS Backend

Date: 8 October 2026, Asia/Kathmandu. Branch: `main`. Starting commit: `c222baa` (`Add CMS gap audit`).

## Baseline and Concurrent Work

The starting tree was not clean: Phase 14B schema/migration/report files and About, Partner and Contact edits were already staged. Their staging and contents were preserved; this phase did not stage, commit, reformat, revert or modify them. Phase 14B was applied in the database but not yet represented by a newer Git commit in this checkout.

The existing database connection/tunnel was available. Actual preflight counts differed from the requested baseline in one place: **Events already contained 4 rows, not 3**. All four were preserved, and all existing content/Inbox/auth records were compared using full sorted-row hashes. No Event was inserted, edited or deleted by this phase. A clarification about the additional Event was requested; it is not safe to remove it to force the previously stated count.

| Domain         | Actual starting count | Final verified count |
| -------------- | --------------------- | -------------------- |
| News           | 3                     | 3                    |
| Events         | 4                     | 4                    |
| Gallery        | 2                     | 2                    |
| Our Work       | 8                     | 8                    |
| Stories        | 5                     | 5                    |
| Resources      | 0                     | 0                    |
| Inbox threads  | 3                     | 3                    |
| Inbox messages | 4                     | 4                    |

## Backend Audit and Architecture

Inspected current implementations and public projections in Stories, News, Events, Our Work and Gallery, the News/Event validators, Event admin/public server-function bridges, current authentication/session helpers and the manual News/Event verification harness.

Resources follows the same conventions:

- Server-only repository: `src/server/resources/index.ts`, marked with `@tanstack/react-start/server-only`.
- Existing lazy Drizzle database, existing Resource schema and existing admin authentication; no second connection/auth system.
- Zod validation, project-standard UUIDs, safe application errors and explicit public projections.
- Dynamic-import bridges: `src/lib/admin-resources-server-functions.ts` and `src/lib/resources-server-functions.ts`.
- Transactional inserts with readback, row-locked metadata updates/deletes, authoritative database unique-slug enforcement.
- Manual focused harness: `scripts/verify-resources-backend.ts`. Run explicitly with `npx tsx scripts/verify-resources-backend.ts`; it is not attached to install/build/server boot.

No schema, migration, UI, public consumer, citation renderer, media or mail implementation changed. Bridges are prepared for future integration and have no current route/component consumer.

### Public queries

`getPublishedResources()` returns all published Resources in deterministic CMS order. No new homepage limit, search policy or related-resource algorithm was invented. The future consumers can continue first-six homepage selection, category/search filtering and same-category-first related selection over this order.

`getPublishedResourceBySlug(slug)` applies slug validation and `published = true` inside SQL. Invalid, unknown and unpublished slugs return null without revealing whether a hidden record exists.

Returned fields: id, slug, title, excerpt, content, category, type, readingTime, sortOrder, publishedAt, reviewedAt and createdAt. No updatedAt/publication-management flag, SQL/configuration, authentication data, media key or arbitrary internal field is included. There are no Resource media columns to expose.

Public failures return/throw safe unavailable messages. The bridge never imports DB/auth modules as client runtime code; server code is dynamically imported inside handlers.

### Admin queries

`getResourcesForAdmin()` and `getResourceById(id)` require existing admin authentication. Admin lists include published and unpublished records and every actual Resource column. ID lookup returns null for a missing valid UUID, matching other CMS read conventions.

No speculative admin slug lookup, search system, pagination or taxonomy was added: current CMS editors list their collections and edit by ID. Source volume is ten Resources. Further bounding/pagination can be evaluated when collection growth warrants it.

### Create, update and delete

`createResource(input)` authenticates first, strictly validates editable metadata, generates `crypto.randomUUID()` server-side and inserts/readbacks inside a transaction. The unique slug constraint is authoritative, including race conditions. Any database error becomes SAVE_FAILED or a safe slug conflict; no raw database exception is returned.

`updateResourceMetadata({ id, metadata })` authenticates, validates UUID and a strict nonempty patch, locks the exact row, merges only defined editable fields, validates the resulting complete metadata and updates/readbacks transactionally. ID and createdAt remain unchanged. Explicit slug editing is allowed; changing title alone does not change slug. A conflicting slug update rolls back.

`deleteResource(id)` authenticates, validates UUID, locks/loads the exact row and deletes only it inside a transaction. A missing row returns NOT_FOUND. No other table or media flow is involved.

## Validation

| Field                    | Authoritative server rule                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| slug                     | Trim outer whitespace; 1-191 chars; `^[a-z0-9]+(?:-[a-z0-9]+)*$`. No title-derived regeneration, lowercasing or silent renaming.                               |
| title                    | Trim; required, 1-255 chars; Unicode allowed.                                                                                                                  |
| excerpt                  | Trim; required, 1-5,000 chars.                                                                                                                                 |
| content                  | Trim only outer whitespace; required, 1-100,000 chars; internal spaces, Unicode, line endings and paragraph breaks preserved. No HTML conversion or rendering. |
| category                 | Trim; required, 1-100 chars; normal editorial text.                                                                                                            |
| type                     | Exactly article or guide, matching the actual text collection/schema TypeScript model.                                                                         |
| readingTime              | Nullable integer 1-2,147,483,647; omitted -> null. No numeric-string coercion.                                                                                 |
| sortOrder                | Existing shared validator: nullable signed 32-bit integer; integer strings accepted, blank/omitted -> null. Fractions/out-of-range values rejected.            |
| publishedAt / reviewedAt | Nullable real YYYY-MM-DD calendar dates, years 1000-9999; omitted -> null. No time-of-day/UTC conversion.                                                      |
| published                | Strict boolean; omitted on creation -> true, matching schema default.                                                                                          |
| id                       | Server-generated on create; update/delete/read identifiers must be UUIDs.                                                                                      |
| createdAt / updatedAt    | Server/database-owned; rejected in create/metadata patches.                                                                                                    |

All metadata objects are strict: unsupported fields such as imageUrl, client ID/timestamps or internal values are rejected. Update envelope is strict and an empty/undefined-only patch is rejected. Explicit null is accepted only for nullable metadata. Backend functions accept unknown input and validate it themselves, independently of transport validation.

The frontend does not yet submit these objects. The admin bridge accepts unknown create/update transport data so the authenticated service can turn malformed inputs into safe INVALID_RESOURCE_DATA responses; this is not bypassed validation. Query/delete transport envelopes are strict and the service independently validates IDs.

No citation or file validation was introduced. The known unused reference-renderer mismatch and the ten static Resource records remain untouched.

### Publication

Public SQL queries require published true. Admin queries include both states. `publishedAt` remains optional editorial metadata and does not schedule publication, hide future-dated records or substitute for createdAt. A published fixture dated 2030 was returned normally during verification.

### Ordering

Explicit non-null sortOrder first, ascending; null positions afterward; equal/null positions use createdAt descending and ID ascending. This matches the existing Gallery/Our Work deterministic fallback pattern without introducing Resource publication-date ranking. The future migration must assign source positions to preserve static array order; no such content/order migration occurred here.

### Timestamps

Creation uses existing DB default timestamps. Metadata updates use the existing `ON UPDATE CURRENT_TIMESTAMP`; createdAt is never part of the editable set. Real timestamp changes were verified across a second boundary. No-op writes may retain updatedAt under normal MariaDB semantics, as in existing CMS modules.

### Safe errors

ResourceApplicationError codes: UNAUTHORIZED, INVALID_RESOURCE_DATA, SLUG_ALREADY_EXISTS, NOT_FOUND, UNABLE_TO_LOAD, SAVE_FAILED, UPDATE_FAILED and DELETE_FAILED. Duplicate errors are detected through the shared nested MariaDB error helper. All database exceptions are mapped to safe messages; failures are not converted into false success.

## Authorization and Lifecycle Tests

The manual harness used a real existing admin user and one newly created session through existing auth helpers. Calls ran inside a TanStack server request context with the appropriate cookie. No test authentication override was implemented in the application. The session token was never printed, and only the temporary session was deleted afterward.

| Test                                                   | Result                                                                                                                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logged-out create/update/delete                        | UNAUTHORIZED; zero Resource writes.                                                                                                                                        |
| Logged-out admin list/get                              | UNAUTHORIZED; no private records returned.                                                                                                                                 |
| Initial published/admin list and unknown/invalid slug  | Empty lists; null public detail.                                                                                                                                           |
| Authenticated create                                   | UUID, exact text/date values and DB timestamps returned.                                                                                                                   |
| Authenticated read                                     | Admin-by-ID matches saved record; public detail omits private management fields.                                                                                           |
| Title-only update                                      | ID, slug and createdAt preserved; updatedAt advances.                                                                                                                      |
| Explicit slug update                                   | Same row ID; old public slug becomes null, new slug resolves.                                                                                                              |
| Duplicate create                                       | SLUG_ALREADY_EXISTS; no extra row.                                                                                                                                         |
| Duplicate update                                       | SLUG_ALREADY_EXISTS; original row remains value-identical.                                                                                                                 |
| Publication off/on                                     | Hidden from public list/detail when off, still visible to admin; restored when on.                                                                                         |
| Ordering fixtures                                      | Lower explicit positions first; creation/ID tie-breaks stable; null positions last; dates do not rank records.                                                             |
| Unicode and paragraphs                                 | Nepali, emoji, blank-line paragraphs persist exactly after outer-whitespace trimming.                                                                                      |
| Long content                                           | Roughly 80,000 characters stored/read exactly; 100,001 rejected.                                                                                                           |
| Nullable metadata                                      | Reading time, dates and sortOrder can be cleared to null.                                                                                                                  |
| Invalid data                                           | Empty values, malformed/oversized slug, invalid kind, invalid dates/times, fractional/out-of-range numbers, nonboolean publication and unauthorized extra fields rejected. |
| Empty/invalid update and client timestamp/ID overrides | INVALID_RESOURCE_DATA; no mutation.                                                                                                                                        |
| Missing update/delete                                  | NOT_FOUND; missing admin ID lookup null.                                                                                                                                   |
| Controlled database transaction failure                | SAVE_FAILED/UPDATE_FAILED/DELETE_FAILED; no false success or raw error leakage.                                                                                            |
| Delete/readback                                        | Authenticated deletion works; each deleted ID reads null; published list returns empty.                                                                                    |

The failure harness temporarily replaced the server process's transaction boundary, restored it in finally and did not alter credentials or live database configuration. No SQL corruption/media/SMTP failure was induced. This is a controlled application-boundary test, not a distributed-failure guarantee.

Four obvious temporary Resource fixtures were created for lifecycle/ordering verification; rejected requests created none. Cleanup used recorded exact IDs only, through backend deletes with an exact-ID fallback in finally. **Final Resources = 0.** No real static Resource was inserted or copied. Complete original content/Inbox/admin/session snapshots match before/after, including all four preexisting Events.

## Public Freeze, Regression and Security

- `/resources` and `/resources/$slug` still import `src/data/resources.ts`.
- Homepage still imports that array and renders its first six.
- No route/component imports the new Resource bridges/backend; no empty-table cutover took place.
- ResourceCard, static data/types/URLs/paragraphs, reference renderer and navigation were not changed.
- `/admin/resources` remains the existing protected placeholder, without a loader/editor or CRUD controls.
- No Resource media, migration/content-migration script, schema change or upload category was added.
- No mail was sent; public forms, Inbox and SMTP/FTPS implementations were untouched.
- Read-only local HTTP checks returned 200 for Resources list/detail and homepage; static titles still render despite the empty table. Guest admin Resources redirected 307 to `/admin`.
- Public source/output scans and a scan of 81 built public JS files against configured secret values found zero credential/configuration/internal-mailbox exposures. No secret values were logged.
- Backend test outputs contain safe counts/results, not Inbox data, credentials, session tokens or SQL exceptions.

Existing data equality was checked by full sorted-row SHA-256 snapshots, not counts alone. About, Partner and Contact user work was preserved. No existing public form was submitted, so no extra email or lead was created for regression testing.

## Build and TypeScript

- Production `npm run build`: passed.
- ESLint on backend, both bridges and harness: passed.
- Prettier on changed files/report: passed.
- Focused TypeScript program rooted at all four Resource implementation/harness files, using the project compiler options plus Node types for the manual server script: **zero diagnostics**, including its imported dependencies.
- Full `npx tsc --noEmit --pretty false`: **12 diagnostics**, matching the starting workspace condition; no Resource backend/bridge diagnostic.

The 12 baseline diagnostics comprise 10 historical issues (Reveal 2, testimonial/Partner model 3, homepage 2, unused Resource reference renderer 3), one concurrent About `partner.photo` diagnostic and one concurrent Partner `partner.photo` diagnostic. Those unrelated files were not modified to make checks pass. One harness generic-inference issue found by the focused check was fixed; Node type definitions were enabled only in the in-memory focused check, without changing project configuration.

The harness ran successfully with exit code 0. Its simulated failure test intentionally emitted one safe `[resources] save_failed operation failed.` message, not an actual database failure.

## Final Scope and Blockers

Phase 14C-owned files:

- `src/server/resources/index.ts`
- `src/lib/admin-resources-server-functions.ts`
- `src/lib/resources-server-functions.ts`
- `scripts/verify-resources-backend.ts`
- `docs/phase-14c-resources-backend-report.md`

No files from the initially staged Phase 14B/About/Partner/Contact work were changed or staged by this phase. Git diff/stat/name checks must be interpreted alongside the initial staged baseline: these preexisting changes are not Resource backend scope additions. New Phase 14C files remain unstaged.

**Backend verification passed; no Resource implementation blocker was found.** The requested Events=3 baseline cannot be certified because the live database started and ended with 4 unchanged Event rows. All other requested counts match. Confirmation of that concurrent Event is a baseline bookkeeping issue; this phase deliberately did not delete or mutate it.

Final actual counts: **News 3, Events 4, Gallery 2, Our Work 8, Stories 5, Resources 0, Inbox 3 threads / 4 messages**. Temporary Resource fixtures and the temporary session were removed. No admin UI, content migration or public cutover was begun. No commit or push.
