# Phase 14E: Resources Migration and Public Cutover

## Status

**Phase 14E COMPLETE.** Exactly 10 static Resources were migrated with 10/10 exact field matches. Public listing, detail, related Resources and homepage cards now use the existing published-only CMS queries. URLs, content, editorial ordering and visual design were preserved. No schema, Resource admin redesign or media changes were required.

## Baseline and Scope

- Branch: `main`; starting commit: `c222baa` (`Add CMS gap audit`). Prior-phase changes and concurrent/staged user work were present and preserved.
- Database tunnel: `127.0.0.1:3307` was listening; DATABASE_URL unchanged.
- Starting counts: News 3, Events 4, Gallery 26, Our Work 8, Stories 5, Resources 0, Inbox 3 threads / 4 messages. Gallery has the original two standalone photos and 24 legitimate `Umanga Collections` album photos.
- No Gallery, News, Events, Stories, Our Work, Inbox, authentication, mail, storage, About, Partner, Contact or Footer implementation was changed. No staging, commits, pushes, resets, restores or cleaning were performed.

## Source Audit

Source: `src/data/resources.ts`. It contains 10 text articles/guides, in editorial array order. Each has a static ID, slug, title, excerpt, category, type, reading time, publication date and paragraph-array `body`. Only the first two contain review dates. No source record contains media, files, references or an explicit publication flag.

Static source SHA-256 before migration and after verification:

`529f67f23059d94d49db3246648194ed20958c938a02d76e352f3f3c91d424c3`

| Order | Slug                              | Exact Title                               | Type    | Published Date | Reviewed Date | Minutes |
| ----: | --------------------------------- | ----------------------------------------- | ------- | -------------- | ------------- | ------: |
|    10 | what-mental-health-really-means   | What mental health really means           | article | 2025-02-10     | 2025-02-10    |       5 |
|    20 | everyday-ways-to-work-with-stress | Everyday ways to work with stress         | guide   | 2025-03-04     | 2025-03-04    |       6 |
|    30 | understanding-anxiety             | Understanding anxiety                     | article | 2025-03-18     | NULL          |       5 |
|    40 | building-self-esteem              | Building self-esteem, gently              | article | 2025-04-01     | NULL          |       4 |
|    50 | social-media-and-your-mind        | Social media and your mind                | guide   | 2025-04-22     | NULL          |       5 |
|    60 | how-to-support-a-friend           | How to support a friend who is struggling | guide   | 2025-05-06     | NULL          |       6 |
|    70 | youth-mental-health-in-nepal      | Youth mental wellbeing in Nepal           | article | 2025-05-20     | NULL          |       6 |
|    80 | for-families-and-caregivers       | For families and caregivers               | guide   | 2025-06-02     | NULL          |       5 |
|    90 | when-to-seek-professional-help    | When to seek professional help            | guide   | 2025-06-16     | NULL          |       4 |
|   100 | creative-expression-and-wellbeing | Creative expression and wellbeing         | article | 2025-07-01     | NULL          |       4 |

### Active Consumers Audited

- `src/routes/resources/index.tsx`: listing, title/excerpt/category search, categories in first-appearance order and existing empty state.
- `src/routes/resources/$slug.tsx`: slug lookup, SEO metadata, article paragraphs, reading/review metadata and related cards. Related selection prioritizes same category, then other categories, excludes the current slug and takes three in source order.
- `src/routes/index.tsx`: homepage first six Resource cards.
- `ResourceCard` consumes the shared presentation type, not the static collection. Navigation/footer/internal links remain unchanged.
- The optional legacy citation renderer/type inconsistency has no actual source data. It was retained without adding citations or fixing its three existing TypeScript diagnostics.

## Migration and Field Mapping

Utility: `scripts/migrate-resources-static.ts`; command: `npm run resources:migrate`.

- `--dry-run` validated the 10 records, dates, slugs and complete planned values without writing data, uploading media or sending mail.
- Normal execution inserted all 10 rows in one database transaction and then verified every applicable field.
- `--verify` is read-only and compares all 10 rows against the source.
- A second normal migration verified the existing 10 rows and returned an explicit no-op. No IDs, timestamps or content were updated and no duplicates were created.
- An existing partial, extra, missing or mismatched dataset is rejected, with no overwriting, deletion, slug renaming or silent merging. A competing insert causes the atomic insert/unique constraint to fail safely.
- The existing backend validator is reused. Exact comparison with its parsed result ensures validation does not alter source content.
- Unrelated-table counts and complete row snapshots were checked before and after insertion.

| CMS Field                            | Mapping                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| id                                   | New UUID; static `r1` through `r10` are not reused as CMS IDs                           |
| slug, title, excerpt, category, type | Exact corresponding source strings                                                      |
| content                              | Exact `body.join("\n\n")`; splitting it back must equal every original paragraph        |
| reading_time                         | Exact numeric `readingTime`; NULL if absent                                             |
| sort_order                           | Source array position multiplied by 10; values 10 through 100                           |
| published_at                         | Exact source date string                                                                |
| reviewed_at                          | Exact source date string, otherwise SQL NULL                                            |
| published                            | True: all 10 source records were publicly visible; uses the existing default convention |
| created_at, updated_at               | Existing database timestamp defaults                                                    |

### Fidelity Results

**10/10 exact matches** for slug, title, excerpt, complete content string, category, type, reading time, order, publication/review dates and publication state. Dates remain date-only strings. Punctuation, apostrophes, Unicode and all paragraph boundaries were preserved; no trim/rewrite/translation/HTML conversion occurred.

The actual source is English text with Unicode punctuation, without Nepali or emoji content. A reversible real admin edit containing Nepali, emoji and an additional paragraph verified those capabilities through database persistence and public rendering, then restored the exact source values.

## Public Cutover

Existing `getPublishedResources` and `getPublishedResourceBySlug` are reused through the Phase 14C bridges; no second repository or CRUD layer was introduced.

- `/resources`: CMS list, same search/category behavior, source ordering, cards, layout and empty state.
- `/resources/$slug`: CMS published slug lookup, same URL, SEO, article rendering, support section and related-card algorithm. Missing or unpublished records use the existing 404 behavior.
- `/`: existing parallel loader also loads CMS Resources; first-six selection and presentation unchanged.
- `src/lib/resource-view.ts` adapts CMS content to the existing paragraph/card presentation type. It creates no citation or media data.
- Public bridges strip creation timestamps and sort-order internals; publication filtering is authoritative in the existing server database queries. Database access remains server-only through dynamic imports.
- Resource loaders use the established zero-stale/refresh behavior to avoid retaining obsolete publication or editorial state.
- Repository search found **no active public runtime import of `src/data/resources.ts`**. Only the manual migration and verification tooling reference it. The file remains unchanged for rollback/reference.

## Browser and Publication Verification

Harness: `scripts/verify-phase-14e.ts`.

- All 10 database slugs were requested directly: HTTP 200, exact title and paragraph strings, correct related ordering and links, and no duplicate cards.
- Listing order equals the source; search for anxiety selects the expected article. Homepage links equal the first six source slugs.
- Invalid slug returned HTTP 404. Direct navigation/hard refresh uses SSR and CMS data.
- The first Resource was temporarily unpublished through the real authenticated admin UI. Public backend list dropped to nine, public lookup returned NULL, its detail returned 404 without title/body exposure, and listing/homepage/related cards excluded it.
- Publication was restored, then title/content were changed through the real admin UI with a Nepali/emoji paragraph. Detail, listing, homepage and related cards reflected that database value.
- Exact original title, content, publication state and timestamp were restored. Final complete Resource rows equal the captured post-migration snapshot and pass the 10/10 source comparison again.
- Listing/detail/homepage were tested at 390px and 1440px; no horizontal overflow or captured hydration/runtime errors occurred. Screenshots were visually inspected. Additional read-only reduced-motion screenshots reveal every existing animated card for layout inspection; no application styling was changed.
- The initial harness required selector/readiness corrections; it now waits for admin hydration before clicking Edit. This required no admin implementation change.
- The hosting account's concurrent local pools temporarily hit `ER_TOO_MANY_USER_CONNECTIONS`. Only the phase verification server was restarted. `scripts/serve-phase14e.ts` uses a one-connection pool in that local test process; the verification harness also shares one connection. Application DB configuration and other servers were not changed. The complete workflow passed using this constrained verification setup.
- Local verification URL: `http://127.0.0.1:5177/resources`.

## Security and Regression

- Anonymous Resource create/update/delete/admin-list calls were rejected by the existing authentication boundary; no mutations occurred.
- Admin edits used the existing protected route and server-function bridge. Authentication architecture was unchanged.
- Public responses and production browser assets were scanned against configured secrets and the internal mailbox string: no matches.
- Public Resource payloads contain editorial data and IDs needed for rendering, without credentials, DB configuration, creation/update timestamps, storage keys or mail configuration.
- Complete News, Event, Gallery, album, Our Work, Story, Inbox and original session snapshots remained identical during migration/browser testing.
- Gallery remote inventory exactly equals the 26 legitimate storage keys. Every existing URL returned HTTP 200 and every SHA-256 remained identical before/after browser verification.
- Every verification-created admin session was deleted. No temporary Resource record, media upload, orphan file or email was created. The original legitimate session was preserved.
- No unrelated concurrent Footer/About/Partner/Contact work or prior staged index entry was altered.

## Quality Checks

- `npm run build`: passed.
- Focused TypeScript with `scripts/tsconfig.phase14e.json`: passed, covering migration, verification, optional local test server, Resource backend, bridge and view helper.
- Full TypeScript: **12 existing diagnostics**, unchanged. No new diagnostics; existing About/Partner and legacy Resource reference diagnostics were not fixed.
- Focused ESLint on Resource routes, bridge/helper and migration/verification files: passed with zero errors/warnings. Homepage semantic lint also passed with its pre-existing formatter rule excluded.
- Focused Prettier on Resource-specific changed files and package command: passed. The homepage's existing formatting violations were left untouched to avoid unrelated reformatting; its resource loader changes are narrowly scoped.
- Repository-wide `npm run lint` **fails**: final result **7,280 existing errors / seven warnings**, compared with the prior **7,535 / seven**. The 255-error reduction is confined to the changed Resource code and normal formatting of its two routes, including their old line-ending violations. No unrelated backlog fixes were attempted and no new lint issues remain.
- Verification screenshots are local artifacts under `%TEMP%/umanga-phase14e-verification`; they are not uploaded media or public application data.

## Phase-Owned Files

- `package.json`: one migration command; pre-existing dependency edits preserved.
- `scripts/migrate-resources-static.ts`
- `scripts/verify-phase-14e.ts`
- `scripts/serve-phase14e.ts` (optional local verification server only)
- `scripts/tsconfig.phase14e.json`
- `src/lib/resource-view.ts`
- `src/lib/resources-server-functions.ts`
- `src/routes/resources/index.tsx`
- `src/routes/resources/$slug.tsx`
- `src/routes/index.tsx` (Resource loader/import only)
- This report.

No remaining Phase 14E implementation blocker. The project-level lint/format backlog and account connection limit remain documented environmental conditions; no unrelated remediation was undertaken.

## Final Verified Baseline

```text
News: 3
Events: 4
Gallery: 26
Our Work: 8
Stories: 5
Resources: 10
Inbox: 3 threads / 4 messages
```

Gallery: **26 legitimate remote files**, unchanged keys/URLs/hashes; zero temporary or known orphan files. Resources: 10 unique migrated slugs, all published; zero temporary records. No temporary admin sessions remain. No email was sent.
