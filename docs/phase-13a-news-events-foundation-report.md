# Phase 13A - News & Events database foundation

## Preflight and scope

- Branch: `main`.
- Starting commit: `eada770 Add channel-safe Admin Inbox replies` (Phase 12D committed).
- Starting worktree: clean; existing/concurrent work preserved.
- Configured local MariaDB tunnel: port 3307 listening; database connection succeeded.
- No commit or push performed.
- Files: `src/server/db/schema.ts`, `drizzle/0008_spooky_flatman.sql`, `drizzle/meta/0008_snapshot.json`, `drizzle/meta/_journal.json`, `scripts/verify-news-events-schema.ts`, and this report.

## Audit: sources and active consumers

`src/data/news.ts` is the sole News/Event record source. Types are in `src/data/types.ts`.

| Consumer                              | Current behavior                                                                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/news` (`src/routes/news/index.tsx`) | All three News in array order; first three Events whose static status is not `past`, also in array order.                                                   |
| `/news/$slug`                         | `getNews(slug)` lookup; router not-found for unknown slug; body paragraphs; related News are first three other articles in array order.                     |
| `/events`                             | Separate upcoming/past groups using the static status; array order retained within each group. No Event detail route.                                       |
| `/`                                   | All three News via `NewsCard`; links to News and Events; no featured News selection.                                                                        |
| `Header.tsx` top event bar            | Kathmandu calendar today; filter non-past Events with date >= today; sort date ascending; select first. Generic link `/events`, fixed label `View event`.   |
| `Cards.tsx`                           | News: image, category, date, optional location, title, excerpt, slug link. Event: status badge, category, title, summary, date, location; no image or link. |
| `site-config.ts`                      | About dropdown and footer links to `/news` and `/events`. No record-specific links.                                                                         |
| `/admin/news-events`                  | Protected placeholder with News/Events tabs, disabled Add button, empty state.                                                                              |
| Admin navigation/dashboard            | Links to the placeholder.                                                                                                                                   |

There is no public `/news-events` route, separate Event detail, Event registration URL, Event CTA metadata, author/source, tags, featured flag, or editorial highlighted flag. Search also found Newsletter source labels `/news` and `/events`; those belong to lead routing and remain untouched.

News detail SEO uses title, excerpt, Open Graph title/description and `og:type=article`; no OG image currently. Listing/Events metadata is generic. All SEO remains unchanged.

## Complete current record inventory

Array order is authoritative, independently for News and Events. All six records have `demoContent=true`. There is no static published field; all are currently displayed.

| Order   | ID  | Slug                                      | Title                                     | Category          | Date       | Location        | Image/status                       |
| ------- | --- | ----------------------------------------- | ----------------------------------------- | ----------------- | ---------- | --------------- | ---------------------------------- |
| News 1  | n1  | world-mental-health-day-community-program | World Mental Health Day community program | Campaign          | 2025-10-10 | Kathmandu       | `src/assets/program-wmhd.jpg`      |
| News 2  | n2  | awareness-sessions-reach-new-communities  | Awareness sessions reach new communities  | Programs          | 2025-08-21 | Nepal           | `src/assets/program-awareness.jpg` |
| News 3  | n3  | abyakta-katha-online-series-concludes     | Abyakta Katha online series concludes     | Programs          | 2025-06-30 | Online          | `src/assets/program-online.png`    |
| Event 1 | e1  | community-awareness-session               | Community mental health awareness session | Awareness Session | 2026-09-18 | To be announced | upcoming                           |
| Event 2 | e2  | stress-management-workshop                | Stress management workshop                | Workshop          | 2026-10-02 | To be announced | registration-open                  |
| Event 3 | e3  | world-mental-health-day-2026              | World Mental Health Day 2026              | Campaign          | 2026-10-10 | To be announced | upcoming                           |

Exact summaries:

- n1 excerpt: Volunteers, partners and community members gathered for a day of conversation, creative activity and advocacy.
- n2 excerpt: Umanga Nepal's awareness program continued into additional schools and ward-level community groups.
- n3 excerpt: Six structured online sessions closed with a conversation on expressing distress safely.
- e1 summary: An open session covering mental wellbeing, stigma and how to support someone who is struggling.
- e2 summary: A practical, experiential workshop on triggers, regulation and coping strategies.
- e3 summary: Community activities, creative sessions and advocacy with partner organizations.

Exact News bodies (paragraph sequence):

**n1**

1. Demo content prepared for layout purposes.
2. Each year around 10 October, Umanga Nepal marks World Mental Health Day with community activities and awareness campaigns.
3. The program brought together volunteers, partner organizations and community members for interactive sessions and advocacy.

**n2**

1. Demo content prepared for layout purposes.
2. Sessions cover mental wellbeing, common challenges, self-esteem and how to seek appropriate support.

**n3**

1. Demo content prepared for layout purposes.
2. The series covered self-improvement, social media and mental health, and expressing distress.

Events have no body, images, time-of-day, end date, tags, author/source or links. News also has no event start/end, tags, featured/highlight, author/source or CTA metadata.

## Schema decision and exact model

Two tables are the smallest faithful design: News requires image and long-form body; Events require a schedule, summary, location and independent registration state, without media/body. A combined table would require multiple type-dependent nullable fields and validation. No SQL type enum is needed with separate tables.

`news_items` (15 columns):

| Property / SQL column               | Type                      | Null/default                                                     |
| ----------------------------------- | ------------------------- | ---------------------------------------------------------------- |
| id                                  | VARCHAR(36), primary key  | Required; future application UUID                                |
| slug                                | VARCHAR(191), unique      | Required, stable route identity                                  |
| title                               | VARCHAR(255)              | Required                                                         |
| excerpt                             | MEDIUMTEXT                | Required                                                         |
| content                             | MEDIUMTEXT                | Required; plain paragraphs separated by blank lines              |
| category                            | VARCHAR(100)              | Required; free-form                                              |
| newsDate / news_date                | DATE, Drizzle string mode | Required editorial date, separate from createdAt                 |
| imageUrl / image_url                | MEDIUMTEXT                | Required                                                         |
| imageStorageKey / image_storage_key | VARCHAR(512)              | Required; server-only future storage reference                   |
| location                            | VARCHAR(255)              | Nullable, as in current News type                                |
| demoContent / demo_content          | BOOLEAN                   | Required, default false                                          |
| published                           | BOOLEAN                   | Required, default true                                           |
| sortOrder / sort_order              | INT                       | Nullable; preserves manual array order later                     |
| createdAt / created_at              | TIMESTAMP                 | Required, default current timestamp                              |
| updatedAt / updated_at              | TIMESTAMP                 | Required, default current timestamp, on update current timestamp |

`event_items` (13 columns):

| Property / SQL column                | Type                      | Null/default                                                                       |
| ------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------- |
| id                                   | VARCHAR(36), primary key  | Required; future application UUID                                                  |
| slug                                 | VARCHAR(191), unique      | Required; preserves existing static slugs even though no Event detail route exists |
| title                                | VARCHAR(255)              | Required                                                                           |
| summary                              | MEDIUMTEXT                | Required                                                                           |
| category                             | VARCHAR(100)              | Required; free-form                                                                |
| eventStart / event_start             | DATE, Drizzle string mode | Required; current source has dates only                                            |
| location                             | VARCHAR(255)              | Required                                                                           |
| registrationOpen / registration_open | BOOLEAN                   | Required, default false; represents current registration-open label                |
| demoContent / demo_content           | BOOLEAN                   | Required, default false                                                            |
| published                            | BOOLEAN                   | Required, default true                                                             |
| sortOrder / sort_order               | INT                       | Nullable                                                                           |
| createdAt / created_at               | TIMESTAMP                 | Required, default current timestamp                                                |
| updatedAt / updated_at               | TIMESTAMP                 | Required, default current timestamp, on update current timestamp                   |

No Event end/time/image/body/CTA fields or speculative author/tags/featured/highlight fields. The event bar needs only publication and date eligibility plus earliest-date selection; no editorial highlight toggle exists. Upcoming/past will be derived from eventStart in future queries; registrationOpen stays independent. No stored redundant upcoming/past status.

Audit caveat: on 2026-10-08, e1/e2 dates are already past while their static status still puts them in the upcoming group. Static behavior is unchanged now. Future cutover must deliberately use date-derived classification as required, rather than copying those stale flags. The existing top bar already excludes elapsed dates.

Indexes per table: primary ID, unique slug, published, editorial/scheduled date, sort order. No TEXT/JSON indexes or unnecessary foreign keys. Inferred exports: `NewsItem`, `NewNewsItem`, `EventItem`, `NewEventItem`.

## Migration and live verification

- `npm run db:generate` generated `0008_spooky_flatman.sql` plus snapshot/journal.
- Inspected SQL: only creates the two new tables, unique constraints and six secondary indexes. No unrelated ALTER/UPDATE/DELETE.
- Both CREATE statements explicitly specify `DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` before application. Database latin1 default is not relied upon.
- Current Drizzle MySQL API does not model table charset/collation; schema comments document the migration requirement. Snapshot and live logical columns/indexes agree; SQL is authoritative for encoding.
- `npm run db:migrate`: success. No drizzle-kit push.
- SHOW CREATE TABLE for both: InnoDB, correct columns/nullability/defaults/indexes, unique VARCHAR(191) slug, UTF8MB4 / utf8mb4_unicode_ci.
- Rollback-only transaction: exact Nepali title/excerpt/content and emoji round-trip; blank-line paragraphs intact; Kathmandu Unicode location intact; nullable News location remains NULL.
- DATE checks: News 2025-10-10 and Event 2026-10-10 return exactly; no times/end dates exist to test.
- MariaDB rejects duplicate slugs in both tables (`ER_DUP_ENTRY`); all test rows rolled back.
- Final `news_items=0`, `event_items=0`; no static migration or fake content.
- Retained manual verifier: `node node_modules/tsx/dist/cli.mjs scripts/verify-news-events-schema.ts --before` snapshots existing data hashes in OS TEMP; default invocation verifies migrated tables, rolls back test inserts, and compares existing hashes. Never runs automatically. Requires an empty News/Event dataset.

## Regression, checks and security

- Gallery: 2 rows, complete row hash unchanged.
- Our Work: 8 rows, complete row hash unchanged.
- Stories: 5 rows, complete row hash unchanged.
- Inbox: 2 legitimate threads and 3 messages, complete row hashes unchanged; preserved.
- HTTP 200 regressions: `/`, `/news`, `/events`, representative historical News detail, `/contact`, `/stories`, `/gallery`, `/our-work`.
- Unauthenticated `/admin/news-events` follows the existing redirect to `/admin`; protected placeholder source unchanged.
- Public News/Event pages, homepage, bar, cards, navigation, SEO, static data/assets, admin placeholder, media storage, Inbox/mail/forms and favicon have no changes.
- `npm run build`: passed. Existing tooling warnings only.
- Focused TypeScript for schema and verifier: passed. Full-project TypeScript still has the same ten unrelated pre-existing diagnostics in Reveal, testimonials, homepage and Resource detail; no changes made to those files.
- ESLint and Prettier for schema/verifier: passed. Generated snapshot/journal formatting: passed. SQL inspected directly (no SQL formatter configured). `git diff --check`: passed.
- Changed files and built browser JS scanned against configured credential/secret values: none found. No private key literal or new tracked credentials. Migration contains no connection details.
- Git scope is limited to schema, new SQL/snapshot/journal, manual foundation verifier and report. No commit/push.

## Phase 13B readiness

No database-foundation blocker. Phase 13B can implement authenticated backend CRUD and storage deliberately for News images, using the current schema. No CRUD, admin UI, content migration, public cutover, media upload or Resources work began here.
