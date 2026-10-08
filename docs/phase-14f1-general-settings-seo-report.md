# Phase 14F.1 — General Settings + SEO CMS

**COMPLETE.** The existing Phase 14F implementation was reused and finished. The database tunnel was available for this phase, so database, FTPS media, authenticated admin UI and public SSR verification were performed live. Production deployment itself is left to the user. No later CMS module was started.

## Scope and audit

- Branch `main`; starting commit `48b8669` (`Final CMS Works staged`). The worktree already contained the unfinished Phase 14F files. Those were inspected and retained; no second settings table/service/editor/SEO helper was created.
- Existing global source: `src/data/site-config.ts`; branding consumers: `Logo.tsx`, Header and Footer; root SSR metadata: `src/routes/__root.tsx`; route-specific metadata remains in each existing route.
- Exact organization name/description, root title/description and distinct OG title/description were preserved. Existing contact and social values were empty and remain NULL. No phone, email, address, social profile or coordinates were invented.
- Header source: `src/assets/logo/umanga-2.png`; footer source: `src/assets/logo/umanga-png.png`; favicon source: `public/favicon.ico`. Original assets remain unchanged as fallback/reference.
- Refinements: Website Title added to title fallback precedence; optional footer description is conditionally rendered; Map Location separated from Company Information; SEO Keywords uses a textarea; editorial SEO semantics are explained in the form; request-origin fallback supplies WebSite identity without inventing/persisting a canonical domain.
- Footer developer attribution, disclaimers, layout and navigation were preserved. About/Partner/Contact and all other page content remain untouched.

## Database

- Table: existing `general_settings` definition from Phase 14F.
- Singleton: integer primary key `id = 1`, default 1, SQL CHECK enforcing 1. Updates are constrained to that ID; clients cannot choose IDs or timestamps.
- Migration: `drizzle/0011_brainy_the_renegades.sql`, with normal Drizzle journal/snapshot metadata.
- `npm run db:migrate`: applied successfully. No unrelated table changes were included.
- `SHOW CREATE TABLE` verified columns, primary key, singleton CHECK and `utf8mb4_unicode_ci`.
- Database rejected a second singleton identity (`id=2`), duplicate `id=1` and NULL primary key inside a rolled-back transaction.
- Existing optional DECIMAL(10,7) latitude/longitude fields were retained. Valid coordinates round-tripped exactly in the authenticated lifecycle; out-of-range values were rejected by the server.
- Created timestamp remained unchanged through updates; updated timestamp behavior was verified. Tests restored the complete original settings row, including timestamps.

## General Settings fields

| Section                       | Fields                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Branding                      | Header Logo, Footer Logo, Favicon; public URLs plus server-only storage keys |
| Company Information           | Company Name, Company Description, Company Address, Phone, Email             |
| Map Location                  | Latitude, Longitude; nullable, ranges -90..90 / -180..180                    |
| Social Media                  | Optional HTTPS Facebook, Instagram, Twitter, YouTube, TikTok, LinkedIn URLs  |
| SEO Settings                  | Website Title, SEO Title, SEO Description, SEO Content, SEO Keywords         |
| Existing compatibility fields | Optional Website URL and separate Open Graph Title / Description             |

Editorial text supports Unicode, Nepali, emoji and paragraphs. Description/SEO Content accept up to 100,000 characters, descriptions/keywords have explicit safe bounds, and no submitted text is silently truncated. Phone format remains permissive. Populated social URLs require HTTPS with no embedded credentials. Empty optional values are saved as NULL by the editor. No map component or scheduler was added.

## SEO

- Title precedence: page-specific title → global SEO Title → Website Title → audited static fallback.
- Description precedence: page-specific description → global SEO Description → audited static fallback.
- Existing route-specific heads retain their own titles/descriptions and OG metadata. In particular, homepage title remains `Umanga Nepal | Every Mind Deserves to Be Heard` when global defaults change.
- Website Title supplies the global site identity/OG site name and homepage WebSite name.
- Separate OG title/description fields and their original values are preserved; no social-preview copy was overwritten by migration.
- SEO Content and SEO Keywords are editorial fields only. They are excluded from the public projection, not rendered as hidden content, and no `<meta name="keywords">` is emitted.
- Root loader/head and TanStack `HeadContent` provide metadata in SSR HTML. No client-only head manipulation was added.
- Organization JSON-LD omits missing properties, includes configured social links only, and uses organization name with Website Title fallback. Generic Organization type avoids an unsupported subtype.
- WebSite JSON-LD appears once on the homepage. An explicitly configured Website URL takes precedence; when absent, the actual server request origin is used. This value is not persisted and does not invent a canonical URL or add new canonical-link behavior. On deployment it reflects the site's actual request origin; local verification correctly used `http://127.0.0.1:5177/`.
- JSON-LD serialization escapes `<` against script termination and preserves quotes, Unicode and paragraphs.

## Public integration

- Header and mobile drawer prefer the CMS header logo; dimensions, aspect ratio, links and alt text are preserved. Missing configuration uses the original static logo.
- Footer prefers the CMS footer logo and uses configured description/contact/social fields. Empty description/contact/social values produce no fake content or empty social anchors.
- Social icons use authentic brand icons from `react-icons/fa6`; links are accessible and use safe external-link attributes. Existing footer attribution and legal/clinical disclaimers remain.
- Favicon is served from the CMS media URL in SSR `<link rel="icon">`; valid original ICO bytes remain unchanged.
- Public settings exclude storage keys, database ID/timestamps, editorial SEO planning fields, credentials, session data and server configuration.

## Admin

- Existing authenticated CMS hub retained at `/admin/cms`; General Settings editor at `/admin/cms/general-settings`.
- Existing session guard and authenticated server functions protect admin reads, metadata saves and branding replacements. No new authentication mechanism was introduced.
- Editor has Branding, Company Information, Map Location, Social Media and SEO Settings sections, labeled controls, validation messages, pending guards and save feedback.
- Branding replacements are independent of metadata saving; they do not overwrite unsaved form text.
- Real UI save → hard refresh retrieved exact Unicode, paragraphs, all contact/social values and coordinates. Real UI uploads for header/footer/favicon passed.
- Desktop, tablet and 390px screenshots/overflow checks were performed. The editor remains a single-column form on mobile, with reachable controls and no horizontal overflow. Footer visuals were inspected; existing dimensions and visual language remain.
- Existing hub cards remain; no future page editor or fake CMS data was added.

## Initial migration and assets

Utility: `scripts/migrate-general-settings-static.ts` / `npm run settings:migrate`.

- `--dry-run`: passed without writes/uploads.
- Normal migration: created exactly one legitimate settings row and three branding assets.
- `--verify`: exact metadata comparisons and complete image byte/hash comparisons passed.
- Rerun: detected existing singleton, preserved administrator edits, performed no writes/uploads. A second identical set of media was not created.
- Exact company description: `Umanga Nepal is a registered non-profit, non-governmental organization fostering social wellbeing and mental health awareness across Nepal.`
- Company Name and Website Title: `Umanga Nepal`.
- Root SEO title/description and OG values were migrated verbatim from the audited defaults. Optional contact/social/coordinates/SEO planning fields and Website URL remain NULL.

| Asset                    | Storage key                                                 | Source = remote SHA-256                                            | HTTP |
| ------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------ | ---- |
| Header PNG, 652845 bytes | `branding/2026/10/dfe12d12-f621-4f64-9b33-0e5daee9cea9.png` | `59e987a024f30377976b26f9f9127aa51d6e7ef2c1c5e2a1d6d0bba365887927` | 200  |
| Footer PNG, 691328 bytes | `branding/2026/10/82dc6ceb-d5cd-421c-affc-30784c1e4b21.png` | `8baad16c342981dfc63cff68eeb8629d1f6613424bfc247683215e090153036d` | 200  |
| ICO, 4286 bytes          | `branding/2026/10/97dcdcff-3ba6-4d51-b57d-426a3ab9e325.ico` | `0e3a440dc28f2b76512edc610456b91c75eb5c5bc88dd0bc6ea3139355668e04` | 200  |

Public URLs are `https://umanganepal.org/media/` followed by each listed key. All responses had valid image content types and exact byte equality. No conversion, recompression or artwork changes occurred.

The existing branding-category/ICO application-level support was retained. Core FTPS connection, TLS validation, authentication, directory and protocol behavior were not changed. Existing UUID/path/signature/8 MB rules remain. Gallery still rejects ICO.

## Tests and cleanup

Harnesses:

- `scripts/verify-general-settings-unit.ts`: validation/Unicode/paragraph/null tests, HTTPS/email/coordinate/unknown-field rejection, anonymous admin read/update/replacement rejection, ICO/oversized-file checks, SEO precedence and JSON-LD escaping.
- `scripts/verify-phase14f1.ts`: live singleton constraints, authenticated lifecycle through real admin UI, hard refresh, publication-independent public projection, responsive checks, real header/footer/ICO replacements, temporary old-file cleanup and all 19 requested public routes.
- `scripts/verify-general-settings-ssr.ts`: JavaScript-disabled verification of initial SSR title/description, Website Title fallback, homepage override, favicon, exact JSON-LD objects, escaping, explicit/request-origin website URL behavior and editorial-field exclusion.
- `scripts/phase14f-baseline.ts --capture/--compare`: exact before/after content rows and existing sessions, 26 Gallery remote keys/URLs and SHA-256 hashes.

Results:

1. Anonymous admin read, update and branding replacement rejected; logged-out editor redirected to existing admin sign-in.
2. Authenticated read/save/refresh persisted exact Nepali, emoji, multiline descriptions, SEO planning text, six social links and coordinates.
3. Invalid email, latitude, longitude, URL and internal-admin-mailbox value rejected safely. Null optional values preserved.
4. Homepage SSR retained page-specific title/description/OG metadata while global defaults changed. A route without specific metadata used global SEO Title, then Website Title when SEO Title was NULL.
5. JavaScript-disabled homepage emitted exactly one Organization and one WebSite object in the initial head. Quotes, special characters, `<script>` text and Unicode remained safe valid JSON.
6. Public output/bundle scans found no configured DB/FTP/SMTP credential or internal mailbox exposure. Editorial test markers, storage keys and private fields did not appear in public responses.
7. All six social icons rendered when configured; only one rendered when one URL was configured; restored NULL values produced zero social icons.
8. Real header/footer/ICO replacement URLs rendered publicly, returned exact source bytes, and the previous temporary logo was removed after another replacement.
9. Original migrated branding objects were explicitly retained during replacement tests. Original settings, keys, URLs and timestamps were restored; all temporary media was removed. Final branding inventory is exactly the three legitimate migration assets.
10. Temporary authenticated test session was deleted; existing session snapshot matches exactly.
11. Home, About, Our Work, Stories, Resources, News, Events, Gallery, Get Involved, Volunteer, Partner With Us, Support Us, Invite Umanga, Share Your Story, Contact, Get Support, Impact, Privacy and Terms returned HTTP 200 on direct navigation with no related browser runtime errors. No form was submitted and no email was sent.
12. Final before/after comparison passed for all legitimate content rows, Gallery album/records, existing sessions and all 26 Gallery files/hashes. No test records remain.

Screenshots are in the local temporary directory `umanga-phase14f1` (editor and footer at 390/768/1440px, restored homepage). They are verification artifacts, not uploaded media or repository assets.

## Quality and known unrelated baseline

- `npm run build`: passed.
- Focused ESLint on settings/service/SEO/UI/migration/test files: passed, zero errors/warnings.
- Focused Prettier: passed.
- Focused TypeScript: zero diagnostics in General Settings/SEO and their verification harnesses. Harness-inclusive check uses `scripts/tsconfig.phase14f.json`; it reports only the same unrelated application diagnostics.
- Full TypeScript: **12 existing diagnostics**, unchanged. No About/Partner/Contact/Footer or historical diagnostic was repaired.
- Repository lint: **7,270 errors / 7 warnings**, unchanged from the starting 14F.1 baseline. Full lint does not pass; the pre-existing backlog was not modified.

## Files and scope

The worktree retains the earlier Phase 14F schema/migration, settings service/types/bridge/context, CMS hub/editor/routes, root/logo/footer integration, dependency metadata and verification tools. This completion pass specifically refined `global-seo.ts`, `general-settings-server-functions.ts`, `GeneralSettingsEditor.tsx`, Footer, the CMS shell title match and the verification harnesses/configuration, and added this report.

No duplicate settings architecture was introduced. No page CMS, chatbot, cookies, password recovery, mail automation, Leads or later phase was started. No unrelated concurrent work was modified. Nothing was staged, committed or pushed.

Exact files changed/added by this completion pass, on top of the pre-existing Phase 14F work:

```text
src/lib/global-seo.ts
src/lib/general-settings-server-functions.ts
src/components/admin/cms/GeneralSettingsEditor.tsx
src/components/admin/AdminLayout.tsx
src/components/site/Footer.tsx
scripts/verify-general-settings-unit.ts
scripts/tsconfig.phase14f.json
scripts/verify-phase14f1.ts
scripts/verify-general-settings-ssr.ts
docs/phase-14f1-general-settings-seo-report.md
docs/phase-14f-cms-foundation-general-settings-seo-report.md (historical checkpoint link)
```

## Final verified database/media state

```text
News: 3
Events: 4
Gallery: 26
Our Work: 8
Stories: 5
Resources: 10
Inbox: 3 threads / 4 messages
General Settings: 1

Gallery remote media: 26 legitimate files, unchanged hashes
Branding remote media: 3 legitimate migrated files
Temporary media: 0
Known orphan media from this phase: 0
Temporary admin sessions: 0
Emails sent: 0
```

**Phase 14F.1 is COMPLETE.** Live local/database/FTPS acceptance passed; production deployment and its post-deployment smoke test remain the user's next action. No Phase 14G work was started.
