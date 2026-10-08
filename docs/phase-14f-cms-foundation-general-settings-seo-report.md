# Phase 14F — CMS Foundation, General Settings and Global SEO

Historical checkpoint: the tunnel blocker and pending checks below were subsequently resolved in [Phase 14F.1](phase-14f1-general-settings-seo-report.md). Use that completion report for current deployment readiness.

**Status: NOT COMPLETE. Database tunnel unavailable.** Local implementation and offline checks are complete; database application, live migration and browser acceptance are pending. No database migration or media upload was performed.

## Baseline and blockers

- Branch: `main`; starting commit: `48b8669` (`Final CMS Works staged`). Starting worktree was clean, with no staged files. No commit, push or staging operation was performed.
- Authoritative user-provided baseline: News 3, Events 4, Gallery 26, Our Work 8, Stories 5, Resources 10, Inbox 3 threads / 4 messages.
- The initial full-row/Gallery inventory snapshot failed with a connection timeout. Subsequent listener checks found nothing listening on `127.0.0.1:3307`. DATABASE_URL was not changed. Current counts and Gallery hashes therefore cannot be claimed as freshly verified.
- No existing content rows, sessions, images or media were changed. No emails were sent. No test media or sessions were created.
- The source has no canonical website URL. Confirmation was requested for `https://umanganepal.org/`, the existing verified public-media domain. Until confirmed, migration leaves `websiteUrl` NULL. WebSite JSON-LD is omitted when a canonical URL is absent; a localhost URL is never substituted.

## Audit

| Source                           | Actual data / consumers                                                                                                                                                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/site-config.ts`        | Organization name `Umanga Nepal`; exact description below; email/phone/address/map URL all empty; Facebook/Instagram/YouTube/LinkedIn URLs all empty. No coordinates, Twitter or TikTok values. Footer, Contact, navigation and homepage established-note consumers. |
| `src/components/site/Logo.tsx`   | Public header and mobile drawer use `src/assets/logo/umanga-2.png`.                                                                                                                                                                                                  |
| `src/components/site/Footer.tsx` | Footer uses `src/assets/logo/umanga-png.png`, siteConfig description/contact/social. Existing links, layout, developer attribution and disclaimers are retained.                                                                                                     |
| `public/favicon.ico`             | Existing 32×32, single-entry ICO; 4,286 bytes. No conversion needed.                                                                                                                                                                                                 |
| `src/routes/__root.tsx`          | SSR root metadata through TanStack Router `head()` and `HeadContent`, static title/description/author/OG/Twitter card, static favicon link.                                                                                                                          |
| Individual public route heads    | Existing route-specific titles/descriptions continue overriding root defaults. No page CMS fields were added.                                                                                                                                                        |
| SEO / crawl infrastructure       | No existing canonical, Organization/WebSite JSON-LD or sitemap implementation found. Existing admin robots/noindex declarations retained.                                                                                                                            |

Exact organization description:

> Umanga Nepal is a registered non-profit, non-governmental organization fostering social wellbeing and mental health awareness across Nepal.

The root title, description and distinct OG text have been moved verbatim into `globalSeoFallback` and the migration source mapping. No presentational copy, page content or Contact data was invented. Empty source values become SQL NULL. Navigation and the homepage established note remain static.

## Schema

New table: `general_settings`. Integer primary key defaults to 1, with SQL CHECK `id = 1`; this prevents a second singleton identity. All editorial/media fields are nullable. UTF8MB4 is established in initial creation SQL, using `utf8mb4_unicode_ci`. No unrelated table changes appear in the migration.

| Columns                                                                                     | Type / purpose                                                              |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `id`                                                                                        | INT NOT NULL DEFAULT 1, primary key and singleton CHECK                     |
| `header_logo_url`, `footer_logo_url`, `favicon_url`                                         | TEXT, public branding URLs                                                  |
| `header_logo_storage_key`, `footer_logo_storage_key`, `favicon_storage_key`                 | VARCHAR(512), server-only media references                                  |
| `company_name`                                                                              | VARCHAR(255), organization name                                             |
| `company_description`                                                                       | MEDIUMTEXT, exact plain text                                                |
| `address`                                                                                   | TEXT                                                                        |
| `phone`, `email`                                                                            | VARCHAR(100), VARCHAR(320)                                                  |
| `latitude`, `longitude`                                                                     | DECIMAL(10,7), optional coordinates                                         |
| `facebook_url`, `instagram_url`, `twitter_url`, `youtube_url`, `tiktok_url`, `linkedin_url` | TEXT, optional social profiles                                              |
| `website_url`                                                                               | TEXT, explicit canonical site identity; initially NULL pending confirmation |
| `website_title`, `seo_title`                                                                | VARCHAR(255)                                                                |
| `seo_description`, `seo_keywords`                                                           | TEXT                                                                        |
| `seo_content`                                                                               | MEDIUMTEXT, editorial planning content                                      |
| `open_graph_title`, `open_graph_description`                                                | VARCHAR(255), TEXT; preserve existing distinct OG copy                      |
| `created_at`, `updated_at`                                                                  | TIMESTAMP NOT NULL, defaults NOW(); updated timestamp ON UPDATE             |

The singleton primary key is the only index needed. Inferred exports: `GeneralSettings`, `NewGeneralSettings`.

Migration: `drizzle/0011_brainy_the_renegades.sql`, plus normal Drizzle journal/snapshot metadata. `npm run db:generate` passed. SQL was inspected and explicitly given the initial UTF8MB4/collation clause. **Not applied:** live table, SHOW CREATE TABLE, singleton/Unicode/timestamp transaction tests remain pending.

## Migration and branding integrity

Utility: `scripts/migrate-general-settings-static.ts`; command `npm run settings:migrate`. Supports `--dry-run`, `--verify`, and an explicit `--website-url=...` argument after canonical URL confirmation.

- Dry-run passed: source text mapping and asset hashes reported, no connection/write/upload required.
- Normal mode requires an empty settings table; if its single row already exists, it preserves administrator edits and performs no writes/uploads.
- Uploads are sequential; HTTPS response, image content type and exact byte equality are required before insertion. Insert is transactional; uploaded assets are compensated sequentially on insertion failure.
- Verification compares every migrated source metadata field exactly, and compares complete remote bytes and SHA-256 for each asset.
- Actual migration and rerun tests are pending; do not interpret prepared idempotency logic as a live test result.

| Asset                            | Source bytes | Source SHA-256                                                     | Remote result |
| -------------------------------- | -----------: | ------------------------------------------------------------------ | ------------- |
| `src/assets/logo/umanga-2.png`   |       652845 | `59e987a024f30377976b26f9f9127aa51d6e7ef2c1c5e2a1d6d0bba365887927` | Not uploaded  |
| `src/assets/logo/umanga-png.png` |       691328 | `8baad16c342981dfc63cff68eeb8629d1f6613424bfc247683215e090153036d` | Not uploaded  |
| `public/favicon.ico`             |         4286 | `0e3a440dc28f2b76512edc610456b91c75eb5c5bc88dd0bc6ea3139355668e04` | Not uploaded  |

Original assets remain untouched. The media layer gains only a `branding` category and ICO support restricted to that category. ICO header, directory bounds and contained PNG/DIB signatures are validated; existing size, UUID/key, traversal and MIME rules remain. ICO remains rejected for Gallery. `withFtp`, connection/TLS/authentication, directory creation and transfer protocol logic are unchanged.

The existing pre-transfer allocation hook is retained. An interrupted branding transfer cleans its newly allocated exact key without depending on database availability. Shared-reference checks protect existing branding/Gallery/Our Work/Stories/News media during subsequent cleanup. Cleanup failures yield a safe warning rather than false success. Real failure/compensation/media-replacement tests remain pending.

## CMS and public integration

- `/admin/cms` uses the existing protected admin shell. It contains all 20 requested cards grouped under Global, Main Pages, Get Involved, Support / Contact and Legal.
- General Settings opens `/admin/cms/general-settings`. Already implemented collection managers retain working links. Future page-section editors are explicitly marked as planned for a later phase; no broken routes or fake records are created.
- Sidebar content navigation is consolidated to a single CMS entry; Dashboard and Inbox remain. Existing CMS URLs remain usable.
- General Settings form has Branding, Company / Contact, Social Media and SEO sections. Labels, appropriate input types, field errors, pending guards and save feedback are implemented. Branding replacement is separate from metadata saves, preserving unsaved metadata.
- Existing authenticated sessions are required for settings reads/updates/media replacement. Caller-controlled IDs, timestamps, media URLs and storage keys are excluded from mutation payloads.
- Root loader obtains the public projection once; a context supplies header/logo/footer consumers. Logos retain existing sizes, styling and static fallback assets.
- Footer reads CMS description/contact/social values, omits absent values, safely opens social links and uses authentic Font Awesome brand icons through `react-icons`. The six supported social profiles do not produce empty icons. Footer navigation, attribution and disclaimers are retained.
- No individual page editor, Impact editor, Contact cutover, authentication change, mail change or unrelated system change was implemented.
- These integrations are implemented locally but **live authenticated UI, hard-refresh, desktop/tablet/390px and visual regression checks are pending**.

## SEO and structured data

- `resolveSeo()` implements page-specific → global → audited fallback precedence. Existing route-specific metadata is retained.
- Root `head()` emits global title/description, OG title/description/site name and the CMS favicon link through SSR `HeadContent`; no client-only head mutation or useEffect system was added.
- SEO content and keywords are stored for editorial use and excluded from the public projection. No hidden SEO content or meta-keywords tag is emitted by the new helper.
- Homepage head generates Organization and, when a canonical URL exists, WebSite JSON-LD. Missing values are omitted; generic Organization type is used without invented subtypes. JSON is escaped against script termination.
- Offline tests confirm valid JSON round-trip, escaping, null omission, sameAs and WebSite identity. **Actual SSR HTML and live metadata checks are pending.**
- Design references: [Google Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization), [site-name WebSite guidance](https://developers.google.com/search/docs/appearance/site-names), [Google does not use meta-keywords for ranking](https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag).

## Verification and security

`scripts/verify-general-settings-unit.ts` passed:

- Nepali, emoji, long description and paragraph preservation; nullable fields.
- Valid HTTPS social URLs and coordinates; malformed/scheme/credential URL rejection, invalid email/coordinates, oversized content and unsupported fields rejected.
- Anonymous admin read, settings update and branding replacement rejected without DB/media/session changes.
- Invalid and oversized ICO rejected; existing Gallery ICO exclusion preserved.
- SEO precedence and JSON-LD validity/escaping.

Browser production-bundle scan: zero configured credential or internal-admin-mailbox matches. Public settings exclude storage keys, IDs, timestamps, SEO planning content/keywords and all session/configuration data. Error bridges return safe messages, with no raw SQL, hostnames, credentials or stack traces.

Live admin server-function requests, authenticated save/update, singleton DB constraints, replacement compensation, publication-neutral public regressions and remote inventory comparison are still pending.

## Quality and Git scope

- Production build: passed.
- Focused ESLint: passed, zero errors/warnings after separating the context hook from component exports.
- Focused formatting: checked only Phase 14F files. Footer's existing content/attribution remains unchanged; formatting of its touched file accounts for a small lint backlog reduction.
- Full TypeScript: exactly 12 existing diagnostics, no new application diagnostics. Focused harness-inclusive TypeScript configuration also checks the new scripts; unrelated diagnostics are left untouched.
- Repository lint: **7,270 errors / 7 warnings**, reduced from the supplied 7,280/7 by legitimate formatting in Phase 14F files, including the touched Footer file. Full lint does not pass. No unrelated lint cleanup was attempted.
- Changes are limited to settings schema/migration metadata, settings service/bridge/types/SEO helper, branding validation allowance, CMS hub/editor/routes/navigation, public root/header-logo/footer integration, narrow migration/verification tools, dependency metadata and this report. Generated route-tree changes correspond only to the new CMS routes.
- About, Partner, Contact, Gallery data/implementation, News, Events, Our Work, Stories, Inbox, mail, original logo/favicon files and static site-config data were not edited. No concurrent work was overwritten or staged.

## Required resumption

Restore the existing database tunnel without changing DATABASE_URL, then capture the before snapshot and all 26 Gallery hashes before applying the prepared migration. Confirm canonical website URL. Run DB constraint/authenticated lifecycle tests, actual media migration, fidelity/idempotency tests, real admin/public browser and SSR verification, clean test values/media/sessions and compare the exact final baseline. Re-run quality checks after any resulting fixes.

**Phase 14F remains NOT COMPLETE.** The expected final state below is a target, not a freshly verified database result:

```text
News: 3
Events: 4
Gallery: 26
Our Work: 8
Stories: 5
Resources: 10
Inbox: 3 threads / 4 messages
General Settings: 1
```
