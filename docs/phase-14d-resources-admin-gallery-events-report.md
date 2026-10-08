# Phase 14D: Resources Admin, Gallery Expansion and Events CTA

## Status

**Phase 14D is COMPLETE.** Resource Admin, Gallery expansion, Event registration CTA and focused functional verification passed. The interrupted-transfer orphan defect was resolved with the authorized allocation hook, without changing the underlying FTPS core. The verified authoritative Gallery baseline is **26 records / 26 legitimate remote files**. The repository-wide lint backlog is a pre-existing project-level issue, not a Phase 14D regression.

No commits, pushes, staging, resets, restores or repository cleaning were performed.

## 1. Baseline and Git Safety

- Branch: `main`.
- Starting commit: `c222baa` (`Add CMS gap audit`).
- Database tunnel: listening on `127.0.0.1:3307`; DATABASE_URL unchanged.
- Historical assumed Gallery baseline: **2**. Later verification discovered 24 additional legitimate photos in the existing `Umanga Collections` album; all were preserved.
- Verified authoritative baseline: News 3, **Events 4**, **Gallery 26**, Our Work 8, Stories 5, Resources 0, Inbox 3 threads / 4 messages. Remote Gallery inventory: **26 legitimate files**.
- Exact complete row snapshots were captured before migration. All original column values, including timestamps and media references, were compared after testing.
- The existing legitimate admin session was preserved. Only newly created verification sessions were deleted.
- Pre-existing staged files were left staged: Phase 14B report, migration 0009, snapshot 0009, journal, schema, About, Partner and Contact.
- Pre-existing unstaged/untracked Phase 14C work was preserved: Resource backend, bridges, verification harness and report.
- A concurrent Footer edit appeared during this phase; it was not modified or formatted.
- Gallery changes to already-staged schema/journal exist only in the working tree; the index was not updated.

## 2. Resource Admin

`src/routes/admin/_protected/resources.tsx` now loads the existing authenticated Resource bridge and renders `src/components/admin/resources/AdminResourcesManager.tsx`.

- Existing protected admin layout/authentication and Phase 14C CRUD functions are reused.
- Empty state: “No resources yet.”
- List shows title, slug, category, article/guide type, publication state, dates, reading time, order and updated date where applicable.
- Create/edit support title, explicit slug, excerpt, plain-text content, category, type, reading time, nullable sort order, nullable publication/review dates and published checkbox.
- Slug suggestions apply only during creation until manually edited. Title edits preserve the existing slug.
- Server-generated ID/created timestamp remain authoritative; no new backend or table was added.
- Publication remains a boolean, with no automatic date scheduling.
- Safe duplicate/error feedback, pending lock, confirmation deletion and list invalidation are implemented.
- Radix dialog title, input labels, initial focus, Escape and Resource focus return were checked. Select/textarea accessible names were corrected during browser testing.
- Real admin UI create, hard refresh, edit, publish/unpublish, duplicate slug and delete passed.
- Nepali, emoji and exact internal blank-line paragraph boundaries passed.
- Anonymous mutation calls were rejected and logged-out route access redirected to the existing sign-in route.
- Final Resource count: **0**.
- Public `/resources`, Resource details and homepage still import `src/data/resources.ts`. No real Resource content or media was migrated.

## 3. Gallery Schema

Applied migration: `drizzle/0010_premium_tomorrow_man.sql`.

New `gallery_albums` table:

| Column       | SQL Type                                         | Nullability |
| ------------ | ------------------------------------------------ | ----------- |
| id           | VARCHAR(36), primary key                         | Required    |
| name         | VARCHAR(255)                                     | Required    |
| title        | VARCHAR(255)                                     | Required    |
| caption      | TEXT                                             | Nullable    |
| category     | VARCHAR(100)                                     | Required    |
| context_name | VARCHAR(255)                                     | Nullable    |
| created_at   | TIMESTAMP, current timestamp default             | Required    |
| updated_at   | TIMESTAMP, current timestamp default / on update | Required    |

Nullable additions to `gallery_items`: category VARCHAR(100), context_name VARCHAR(255), album_id VARCHAR(36), image_width INT, image_height INT.

- Nullable album membership preserves standalone legacy photos.
- Album FK uses RESTRICT: deletion explicitly removes associated photo records before the album, then cleans media.
- Category indexes on albums/photos, photo album index and `(published, created_at, id)` public ordering index were added.
- Album and Gallery tables use `utf8mb4_unicode_ci`. Only Gallery's previous latin1 table was converted; unrelated tables were not converted.
- MariaDB promotes Gallery caption/image_url from TEXT to MEDIUMTEXT during charset conversion to preserve text capacity. Drizzle schema and generated snapshot were aligned with the verified live types.
- `SHOW CREATE TABLE` confirmed columns, indexes, UTF8MB4 and FK. A subsequent `db:generate` found no schema differences.
- Both original Gallery records retained every existing value. All five new nullable fields remain NULL on those records; neither was placed in an album.

## 4. Gallery Admin and Backend

The existing Gallery manager and server-function bridge were extended; album UI is in `GalleryAlbumsPanel.tsx`. The same transport, UUID keys, MIME/signature checks, 8 MB limit, path safety and TLS validation are reused. `image-size` extracts intrinsic dimensions without modifying bytes.

- Single upload/edit includes category, context name and optional album. Labels adapt to Event/Activity/Session.
- Event, Activity, Session and Other are available; existing category values are retained. Legacy NULL categories remain uncategorized.
- Album upload collects name, shared title/caption/category/context and 1–25 files, plus publication control.
- All files are validated before any album upload starts. Remote existence, HTTP 200, image Content-Type and exact byte equality are checked after each upload.
- Album and photo records are inserted in one database transaction after uploads succeed. Each photo has its own UUID, URL, storage key, dimensions and timestamps.
- Joining an existing album inherits server-owned album metadata. Capacity is checked under an album row lock, including single-photo additions and membership edits.
- Admin list shows album/standalone identification, category, context, upload date and existing actions.
- Album names, counts, viewing/filtering, individual deletion and confirmed whole-album deletion are available.
- Storage keys are stripped from Gallery bridge responses; UI does not need them.
- Media deletion checks remaining references in Gallery, News, Our Work and Stories before deleting a shared object.
- Bulk cleanup runs sequentially. Testing exposed hosting FTPS connection limits with parallel deletion; the sequential implementation passed cleanup tests.
- Real UI single upload, metadata/category/context edit and deletion passed.
- Real UI 25-photo album upload passed; 26 selected files were rejected by UI and backend. Adding a 26th photo to a full existing album was also rejected.
- All 25 photos shared the correct metadata and album identity, with valid individual media.
- Shared-object deletion protection passed: deleting an album retained an object referenced by another controlled photo; deleting the last reference then removed it.
- Database failure after upload passed compensation: media removed, no partial album/photo rows.
- A failure before the second transfer passed compensation of the first successful upload.
- **Resolved historical defect:** a post-write transfer failure previously left one unreturned media object, which the diagnostic test removed by its exact key. The authorized allocation hook now provides that key before transfer; the repeated post-write and partial-album failure tests confirm application cleanup leaves zero unclaimed objects. FTPS core remains unchanged.
- No automatic retries or weakening of storage validation were introduced.

## 5. Public Gallery

- Existing hero/section design retained.
- Server-side published-only list uses `created_at DESC, id DESC`; old sort_order values remain stored but do not override the required latest-first order. The obsolete manual-order UI control was removed.
- Fixed 25 photos/page; count, total pages, current page and bounded SQL offset/limit are returned.
- Previous/Next/page-number controls include disabled boundaries and current-page indication. Pagination is hidden for one page.
- Search covers effective title, caption, album name and context. Parameterized LIKE queries escape wildcard input and use UTF8MB4 case-insensitive collation.
- Category/album filters run on the server and combine with search/page. Album choices contain only albums with published photos.
- URL-backed `page`, `q`, `category`, `album` survive refresh. Filters reset to page 1; clearing restores all photos. Functional search updates preserve concurrent filter changes.
- 28-photo fixture verified logical positions 1/25/26, a 25-item first page and 3-item second page.
- Search-only, category-only, album-only, all pair combinations, all three together and filtered page 2 passed. Nepali context search passed.
- Masonry uses supported CSS columns with break-inside avoidance: one/two/three responsive columns, stable DOM order, natural image ratios and captions below photos.
- Public photos use width 100% / height auto, with no cropping or hover scaling. Intrinsic dimensions are stored for new uploads; legacy dimensions are read and cached without changing their rows or files.
- Rendered/natural aspect ratios were checked at 390, 768 and 1440px; screenshots were visually inspected. No horizontal overflow was detected.
- Lightbox open, close button, Escape, backdrop close, image click staying open, body scroll lock, captions and focus return passed.
- Public Gallery supports the verified 25-photo pagination behavior; the authoritative closeout inventory is 26 legitimate photos. The earlier two-photo/no-pagination observation applied only to the historical assumed baseline.

## 6. Event Registration CTA

Only the shared public Event card rendering changed. Registration-open cards show “Contact for Registration” linked to `/contact`, with hover/focus styling and an accessible link. Closed cards omit it.

| Existing Event                            | Date       | Location                     | Registration / CTA |
| ----------------------------------------- | ---------- | ---------------------------- | ------------------ |
| Community mental health awareness session | 2026-09-18 | To be announced              | Closed / omitted   |
| World Mental Health Day 2026              | 2026-10-10 | Basantapur, Kathmandu, Nepal | Open / shown       |
| Umanga Chess Championship 2026            | 2026-10-23 | Jawalakhel, Lalitpur, Nepal  | Open / shown       |
| Stress management workshop                | 2026-10-02 | To be announced              | Closed / omitted   |

All four titles and registration states were checked through actual cards; date/location rendering remains the existing implementation. CTA navigation reached `/contact`; no Contact form was submitted. All four complete Event rows are identical to baseline.

## 7. Security and Regression

- Anonymous Gallery single/album upload, metadata update, photo/album deletion and Resource create/update/delete were rejected.
- Authenticated UI operations passed; protected Gallery/Resource routes redirect anonymous users through the existing guard.
- Public Gallery is read-only and publication-filtered, with no storage keys in its projection.
- Public built assets were scanned against configured password/secret/token/database values and the internal mailbox string: no matches.
- No DB, FTP or SMTP credentials or configuration were added to public UI modules.
- Existing `/`, `/news`, `/events`, `/our-work`, `/stories`, `/resources`, `/gallery` returned HTTP 200 with no captured page/runtime errors.
- Public Resources, details and homepage remain static; no Resource cutover or content migration occurred.
- Exact original News, Event, Gallery, Our Work, Story, Inbox and legitimate session snapshots passed comparison.
- No email was sent; no public lead submission or Inbox reply was performed. Mail/authentication implementations were not modified.
- Logos, favicon and unrelated media were not changed.

## 8. Checks and Verification Artifacts

- `npm run build`: passed.
- Full TypeScript: starting 12, ending 12; 10 historical plus concurrent About/Partner diagnostics. No new Resource/Gallery/Event diagnostics.
- Focused backend/bridge/harness TypeScript using `scripts/tsconfig.phase14d.json`: passed.
- Focused ESLint: no errors; the existing `Cards.tsx` non-component-export fast-refresh warning remains.
- Focused Prettier: passed.
- Verification harness: `scripts/verify-phase-14d.ts`; normal lifecycle, `--readonly`, `--scan`, and diagnostic `--transfer-failure` modes.
- Browser screenshots/results are local temporary artifacts under `%TEMP%/umanga-phase14d-verification`; no credentials or session tokens are included in result output.
- Playwright is a verification dev dependency; image-size is the server-side dimension parser.

## 9. Final Database and Media

| Domain         | Final Count |
| -------------- | ----------: |
| News           |           3 |
| Events         |       **4** |
| Gallery        |      **26** |
| Gallery albums |           1 |
| Our Work       |           8 |
| Stories        |           5 |
| Resources      |           0 |
| Inbox threads  |           3 |
| Inbox messages |           4 |

- Existing Gallery URL/storage-key values and SHA-256 image hashes are unchanged; all 26 URLs return HTTP 200.
- Gallery remote inventory contains exactly 26 legitimate objects: the original two standalone photos and 24 photos in `Umanga Collections`.
- All controlled Resources, photos, albums, failed-operation objects and newly created sessions were removed. No other records/media were deleted.
- No test emails were sent.

## 10. Phase-Owned Git Scope and Acceptance

Phase-owned changes: Gallery schema/migration/snapshot/journal extension; dimension/test dependencies; Gallery backend and bridges; Gallery admin and album component; public Gallery/filter helper/lightbox; Resource admin component/route; public Event card CTA; verification harness/config; this report.

The original staged index and pre-existing Phase 14C/concurrent work were preserved. About, Partner, Contact and Footer were not edited, reformatted, staged or committed by this phase.

**Acceptance:** the allocation hook was authorized and verified, resolving the FTPS orphan blocker. Functional Phase 14D acceptance criteria passed. The corrected Gallery baseline is 26; no legitimate photos were removed to satisfy the obsolete assumption of two. No Phase 14D implementation blocker remains.

## 11. Interrupted-Transfer Finalization

The allocation hook was authorized, implemented and verified. The FTPS orphan defect is fixed. The user confirmed that the actual 26-photo Gallery inventory is legitimate and authoritative. The unchanged repository-wide lint backlog is documented as a pre-existing project-level issue and does not block Phase 14D acceptance.

### Actual Finalization Baseline

- Branch: `main`; starting commit: `c222baa` (`Add CMS gap audit`). The tunnel on `127.0.0.1:3307` was available.
- Read-only preflight found the original two standalone Gallery photos plus 24 photos in the existing `Umanga Collections` album (`965780a6-4a1f-4304-8a50-ac6c3db3694b`, created at `2026-10-08T15:38:55.000Z`). None was treated as disposable test data.
- Before and after counts: News 3; Events 4; Gallery **26**; Gallery albums **1**; Our Work 8; Stories 5; Resources 0; Inbox 3 threads / 4 messages. The existing admin session count remained one.
- Every value in all those tables and the existing session table was compared against the finalization starting snapshot. Exact equality passed. The Gallery count discrepancy was reported to the user; no attempt was made to restore it to two.

### Narrow Allocation Hook

- `uploadImage` accepts an optional synchronous `onAllocated` callback. It supplies the final server-generated UUID key and public URL after validation/key generation and before entering `withFtp`.
- Gallery records that key before awaiting the transfer. Its single error handler attempts deletion of the exact allocated key even if the upload never returns. Existing shared-object reference checks remain authoritative before deletion.
- The original upload error remains the server-side error cause. Cleanup failures produce a safe warning and an explicit `cleanupWarning` flag. Album rollback carries that warning and the cause forward, and cleans previous successful uploads sequentially.
- Successful upload output and URLs are unchanged. No underlying FTPS client, access options, connection behavior, TLS validation, protocol handling, directory creation, authentication, retry logic or file validation was changed. Storage-layer changes are the optional hook declaration, argument and invocation only.

### Controlled Failure Tests

The focused harness is `scripts/verify-gallery-finalization.ts`. Injection modifies `Client.prototype.uploadFrom` only inside the verification process and restores it in `finally`; production credentials and client implementation are unchanged.

1. Before-write failure: the test throws before calling the real transfer. Upload fails, the original injected error is preserved, no Gallery/album row is added, and the allocated object is absent.
2. After-write failure: the real transfer completes, then the test throws the same injected error before returning to the uploader's caller. Application compensation deletes the exact written object. Its absence is asserted **before harness cleanup**, proving cleanup does not depend on a returned key.
3. Partial album failure: the first image uploads successfully; the second completes its transfer then throws. Application rollback removes both objects. No photo or album row remains. Both absences are asserted before harness cleanup.
4. Cleanup failure: deletion is separately injected to fail. The original transfer cause remains primary, the client-safe message reports that cleanup needs attention, and album rollback retains the warning. After restoring deletion, the harness explicitly removes its exact test object.
5. Success: the allocation callback runs before the transfer sees the key; the returned key equals that allocation, and HTTPS-served bytes match the source. Single-photo creation, metadata edit and deletion pass.
6. Post-upload database failure: the transaction is injected to throw after a successful upload. The original database cause is retained, no row remains, and the exact uploaded object is removed.
7. Shared-media protection: two controlled rows reference one newly uploaded test object. Deleting the first preserves the object; deleting the last removes it. No legitimate/shared production object is touched.
8. Album limit/regression: 25 photos are accepted; 26 are rejected before upload. Adding a single photo to the full controlled album is rejected and its uploaded object compensated. The album is deleted afterward. Maximum concurrently active test transfers is one; sequential upload/rollback/deletion loops remain in place, with no connection-limit failure.

### Final Inventory and Security

- Remote Gallery inventory before and after contains exactly the same **26** relative object keys. No additional test or orphan object remains.
- All 26 existing Gallery public URLs return HTTP 200 before and after verification; every SHA-256 is identical. Exact row comparisons also preserve IDs, URLs, storage keys, metadata, album associations and timestamps. This includes both original standalone photos.
- All controlled photos/albums and the one verification-created session were removed. No Resource records, media migration, SMTP test, public form submission or Inbox reply was performed. No email was sent.
- Authentication rejection tests passed for single upload, album upload, metadata update, photo deletion and album deletion. Existing TLS, path validation, UUID naming, signatures and 8 MB limit remain unchanged.
- Client-safe upload failure responses omit injected/raw error details. The production public credential/internal-mailbox scan passed for all 84 built assets; no configured secrets or internal mailbox were found.
- Concurrent Footer/About/Partner/Contact edits and the staged index were not altered. No commit or push was made.

### Final Checks and Status

- `npm run build`: passed.
- Focused TypeScript (`scripts/tsconfig.phase14d.json`): passed, including the new harness and storage dependency.
- Full TypeScript: exactly **12 existing diagnostics**, unchanged; no new diagnostics from this fix.
- Focused ESLint: passed with zero errors/warnings in storage, Gallery backend and the new harness.
- Focused Prettier: passed.
- `npm run lint`: failed before and after with exactly **7,535 errors and seven warnings**, primarily pre-existing CRLF formatting violations across unrelated files. No unrelated formatting fixes were attempted.
- Finalization-owned files: `src/server/storage/index.ts`, `src/server/gallery/index.ts`, `scripts/verify-gallery-finalization.ts`, `scripts/tsconfig.phase14d.json`, and this appended report section.

**Result: Phase 14D COMPLETE.** Interrupted-transfer cleanup and focused Gallery regression passed. All legitimate records and media were preserved against the corrected 26-photo baseline. The repository-wide lint backlog remains unchanged and is not a Phase 14D regression.

## 12. Official Documentation Closeout

**Phase 14D is officially COMPLETE.** The user confirmed that the 24 existing `Umanga Collections` album photos are legitimate. The obsolete assumed Gallery baseline of two is historical only; the authoritative baseline going forward is **26 Gallery records / 26 remote media files**.

This closeout changed only this report. Verification was read-only: no rows, media, application code, sessions or concurrent user work were changed; nothing was staged, committed or pushed. No email was sent.

- A fresh database count confirmed every final count below and one existing Gallery album.
- A fresh recursive FTPS listing exactly matched the 26 database storage keys: no missing objects and no additional/unclaimed files.
- All 26 public URLs returned HTTP 200 with valid image responses and non-zero bytes. Two reads of every object produced identical SHA-256 hashes; complete Gallery rows, including storage keys and public URLs, remained identical across this check. The preceding finalization had also verified all 26 objects against its before/after hashes.
- SHA-256 of the current ordered media manifest (`id`, `key`, `url`, `sha256`): `e6bb17add09e446477978b419d6a54024a5c5c817a8db0537159380ea237ab36`.
- The previously failing interrupted-transfer test passed during finalization: exact keys are allocated and retained before transfer, post-write and partial-album failures clean their exact files before harness cleanup, original transfer errors remain primary, and cleanup failure produces a safe warning. The underlying FTPS core was not changed or reopened during closeout.
- Focused TypeScript was rerun and passed. Full TypeScript was rerun and remains exactly **12 pre-existing diagnostics**; Phase 14D introduced none.
- The finalization's build, focused lint and formatting checks passed. Report formatting also passes. The allocation-fix files have zero lint errors/warnings; the earlier `Cards.tsx` fast-refresh warning remains part of the documented existing warning inventory.
- Repository-wide `npm run lint` **does not pass**: its latest verified result remains **7,535 existing errors and seven existing warnings**, primarily unrelated/pre-existing formatting and line-ending issues. This project-level backlog is outside Phase 14D and is not a functional acceptance blocker. No unrelated lint fixes were attempted.
- No remaining Phase 14D implementation blocker. All temporary test data/media and verification-created sessions were removed during finalization; this closeout created none.

### Verified Current Baseline

```text
News: 3
Events: 4
Gallery: 26
Our Work: 8
Stories: 5
Resources: 0
Inbox: 3 threads / 4 messages
```

Remote Gallery media:

```text
26 legitimate files
0 temporary test files
0 known orphan files
```
