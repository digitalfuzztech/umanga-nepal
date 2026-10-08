# Phase 14B - Resources Schema Foundation

Date: 8 October 2026, Asia/Kathmandu. Branch: `main`. Starting commit: `c222baa` (`Add CMS gap audit`). Phase 14A was committed and the working tree was clean before this phase. The MariaDB connection through the existing `127.0.0.1:3307` tunnel succeeded. No DATABASE_URL change was made.

## Baseline

| Domain         | Starting count | Final count |
| -------------- | -------------- | ----------- |
| News           | 3              | 3           |
| Events         | 3              | 3           |
| Gallery        | 2              | 2           |
| Our Work       | 8              | 8           |
| Stories        | 5              | 5           |
| Inbox threads  | 3              | 3           |
| Inbox messages | 4              | 4           |
| Resources      | No table       | 0           |

Before editing, `SHOW TABLES` confirmed no Resource table. There was no Resource backend or bridge; `/admin/resources` was a protected placeholder and public Resources used static data. Full sorted-row SHA-256 snapshots of existing content, Inbox, admin users and sessions match exactly before/after. No existing records or sessions were changed.

## Source Audit

Authoritative source: `src/data/resources.ts`, re-read directly during this phase. Type declarations: `src/data/types.ts`. Ten actual records contain five articles and five guides, in the following array order:

| ID  | Slug                              | Exact title                               | Category                        | Type    | Minutes | Published date | Reviewed date | Paragraphs |
| --- | --------------------------------- | ----------------------------------------- | ------------------------------- | ------- | ------- | -------------- | ------------- | ---------- |
| r1  | what-mental-health-really-means   | What mental health really means           | Understanding Mental Health     | article | 5       | 2025-02-10     | 2025-02-10    | 4          |
| r2  | everyday-ways-to-work-with-stress | Everyday ways to work with stress         | Stress & Coping                 | guide   | 6       | 2025-03-04     | 2025-03-04    | 4          |
| r3  | understanding-anxiety             | Understanding anxiety                     | Anxiety                         | article | 5       | 2025-03-18     | absent        | 4          |
| r4  | building-self-esteem              | Building self-esteem, gently              | Self-Esteem                     | article | 4       | 2025-04-01     | absent        | 3          |
| r5  | social-media-and-your-mind        | Social media and your mind                | Social Media & Mental Health    | guide   | 5       | 2025-04-22     | absent        | 3          |
| r6  | how-to-support-a-friend           | How to support a friend who is struggling | Supporting a Friend             | guide   | 6       | 2025-05-06     | absent        | 4          |
| r7  | youth-mental-health-in-nepal      | Youth mental wellbeing in Nepal           | Youth Mental Health             | article | 6       | 2025-05-20     | absent        | 3          |
| r8  | for-families-and-caregivers       | For families and caregivers               | Families & Caregivers           | guide   | 5       | 2025-06-02     | absent        | 3          |
| r9  | when-to-seek-professional-help    | When to seek professional help            | When to Seek Professional Help  | guide   | 4       | 2025-06-16     | absent        | 4          |
| r10 | creative-expression-and-wellbeing | Creative expression and wellbeing         | Creative Expression & Wellbeing | article | 4       | 2025-07-01     | absent        | 3          |

All 35 paragraphs, titles, excerpts and punctuation remain in the untouched static source. This report inventories them; it does not copy them into the database.

### Actual field contract

| Source field      | Runtime type / presence                                | Public use / model decision                                                                                                                                      |
| ----------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | Required string; all 10; r1-r10                        | React identity. Future CMS rows use separately generated UUID IDs, not array indexes.                                                                            |
| `slug`            | Required string; all 10; unique                        | Routing and lookup. Stable explicit slug, separate from title.                                                                                                   |
| `title`           | Required string; all 10                                | Cards, detail, search, SEO. Editorial text.                                                                                                                      |
| `excerpt`         | Required string; all 10                                | Cards, detail introduction, search and description metadata. Editorial text.                                                                                     |
| `body`            | Required `string[]`; all 10                            | Detail paragraphs. Model as large plain text with blank-line paragraph boundaries, following Stories/News conventions.                                           |
| `category`        | Required string; all 10                                | Detail label, filter/search and related priority. No separate taxonomy table.                                                                                    |
| `type`            | Required string; actual values article/guide           | Card label. Schema TypeScript type covers these actual text kinds; no rigid SQL enum.                                                                            |
| `readingTime`     | Optional number in declaration; present on all 10      | Card/detail minutes. Nullable integer to preserve optional contract.                                                                                             |
| `publishedAt`     | Optional date string in declaration; present on all 10 | Editorial metadata, not currently rendered or used for sorting. Nullable date-only column.                                                                       |
| `reviewedAt`      | Optional date string; present only on r1/r2            | Detail reviewed month/year. Nullable date-only column.                                                                                                           |
| `references`      | Optional declared array; absent on all 10              | Unused conditional detail section; mismatch investigated below. No current data to persist.                                                                      |
| Publication state | No per-record source field                             | Static array makes all ten accessible. Add standard `published` control for upcoming CMS workflow, default true; no values migrated.                             |
| Ordering          | Array order; no explicit source property               | List order, first six homepage records, and related selection depend on it. Nullable `sortOrder` supports preserving source positions later; no values migrated. |

No source field is explicitly null. Optional absent values map to SQL NULL in a future migration. There are no images, storage keys, media URLs, attachments, authors, tags, scheduling, analytics or revision relationships in the actual records. No media fields or additional tables were added.

### Reference/type inconsistency resolution

The declared `Reference` contract is `{ label: string; url: string; year?: number }`. Resource detail instead reads `reference.title` and `reference.publisher`, neither declared, and does not render the declared URL. Repository-wide search found no populated Resource `references` array and no alternative citation data source. Thus there is no runtime citation object whose title/publisher must be preserved, and no information loss from omitting a citations column in this minimal foundation.

The declared label/URL/year contract is the existing data-side contract; the title/publisher renderer is the incompatible unused consumer. This investigation resolves what the actual data contains: **no references in any of the ten records**. It does not silently infer publisher fields or rewrite the static type/consumer. Citation support, if requested later, needs a deliberately validated contract and compatible renderer before real entries can be accepted. The three historical reference TypeScript diagnostics remain untouched under the public-code freeze.

The static Resource union also lists video/audio/download kinds, but no actual record or file uses them. This foundation intentionally represents the existing article/guide collection, not a speculative file/media library.

## Consumer Audit

| Consumer                                       | Fields / behavior required                                                                         | Phase result                                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/routes/resources/index.tsx`               | Static array; id keys; title/excerpt/category search; category filter; preserves source order      | Unchanged, still static. Category choices derive from current records, not the unused exported category list. |
| `src/routes/resources/$slug.tsx` loader        | Slug lookup via static `getResource`; not-found if absent                                          | Unchanged; no DB query or bridge added.                                                                       |
| Resource detail body/header                    | Title, excerpt, category, body paragraphs, optional readingTime/reviewedAt; conditional references | Unchanged. No image/file requirement.                                                                         |
| Resource detail SEO/head                       | Title, excerpt, article Open Graph type                                                            | Unchanged; still reads static loader data.                                                                    |
| Resource related section                       | Exclude current slug; same category first, then other categories; source order; first three        | Unchanged; motivates preserving order/category.                                                               |
| `src/components/site/Cards.tsx` ResourceCard   | Type, optional readingTime, title, excerpt, slug link                                              | Unchanged. No image UI.                                                                                       |
| `src/routes/index.tsx`                         | `resources.slice(0, 6)` rendered with ResourceCard; id keys                                        | Unchanged; first six remain static.                                                                           |
| `src/data/site-config.ts`, Header/Footer       | Links to `/resources` and `/resources/when-to-seek-professional-help`                              | Unchanged; stable slug required. No record loading.                                                           |
| `/get-support` and homepage CTA links          | Resource library links                                                                             | Unchanged navigation only.                                                                                    |
| `/admin/resources`, admin navigation/dashboard | Protected shell, disabled Add Resource, future-phase placeholder                                   | Unchanged; no loader, CRUD, editor or publication UI added.                                                   |

## Schema Decision

One new table: **`resource_items`**, exported as `resourceItems`. Inferred types: `ResourceItem`, `NewResourceItem`. No existing table definition was modified.

| TS field / SQL column          | SQL type                     | Null/default                                                     | Purpose / source                                                                             |
| ------------------------------ | ---------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `id` / `id`                    | VARCHAR(36), primary key     | NOT NULL; no generated SQL default                               | Existing project UUID convention; future server code generates IDs.                          |
| `slug` / `slug`                | VARCHAR(191), unique         | NOT NULL                                                         | Exact stable source slug; title edits must not implicitly change URLs.                       |
| `title` / `title`              | VARCHAR(255)                 | NOT NULL                                                         | Source title; Unicode editorial text.                                                        |
| `excerpt` / `excerpt`          | MEDIUMTEXT                   | NOT NULL                                                         | Source summary; sufficient capacity without silent truncation.                               |
| `content` / `content`          | MEDIUMTEXT                   | NOT NULL                                                         | Source body paragraphs as plain text separated by blank lines. No HTML/rich-text JSON.       |
| `category` / `category`        | VARCHAR(100)                 | NOT NULL                                                         | Source category; filtering/related label.                                                    |
| `type` / `type`                | VARCHAR(50)                  | NOT NULL                                                         | Actual article/guide kinds; Drizzle `$type<"article" \| "guide">`.                           |
| `readingTime` / `reading_time` | INT                          | NULL                                                             | Optional reading minutes.                                                                    |
| `publishedAt` / `published_at` | DATE, Drizzle string mode    | NULL                                                             | Optional original editorial publication date, independent of createdAt.                      |
| `reviewedAt` / `reviewed_at`   | DATE, Drizzle string mode    | NULL                                                             | Optional original review date.                                                               |
| `published` / `published`      | BOOLEAN (MariaDB TINYINT(1)) | NOT NULL, default true                                           | Established CMS visibility control. Future public queries must filter server-side.           |
| `sortOrder` / `sort_order`     | INT                          | NULL                                                             | Future explicit editorial positions preserve current source order; not date-driven ordering. |
| `createdAt` / `created_at`     | TIMESTAMP                    | NOT NULL, current timestamp default                              | Record creation time; not editorial publication/review date.                                 |
| `updatedAt` / `updated_at`     | TIMESTAMP                    | NOT NULL, current timestamp default, ON UPDATE CURRENT_TIMESTAMP | Project-standard update tracking.                                                            |

Charset/collation: **`utf8mb4` / `utf8mb4_unicode_ci`**, specified on initial CREATE TABLE, not repaired afterward. InnoDB engine confirmed live. Drizzle's installed MySQL table API does not represent table charset/collation; migration SQL is authoritative for that attribute, matching newer CMS migration practice.

Constraints/indexes:

- Primary key `resource_items_id` in migration; live MariaDB reports `PRIMARY` on id.
- `resource_items_slug_unique` unique index on slug, including case-insensitive uniqueness under the chosen collation.
- `resource_items_published_idx` for future published filtering.
- `resource_items_sort_order_idx` for source/manual ordering.

No date-order index: existing UI does not sort by publication or review date. No taxonomy/full-text/JSON/media indexes or speculative relationships. Current search/category filtering is client-side over a small collection and does not justify additional database indexes in this foundation.

Validation boundaries: SQL enforces NOT NULL and unique slugs; VARCHAR type and INT metadata intentionally follow existing CMS patterns rather than SQL enums/checks. `$type` supplies compile-time kind narrowing, not runtime SQL enforcement. Stable slug syntax, nonempty/bounded text, valid article/guide kinds, positive reading time, real dates and boolean input validation belong to the later server CRUD phase. No API is exposed here.

## Migration

Generated using `npm run db:generate`: **`drizzle/0009_needy_mentallo.sql`**. Normal generated metadata: `drizzle/meta/0009_snapshot.json` and journal entry index 9.

SQL was inspected before application. It contains only CREATE TABLE `resource_items`, its primary/unique constraints and two indexes. The CREATE TABLE was adjusted to explicitly specify UTF8MB4/collation before execution. There is no ALTER, INSERT, UPDATE or DELETE against existing tables.

Applied using **`npm run db:migrate`**, successfully. No `drizzle-kit push` used. Parsed comparison of the new snapshot against `0008_snapshot.json` confirmed every existing table snapshot is unchanged and only resource_items was added. Charset cannot be represented in this Drizzle snapshot format; retain the explicit migration clause for fresh environments.

No table-drop rollback was performed: the project's normal migration command is forward-only, and this phase requires the new table to remain. Data constraint tests used rollback-only transactions. MariaDB DDL implicitly commits, so those data rollbacks do not undo the table creation. No down migration or content-migration script was introduced.

## Verification

`SHOW CREATE TABLE resource_items` and `SHOW INDEX FROM resource_items` verified all 14 columns, nullability, defaults, unique slug, primary key, publication/order indexes, InnoDB and UTF8MB4/collation.

Controlled temporary Resource-only tests ran in a transaction and were rolled back:

- Exact Nepali/emoji round trip (`नमस्ते 🌿`) in title/category/excerpt, with two plain-text paragraphs separated by a blank line in content.
- Exact DATE round trip: publication `2025-02-10`, review `2026-10-08`, without time-of-day conversion.
- Duplicate slug with a different UUID rejected as `ER_DUP_ENTRY`.
- Explicit NULL rejected for id, slug, title, excerpt, content, category, type and published.
- Reading time, both editorial dates and sort order accepted NULL.
- Published default true and false -> true toggle persisted inside the transaction.
- Reading time 5 and sort order 10 -> 20 round-tripped.
- Creation/update defaults were populated; metadata update changed updatedAt without changing createdAt.
- MariaDB's live TIMESTAMP semantics coerce explicit NULL assignments to current time for these NOT NULL TIMESTAMP columns. This was verified and documented; it is existing project timestamp behavior, not a claim that NULL assignment is rejected for timestamps.
- Final rollback left **zero Resource rows**. An earlier timestamp-rejection assertion was corrected to test the actual MariaDB behavior; that transaction also rolled back. No permanent test data remains.

All original content/Inbox/auth row hashes matched preflight snapshots exactly. Schema tests affected only temporary Resource rows. No email, login/session creation, public lead submission or media operation occurred.

## Public Freeze and Security

Public Resource source, types, routes, cards, homepage data and navigation were not edited. Static runtime imports remain at Resources list/detail and homepage. No bridge, backend CRUD or public loader references resourceItems. `/admin/resources` remains the same protected disabled-action placeholder.

Read-only HTTP checks on the existing dev application (`http://127.0.0.1:5177`) returned 200 for `/resources`, a static Resource detail and homepage. The list still contains the first and last static titles despite resource_items being empty; homepage still contains the first static Resource. Guest `/admin/resources` returned 307 to `/admin`. No internal mailbox appeared in these responses.

No Resource content was migrated. No static source punctuation, paragraphs, slugs or dates were modified. No media columns were needed; no Resource media was uploaded/moved/deleted and FTPS implementation was untouched. Existing public/admin Resource files match committed content. Credentials/configuration/client DB access were not introduced in schema or migration; schema remains server-side and no new public import was added. Built public assets were scanned for configured password values, internal mailbox and server secret configuration names; no matches were found.

## Build and Checks

- Production `npm run build`: passed.
- Focused `npx tsc --noEmit --skipLibCheck --strict --target ES2022 --module ESNext --moduleResolution Bundler src/server/db/schema.ts`: passed.
- Focused `npx eslint src/server/db/schema.ts`: passed.
- Prettier: schema, generated JSON metadata and report checked; passed. SQL is retained in Drizzle SQL format; the installed formatter does not have a SQL parser.
- Full `npx tsc --noEmit --pretty false`: preflight had exactly the known 10 unrelated diagnostics. During this phase, concurrent user edits changed logo placeholders to `partner.photo` in `src/routes/partner-with-us.tsx` and `src/routes/about.tsx`. The final workspace check consequently has **12** diagnostics, the extras being `partner-with-us.tsx(64,36)` and `about.tsx(187,34)` TS2339 for `photo`. No Resource schema diagnostic exists. These concurrent edits were preserved and were not made or fixed by this phase.

The original ten diagnostics are two Reveal issues, three testimonial/Partner type issues, two homepage issues, and three Resource-reference renderer issues. The two extra diagnostics are fully attributable to concurrent logo edits, not the new schema. A clean full-workspace ten-diagnostic baseline is therefore not currently met; no unrelated fix was made to force that result.

## Final Git Scope and Remaining Blocker

Phase-owned files:

- `src/server/db/schema.ts`
- `drizzle/0009_needy_mentallo.sql`
- `drizzle/meta/0009_snapshot.json`
- `drizzle/meta/_journal.json`
- `docs/phase-14b-resources-schema-foundation-report.md`

Additionally, `src/routes/partner-with-us.tsx` and `src/routes/about.tsx` have concurrent changes that belong to the user and were preserved. They are outside Phase 14B scope. No unrelated application changes were made by this phase.

The Resource database foundation is applied and its constraints/empty state verified. The remaining verification caveat is the concurrent edits' two additional full-workspace TypeScript diagnostics. Before accepting future citations, settle and implement the declared reference contract in a separately authorized consumer/backend phase. Neither caveat required schema redesign or public changes here.

Final counts: **News 3, Events 3, Gallery 2, Our Work 8, Stories 5, Resources 0, Inbox 3 threads / 4 messages**. Existing legitimate data is exact, not merely count-equivalent. No Resource CRUD, admin UI, content/media migration, homepage/public cutover or next phase was started. No commit or push.
