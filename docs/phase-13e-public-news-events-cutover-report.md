# Phase 13E: Public News and Events CMS Cutover

Result: **PASS - public News, Events, homepage News, related News and the event bar now use CMS data.** No public runtime dependency on the static News/Event source remains. No commit or push.

## Preflight

- Branch: `main`.
- Starting commit: `9e0b29c` (`Migrate News and Events to CMS`); Phase 13D committed and starting working tree clean.
- Configured MariaDB tunnel on `127.0.0.1:3307` available; database URL unchanged.
- Before edits, read-only migration verification passed for all six records and all three image byte/SHA-256 comparisons.
- Starting counts: News 3, Events 3, Gallery 2, Our Work 8, Stories 5, Inbox 3 threads / 4 messages.
- The initially supplied detail slugs belonged to Stories. The user confirmed resuming with the three actual News URLs below. No slug/data correction or migration occurred.

## Audited Consumers and Replacements

| Consumer                         | Previous Static Behavior                                            | CMS Behavior                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/routes/news/index.tsx`      | All News in array order; first three Events not labelled past       | Published News in backend editorial order; first three date-eligible published Events in that same Event query order |
| `src/routes/news/$slug.tsx`      | Static `getNews(slug)`; body paragraph array; article head metadata | Published News by slug; safe plain-text paragraph splitting; same head metadata values                               |
| Related News within detail       | Exclude current slug; first three other News in array order         | Exclude current slug; first three other published News in CMS order                                                  |
| `src/routes/index.tsx`           | All static News, with no slice/limit                                | All published News in CMS order, preserving the original selection rule                                              |
| `src/routes/events.tsx`          | Group Events using static status strings                            | Group published Events using their date relative to the server-provided Kathmandu calendar date                      |
| `src/components/site/Header.tsx` | Nearest eligible static Event, Kathmandu date, link to `/events`    | Existing CMS nearest eligible Event query via root SSR loader; same bar markup/information/link                      |
| `src/components/site/Cards.tsx`  | Static News/Event types and image/date fields                       | Public CMS types, `imageUrl`, `newsDate`, `eventStart`, registration flag and date-derived labels                    |
| `src/data/site-config.ts`        | Navigation/footer links to `/news` and `/events`                    | Links unchanged; no data lookup here                                                                                 |

Also audited `src/data/news.ts`, `src/data/types.ts`, root/SiteLayout, public server-function bridges, backend public queries, actual schema, and migration verification tooling. No separate public Event detail route exists. Event slugs are retained but do not generate new routes.

## Architecture and Changed Files

Existing queries reused without changing their SQL or CRUD semantics:

- `getPublishedNews()`.
- `getPublishedNewsBySlug(slug)`.
- `getPublishedEvents()`.
- `getNearestEligibleEvent()`.

Public route SSR loader -> existing `createServerFn` bridge -> dynamic import of server-only module -> existing published database query. Primary content is not loaded through `useEffect` or a browser-only fetch.

News listing and homepage use the existing News list bridge. Detail resolves one article by slug, returns normal not-found if absent/unpublished, then loads published News for related cards. The root loader supplies the nearest eligible Event to the shared Header and skips that query for admin routes. Route loaders use zero stale/GC times and normal reloading; no persistent publication cache introduced.

The Events bridge adds only `getEventsCalendarDateServerFn`, reusing the established server-only `getKathmanduDate()` helper. This provides a stable SSR/hydration calendar date for Event grouping without introducing another repository or date policy. `src/lib/news-events.ts` adds type-only public CMS aliases and plain-text paragraph parsing.

Changed application files:

- `src/routes/news/index.tsx`.
- `src/routes/news/$slug.tsx`.
- `src/routes/events.tsx`.
- `src/routes/index.tsx`.
- `src/routes/__root.tsx`.
- `src/components/site/Header.tsx`.
- `src/components/site/Cards.tsx`.
- `src/lib/events-server-functions.ts`.
- `src/lib/news-events.ts` (new).

This report is the only retained verification artifact. Temporary browser/check scripts were removed. Root route formatting was brought into existing formatter style while adding its loader; its metadata, favicon, error/not-found content and layout behavior are unchanged. Homepage changes remain limited to its News import/loader data, preserving unrelated historical formatting.

## News Fidelity and URLs

| Preserved Position | URL                                               | Publication Date | Body Paragraphs |
| ------------------ | ------------------------------------------------- | ---------------- | --------------- |
| 10                 | `/news/world-mental-health-day-community-program` | 2025-10-10       | 3               |
| 20                 | `/news/awareness-sessions-reach-new-communities`  | 2025-08-21       | 2               |
| 30                 | `/news/abyakta-katha-online-series-concludes`     | 2025-06-30       | 2               |

All three historical detail URLs returned HTTP 200. `/news/this-news-does-not-exist` returned HTTP 404 and the existing Page not found UI.

- Listing and homepage each show the three migrated articles exactly once, in CMS order matching source order.
- Exact title, excerpt, body, category, location, slug, date, demo flag and sort order verified against source/DB before and after testing. CMS IDs are present and unchanged.
- Paragraph parsing reproduces the original sequences exactly: **3, 2, 2 paragraphs**. It does not trim paragraph text, inject HTML, introduce Markdown, rewrite punctuation or alter persisted content.
- The source/schema has no attribution field; none was invented or removed. Existing category/location display remains.
- Related cards for article 1 are articles 2 and 3; for article 2, articles 1 and 3; for article 3, articles 1 and 2. Same exclusion/order/first-three rule, published records only.
- Existing demo-content treatment comes from CMS `demoContent`.
- Editorial date display uses `newsDate`, never `createdAt`. Date-only strings are formatted from local noon to avoid UTC day shifts.
- Detail title, description, Open Graph title/description and article type match previous metadata. Generic News/Events and homepage metadata unchanged. No new metadata policy introduced.
- Existing links retain `/news/{slug}`. Story routes/links were not changed.

## Events and Event Bar

| Preserved Position | Slug                         | Event Date | Registration Open |
| ------------------ | ---------------------------- | ---------- | ----------------- |
| 10                 | community-awareness-session  | 2026-09-18 | false             |
| 20                 | stress-management-workshop   | 2026-10-02 | true              |
| 30                 | world-mental-health-day-2026 | 2026-10-10 | false             |

All three Events appear exactly once on `/events`. Title, summary, category, date, location, registration flag, published flag, demo flag, ID and ordering metadata are unchanged. Dates remain exact `YYYY-MM-DD` strings.

On the verification date, October 8, 2026 in Kathmandu:

- October 10 is in the upcoming section and is the one Event teaser on `/news`.
- September 18 and October 2 appear under the existing Past events section, in their original relative editorial order.
- The workshop retains its Registration open badge even in the past section; registration and chronology are independent.
- Grouping derives chronology from dates, not the old stale static labels. No chronology field, new event field or schema change was added.

The bar uses the existing backend query: published only, `eventStart >= Kathmandu today`, earliest date first, stable tie-breakers, independent of registration. Today is eligible. Its candidate is World Mental Health Day 2026 on October 10 even though registration is closed. The bar still links to `/events` and displays the same title/date/CTA treatment. When the sole eligible Event was temporarily unpublished, the query returned null and the bar disappeared normally.

## Media Verification

No uploads, replacements, deletes or media-path changes occurred. All three live public News image sources equal the existing CMS `imageUrl`. Listing, homepage, hero and related-card images loaded normally at desktop and mobile.

| Retained Source       | CMS Key                                               | Bytes   | SHA-256                                                          |
| --------------------- | ----------------------------------------------------- | ------- | ---------------------------------------------------------------- |
| program-wmhd.jpg      | news/2026/10/6d4791f9-36ff-4b00-8b50-7b155fbf8f1c.jpg | 107404  | 0bf243b7f7dab0165352302a52c2d757ca991a23a77b47514f73267ae91e4c95 |
| program-awareness.jpg | news/2026/10/68297d66-64ae-4831-88c4-689008b98eb1.jpg | 208471  | 8227197cffd1f99eb1bfe2cd5ee3403c3e4db107806f4f5243fdcbc461999153 |
| program-online.png    | news/2026/10/a4df841e-01df-49ad-9a26-1e39c2bb4dc1.png | 2097234 | feca790c7923b3db2a4d17318188cd6b0bd6e0382a5333bffbf64ec8208992cb |

All URLs use `https://umanganepal.org/media/` plus the corresponding key. Verification before/after browser testing: HTTP 200, valid image Content-Type, non-zero bytes, exact byte equality and SHA-256 equality with retained static source. FTPS existence passed. Recursive read-only News directory listing contains exactly these three objects; zero temporary/orphan files.

## Publication Verification and Restoration

Controlled checks used the existing authenticated admin CMS:

1. Temporarily unpublished World Mental Health Day community program. `/news` and homepage dropped to two News cards; the direct detail URL returned 404; related cards excluded it.
2. Restored publication and verified the original three-card selection and detail page.
3. Temporarily unpublished World Mental Health Day 2026. `/events` and `/news` teaser excluded it; nearest query returned null and the bar disappeared on News/homepage.
4. Restored publication and verified the original Event/bar candidate.

No title, slug, excerpt, body, category, date, location, demo, sort or image fields changed. Normal admin saves changed `updatedAt`; the narrowly scoped verification harness restored each original timestamp after publication restoration. Full final row snapshots match the originals exactly. All six records are again published. No test rows were created.

Temporary authenticated sessions were removed individually; legitimate session IDs remain unchanged. No new auth mechanism or auth code change.

## Browser, SSR and Security Checks

- Desktop 1440x1000 and mobile 390x844: homepage, News listing, Events and all three News details checked.
- Exact News titles/excerpts/links/image URLs, paragraph arrays, editorial dates, related ordering and Event fields checked in rendered DOM.
- Hard refresh on every route passed. Raw SSR HTML independently contains CMS News images; content is not dependent on a client-side fallback.
- No duplicate News/Event records, no horizontal overflow, and no hydration/runtime errors attributable to the cutover.
- Screenshots inspected after scrolling through reveal animations so offscreen cards are rendered visibly.
- Existing public Gallery, Our Work and Stories routes returned HTTP 200; representative media remained valid non-zero HTTP 200 images.
- Public rendered HTML, browser server-function responses and built public JS/HTML/JSON scanned: no internal mailbox, storage keys, database URL, SMTP/FTP configuration or available secret environment values exposed.
- Public query projections remain unchanged and omit News `imageStorageKey`. Public server functions remain read-only. Admin CRUD/auth protections were not modified.
- Final logged-out browser request to `/admin/news-events` redirects to `/admin`; admin access remains protected.
- Server-only imports remain behind dynamic server functions; public type imports are erased by TypeScript.
- No emails were sent. No public form, Inbox, reply, SMTP or mail-routing action occurred.

## Static Source Audit

Repository-wide audit after cutover found **zero active public runtime imports of `src/data/news.ts`**. The only source-path reference is the legitimate manual `scripts/migrate-news-events-static.ts` reader.

`src/data/news.ts` and all static News assets remain unchanged as rollback/migration reference material. Source SHA-256 remains `0fb1ec75f86e88d9730806b5188f029e2d494808d33bddd9e5aa01ceccbf7ea4`. No static/CMS merge or hardcoded fallback introduced.

## Build and Checks

- `npm run build`: passed, with existing Vite/Nitro/npm warnings only.
- Full `tsc --noEmit`: **exactly ten unchanged unrelated baseline diagnostics**, in Reveal, testimonials, homepage and Resources. No new diagnostics.
- Focused TypeScript: no new cutover diagnostics; the homepage retains its two previously known type errors.
- ESLint/Prettier: all newly added/changed cutover code has no new diagnostics. Formatted News/Event routes, root, Header, Cards and helper/bridge pass Prettier. The homepage retains its **96 pre-existing Prettier lint errors** to avoid broadly reformatting unrelated UI; baseline-vs-current comparison confirms no new messages. Shared Cards retains its existing single Fast Refresh export warning. These are reported, not claimed as clean whole-file checks.
- Security scans: passed.
- `git diff --check`: passed.
- Git scope: only public News/Event consumers, event-bar loader/bridge, public presentation helper and this report. No schema, migrations, backend CRUD, storage, Gallery, Our Work, Stories, Inbox, auth, mail, public form, logo, favicon or Resources changes.

## Final State

| Module         | Final Count |
| -------------- | ----------- |
| News           | 3           |
| Events         | 3           |
| Gallery        | 2           |
| Our Work       | 8           |
| Stories        | 5           |
| Inbox threads  | 3           |
| Inbox messages | 4           |

Full unrelated CMS/Inbox records match before/after snapshots exactly. Full News/Event records match their pre-test snapshots exactly after restoration. No test rows, temporary auth sessions or temporary media remain. Static reference source/assets remain. No email, commit or push.

**Phase 13E complete.** No functional cutover blocker found. Historical TypeScript/formatting diagnostics described above remain outside this phase. Development site: `http://127.0.0.1:5177`.
