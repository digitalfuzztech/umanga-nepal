# Phase 13D: Static News and Events Migration

Result: **PASS**. Three News articles and three Events migrated and verified. Public News, Events, homepage News and the event bar remain static. No commit or push.

## Baseline and Scope

1. Branch: `main`.
2. Starting commit: `2ef828e` (`Add News and Events CMS`), with Phase 13B/13C committed. Working tree was clean. The configured local MariaDB tunnel was listening on port 3307; no environment changes.
3. Migration utility: `scripts/migrate-news-events-static.ts`. Package command: `npm run news-events:migrate`, with `--dry-run` and `--verify`. Manual only, never called by routes/build/deployment.
4. Audited source and consumers:
   - `src/data/news.ts`: authoritative News/Event arrays, image imports and `getNews`.
   - `src/data/types.ts`: static field semantics.
   - `src/routes/news/index.tsx`: three News in array order; first three non-past-labelled static Events.
   - `src/routes/news/$slug.tsx`: static slug lookup, article metadata, paragraph rendering and first three other News.
   - `src/routes/events.tsx`: static status-based grouping; no Event detail route.
   - `src/routes/index.tsx`: all three static News cards.
   - `src/components/site/Cards.tsx`: image/category/date/location/summary/link rendering; Event status labels.
   - `src/components/site/Header.tsx`: static event bar, Kathmandu calendar date, nearest date at or after today, excluding static `past` labels. Registration does not determine eligibility.
   - `src/data/site-config.ts`: About dropdown/footer News and Events links.
   - Authenticated admin route, News/Event managers, backend validators/public queries, actual schema and existing Stories migration pattern.

## Exact Migrated Inventory

5. News, in preserved order:

| Order | Static ID | Slug                                      | Exact Title                               | Publication Date | Paragraphs | Category | Location  |
| ----- | --------- | ----------------------------------------- | ----------------------------------------- | ---------------- | ---------- | -------- | --------- |
| 10    | n1        | world-mental-health-day-community-program | World Mental Health Day community program | 2025-10-10       | 3          | Campaign | Kathmandu |
| 20    | n2        | awareness-sessions-reach-new-communities  | Awareness sessions reach new communities  | 2025-08-21       | 2          | Programs | Nepal     |
| 30    | n3        | abyakta-katha-online-series-concludes     | Abyakta Katha online series concludes     | 2025-06-30       | 2          | Programs | Online    |

6. Events, in preserved order:

| Order | Static ID | Slug                         | Exact Title                               | Event Date | Category          | Location        | Registration Open |
| ----- | --------- | ---------------------------- | ----------------------------------------- | ---------- | ----------------- | --------------- | ----------------- |
| 10    | e1        | community-awareness-session  | Community mental health awareness session | 2026-09-18 | Awareness Session | To be announced | false             |
| 20    | e2        | stress-management-workshop   | Stress management workshop                | 2026-10-02 | Workshop          | To be announced | true              |
| 30    | e3        | world-mental-health-day-2026 | World Mental Health Day 2026              | 2026-10-10 | Campaign          | To be announced | false             |

7. News field fidelity: exact comparisons passed for title, slug, excerpt, content, category, location, `newsDate`, `demoContent`, `published` and `sortOrder`. UUID v4 CMS IDs generated independently of static IDs.
8. Event field fidelity: exact comparisons passed for title, slug, summary, category, location, `eventStart`, `registrationOpen`, `demoContent`, `published` and `sortOrder`.
9. Slug fidelity: all three slugs per table unique and identical to source. Public query order equals source order; no normalization or regeneration.
10. Paragraph fidelity: source arrays joined with exactly `\n\n`; splitting persisted content reproduces the complete original arrays, including punctuation/capitalization. Paragraph counts are **3, 2, 2**, not three for every News article. No HTML or Markdown introduced.
11. Date fidelity: exact date-only strings, no UTC conversion/time-of-day. Editorial dates use `newsDate`; Events use `eventStart`.
12. Registration fidelity: only source `registration-open` maps to true. Static `upcoming`/`past` are not persisted. Dates remain authoritative for future chronology; September 18 and October 2 are past on the verification date, October 8, 2026.
13. Publication: all six source records are visible in current public consumers and have no explicit unpublished flag; all migrated as `published = true`. Actual schema includes `demoContent`; all six source values were preserved as true.
14. Ordering: source arrays have no numeric ordering field, but their consumers use array order. Existing schema `sortOrder` stores **10, 20, 30 independently per table**. Published-query order verified exactly.

## News Media

15. Exactly three original images uploaded through existing `uploadImage` with category `news`, UUID filenames and year/month paths. No Event images or static-asset modifications.
16. Each URL returned **HTTP 200**, valid JPEG/PNG Content-Type, non-zero bytes and HTTPS delivery. Each FTPS key exists.
17. Every HTTPS byte buffer and SHA-256 exactly matches the retained source:

| Source                           | Bytes   | SHA-256                                                          | Migrated Media Key                                    |
| -------------------------------- | ------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| src/assets/program-wmhd.jpg      | 107404  | 0bf243b7f7dab0165352302a52c2d757ca991a23a77b47514f73267ae91e4c95 | news/2026/10/6d4791f9-36ff-4b00-8b50-7b155fbf8f1c.jpg |
| src/assets/program-awareness.jpg | 208471  | 8227197cffd1f99eb1bfe2cd5ee3403c3e4db107806f4f5243fdcbc461999153 | news/2026/10/68297d66-64ae-4831-88c4-689008b98eb1.jpg |
| src/assets/program-online.png    | 2097234 | feca790c7923b3db2a4d17318188cd6b0bd6e0382a5333bffbf64ec8208992cb | news/2026/10/a4df841e-01df-49ad-9a26-1e39c2bb4dc1.png |

Public URL prefix: `https://umanganepal.org/media/`, followed by the corresponding key.

18. Compensation design: validate every record/image first; upload and verify all images before inserting. Insert all six rows and verify fields inside one MariaDB transaction. Failed insertion rolls back all rows and compensates invocation-owned uploads. Post-commit verification failure removes only invocation-owned UUIDs transactionally, then their media. Media cleanup failures are explicitly reported. No failure occurred during this run, so compensation was inspected rather than fault-injected. No automatic retries or overwrites.
19. Dry run: `npm run news-events:migrate -- --dry-run` passed before writes; validates source/unique slugs/real dates/binary signatures/8 MB limit and prints complete planned metadata/image hashes. No inserts/uploads/deletes/email.
20. Real migration: `npm run news-events:migrate` passed, three News plus three Events committed together, three images uploaded. Complete existing CMS/Inbox snapshots matched before and after.
21. Verify: `npm run news-events:migrate -- --verify` passed read-only; all fields, source paragraph arrays, public query order, News slug lookups, remote existence and HTTPS hashes match. Unknown News slug returns null; public News payload omits storage keys.
22. Rerun protection: a subsequent `--dry-run` exits non-zero with `STOP: Target tables populated (News=3, Events=3). No migration writes allowed.` Normal migration uses the same preflight guard and rechecks both tables before insertion. No duplicates created.

## UI, Freeze and Regressions

23. Admin CMS: authenticated browser verification showed three News and three Events. All thumbnails loaded. Each of six Edit dialogs was reopened at desktop and 390px; every text/date/order field and published/demo/registration checkbox matched source exactly. Dialogs closed without saving. Both tabs persisted through hard refresh. Event badges were Past/Past/Upcoming and registration Closed/Open/Closed, independently.
24. Public News: `/news` and all three historical `/news/{slug}` URLs load after hard refresh. Listing/homepage show each News once. Detail paragraph text matches source. Images continue using static assets; no `/media/news/` image references.
25. Public Events: `/events` hard refresh shows the three original static Event cards once; static grouping/status labels intentionally remain unchanged. No public Event detail route exists.
26. Event bar: still imported from static source in Header. Browser verification confirms the static nearest eligible World Mental Health Day 2026 bar links to `/events`. No CMS query was connected.
27. Static preservation: `src/data/news.ts` SHA-256 is `0fb1ec75f86e88d9730806b5188f029e2d494808d33bddd9e5aa01ceccbf7ea4` before/after migration. Original images match the source hashes above. Git shows no changes to static source/assets, consumers, SEO, navigation or schema/migrations.
28. Media cleanup: read-only recursive FTPS listing found **exactly the three intended News files**, identical to row storage keys. Zero temporary duplicate/orphan News files. Existing unrelated media untouched.
29. Gallery: two complete rows unchanged, representative image HTTP 200/valid/non-zero.
30. Our Work: eight complete rows unchanged, representative image HTTP 200/valid/non-zero.
31. Stories: five complete rows unchanged, representative image HTTP 200/valid/non-zero.
32. Inbox: **three threads/four messages**, full records including IDs/content/metadata/state/timestamps exactly unchanged before/after migration and browser verification. Legitimate data preserved.
33. Mail: zero emails sent. No lead submissions, replies, SMTP tests or mail-module changes.
34. Responsive: authenticated admin News/Events checked at 390x844 and 1440x1000; all six records readable, images loaded, no horizontal overflow. Screenshots visually inspected. No browser page/hydration errors recorded.
35. Authorization: guest access to `/admin/news-events` redirects to `/admin` and exposes no article admin content. Existing auth reused. One temporary verification session created and only that session removed; legitimate session IDs unchanged afterward.
36. Security: admin browser server-function payloads had no storage keys, internal mailbox or environment configuration. Rendered public pages had no internal mailbox. Built public JS/HTML/JSON and migration changes checked against available secret environment values; no matches. No credentials or image buffers logged. Public media URLs are intentional.
37. Build: `npm run build` passed. Existing Vite/Nitro configuration and npm environment warnings remain; no application build failure.
38. Targeted checks: focused TypeScript diagnostics are zero for migration/backend/admin News/Event files. ESLint and Prettier pass for those files and package script. Full-project `tsc --noEmit` still reports exactly the existing ten unrelated diagnostics in Reveal, testimonials, homepage and Resources; none added. `git diff --check` passes.
39. Final database counts:

| Table/Module   | Initial | Final |
| -------------- | ------- | ----- |
| News           | 0       | 3     |
| Events         | 0       | 3     |
| Gallery        | 2       | 2     |
| Our Work       | 8       | 8     |
| Stories        | 5       | 5     |
| Inbox threads  | 3       | 3     |
| Inbox messages | 4       | 4     |

40. Blocker before Phase 13E: **none found for migration/cutover readiness**. Phase 13E must explicitly replace static public consumers; that work was not begun. Static rollback/reference material is retained. Existing historical TypeScript diagnostics remain outside this phase.

## Reviewable Working Tree

Only these files were changed/added:

- `package.json`: manual migration command.
- `scripts/migrate-news-events-static.ts`: migration, dry run and read-only verification.
- `docs/phase-13d-news-events-migration-report.md`: this report.

Temporary browser/type/security verification scripts removed. No backend CRUD, admin UI, schema, migrations, public routes, event bar, Inbox/mail, Resources or unrelated CMS changes. No commit or push.
