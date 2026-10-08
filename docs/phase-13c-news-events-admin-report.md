# Phase 13C - News & Events admin CMS

## Preflight and scope

- Branch: `main`.
- Starting commit: `cdcedca Add News and Events CMS schema`.
- Phase 13B was **not committed** at preflight. Its verified backend, bridges, storage allowlist and report were present as working-tree changes; all were preserved. No commit was made to change this state.
- MariaDB tunnel was listening on `127.0.0.1:3307`; live connection succeeded.
- Phase 13C files: `src/routes/admin/_protected/news-events.tsx`; new `src/components/admin/news-events/AdminNewsEventsManager.tsx`, `AdminNewsManager.tsx`, `AdminEventsManager.tsx`, `news-events-ui.ts`; this report.
- Narrow bridge privacy change: `src/lib/admin-news-server-functions.ts` now omits the unused `imageStorageKey` from list/lookup/create/update/replacement responses. Backend records, CRUD semantics, media lifecycle and request contracts are unchanged.
- Temporary browser/type/security harnesses removed after verification.
- No schema, migration, public consumer, static source, event-bar, Inbox/mail, Gallery/Our Work/Stories or Resources changes. No commit/push.

## Page and component architecture

The existing protected `/admin/news-events` route remains inside the current authenticated admin shell. A thin loader obtains News and Events through the Phase 13B admin server-function bridges in parallel, and supplies a Kathmandu calendar date for chronology display. No DB or storage imports in React components.

The page uses the established admin header, buttons, Radix dialogs/alert dialogs, cards, upload controls, inline alerts and Sonner feedback. Separate News and Event managers/forms sit inside keyboard-accessible Radix tabs. News is the default. `?tab=events` persists the selected tab on refresh and through normal router navigation.

Header: **News & Events**. Subtitle: **Manage public news articles and event information.**

News toolbar shows count and Create News. Empty state: **No news articles yet.** Event toolbar shows count and Create Event. Empty state: **No events yet.** Static content is never automatically listed in admin.

News cards show image/fallback, category, title, historical slug path, optional location, Published/Unpublished, conditional Demo Content, clamped excerpt, publication date, optional sort order, and Edit/Replace Image/Delete.

Event cards show category, title, slug, summary, exact date, location, sort order where present, independent registration/publication badges, conditional demo badge, derived chronology and Edit/Delete. No image control or invented CTA/featured/highlight fields.

Chronology is display-only: compare eventStart with Kathmandu calendar date to show Past/Today/Upcoming. No chronology field is submitted or stored. Registration Open/Closed is a separate persisted boolean. The optional nearest-event candidate hint was not added; the public event bar remains untouched.

## Forms and mutation UX

| News field       | Behavior                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title            | Required, Unicode/Nepali/emoji accepted, max 255.                                                                                                                                 |
| Slug             | Required, max 191, lowercase ASCII/numbers/single hyphens. Create-only title suggestion stops permanently after manual slug editing; Nepali-only title yields no fabricated slug. |
| Excerpt          | Required textarea; 5,000-character count/limit.                                                                                                                                   |
| News Content     | Required large plain-text textarea; 200,000-character count/limit; blank-line paragraph guidance.                                                                                 |
| Category         | Required free-form text, max 100.                                                                                                                                                 |
| Location         | Optional text, max 255; blank submitted as NULL on edit and normalized by server on create.                                                                                       |
| Publication Date | Required date input; exact calendar date string; no today/createdAt substitution.                                                                                                 |
| Sort Order       | Optional integer; blank becomes NULL.                                                                                                                                             |
| Demo Content     | Checkbox, default false.                                                                                                                                                          |
| Published        | Checkbox, default true.                                                                                                                                                           |
| Image            | Required on create only; JPEG/PNG/WebP, <=8 MB; filename and local object-URL preview.                                                                                            |

News metadata edit restores all current values and excludes image fields. Changing title cannot change stored slug. Replace Image is a separate dialog with current image and selected preview. Object URLs are revoked on file changes/unmount; no upload until submit.

News Delete uses an alert-dialog confirmation including the title and explaining article/image removal. Backend cleanupWarning produces non-fatal safe success/warning feedback, without treating a committed DB operation as failure.

| Event field       | Behavior                                                                      |
| ----------------- | ----------------------------------------------------------------------------- |
| Title / Slug      | Same bounded human-title/stable-slug behavior; creation-only suggestion.      |
| Summary           | Required textarea, max 5,000, character count.                                |
| Category          | Required free-form text, max 100.                                             |
| Event Date        | Required date input, exact YYYY-MM-DD; no time-of-day or datetime conversion. |
| Location          | Required text, max 255, Unicode accepted.                                     |
| Sort Order        | Optional integer; blank becomes NULL.                                         |
| Registration Open | Explicit checkbox, default false; unchecked means Closed.                     |
| Published         | Checkbox, default true.                                                       |
| Demo Content      | Checkbox, default false.                                                      |

Event edit preserves ID and createdAt through the existing backend. Delete requires a title-specific alert-dialog confirmation. No Event media flow.

Client validation provides field errors; server validation remains authoritative. Safe backend failures retain entered values and the dialog. Duplicate slug messages identify the collision without SQL. A synchronous submission ref plus disabled/loading buttons prevents duplicate actions. Success closes/reset dialogs, releases preview URLs and invalidates loaders to refresh lists. Loading states cover create/save/replace/delete. Focus restoration targets the action opener or create button after deletion.

## Real UI verification

Testing used headless Edge/Playwright against the actual dev route `http://127.0.0.1:5177/admin/news-events`, at 390x844 and 1440x1000. A temporary authenticated session was created for an existing admin and removed afterward; legitimate session IDs were preserved. No auth code changed.

Starting News/Event counts: 0/0. Actual legitimate baseline: Gallery 2, Our Work 8, Stories 5, Inbox **3 threads / 4 messages**. The additional Inbox submission already existed before this test; all legitimate rows were compared exactly and preserved.

| Check                                  | Result                                                                                                                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default News and separate empty states | Passed.                                                                                                                                                                                             |
| Keyboard ArrowRight tab switch         | Passed; Events selected and URL updated.                                                                                                                                                            |
| Events hard refresh                    | `tab=events` and selected tab persisted.                                                                                                                                                            |
| News creation slug suggestion          | Mental Health Awareness -> mental-health-awareness.                                                                                                                                                 |
| Manual slug override                   | Retained after further title edits.                                                                                                                                                                 |
| Nepali-only create title               | Suggestion blank; admin supplies slug.                                                                                                                                                              |
| Dialog Escape/focus return             | Passed after waiting for Radix's asynchronous focus restoration.                                                                                                                                    |
| News actual create                     | Temporary `phase-13c-news-verification` created through UI; UUID row, exact date/category/location/demo/publication/order persisted.                                                                |
| News Unicode                           | `Phase 13C समाचार 🌿` displayed and persisted.                                                                                                                                                      |
| News thumbnail                         | Healthy remote image loaded with nonzero natural width.                                                                                                                                             |
| News hard refresh                      | Record, image, booleans and publication date persisted.                                                                                                                                             |
| News paragraph restore                 | Two exact Nepali paragraphs and blank line restored in edit. Browser multipart CRLF and textarea LF were compared by equivalent paragraph boundaries; no application normalization change was made. |
| News metadata edit                     | Title/excerpt/two-paragraph body updated; same ID, image references and stable slug.                                                                                                                |
| News explicit slug edit                | `phase-13c-news-verification-updated` persisted after refresh; same ID.                                                                                                                             |
| Duplicate News create                  | Safe duplicate error; one row; precheck prevents additional upload.                                                                                                                                 |
| Invalid News image                     | Harmless text renamed PNG rejected by server; previous record/image intact.                                                                                                                         |
| News replacement                       | Valid second image preview and upload; same row, new thumbnail/URL/key; old media absent; new media exists and HTTPS returns valid image.                                                           |
| Replacement refresh                    | New image URL persisted on card after hard refresh.                                                                                                                                                 |
| News publication toggle                | Published -> Unpublished -> Published persisted and badges updated.                                                                                                                                 |
| Event actual create                    | Temporary `phase-13c-event-verification` created through UI.                                                                                                                                        |
| Event Unicode/location                 | `Phase 13C कार्यक्रम 🌿`, `काठमाडौं` displayed/persisted.                                                                                                                                           |
| Event date/flags                       | 2027-01-15, registration Open and Published persisted; Upcoming badge displayed.                                                                                                                    |
| Event hard refresh/edit prefill        | Exact date restored; selected Events tab persisted.                                                                                                                                                 |
| Event title-only edit                  | Slug unchanged.                                                                                                                                                                                     |
| Event explicit slug/date edit          | `phase-13c-event-verification-updated`, 2027-02-01, same ID; persisted after refresh.                                                                                                               |
| Past-date test                         | 2020-01-01 displayed Past while registration remained Open. No status field stored.                                                                                                                 |
| Registration toggle                    | Open -> Closed -> Open persisted independently; Past remained date-derived.                                                                                                                         |
| Event publication toggle               | Published -> Unpublished -> Published persisted; future test date restored.                                                                                                                         |
| Duplicate Event create                 | Safe duplicate error; one row.                                                                                                                                                                      |
| Mobile News/Event lists and dialogs    | 390px: no horizontal overflow; create/edit/replace previews, textareas, dates, labels, toggles and actions fit scrollable viewport-bounded dialogs.                                                 |
| Desktop                                | 1440px: compact cards and usable metadata dialogs; no horizontal overflow.                                                                                                                          |
| Accessibility                          | Labeled inputs/upload; dialog titles/descriptions; explicit badge text; keyboard tabs, Escape, delayed focus restoration and keyboard delete confirmation verified.                                 |
| Auth route                             | Guest request redirects to `/admin`; no admin data displayed.                                                                                                                                       |
| Unauthenticated bridges                | All 11 list/lookup/create/update/replace/delete calls rejected as UNAUTHORIZED; no changes.                                                                                                         |
| Public freeze while fixtures existed   | `/`, `/news`, `/events` showed static content; temporary CMS items absent; `/news` retained three static article links.                                                                             |
| Top-bar freeze                         | Existing static event bar remained linked to `/events` and displayed static event data; Header import unchanged.                                                                                    |
| Browser errors                         | No page/hydration errors in completed run.                                                                                                                                                          |
| News UI delete                         | Confirmation contained edited title; row/current remote image removed; News empty state returned.                                                                                                   |
| Event UI delete                        | Title-specific confirmation activated by keyboard; row removed; Events empty state returned.                                                                                                        |
| Payload privacy                        | Captured server-function responses excluded imageStorageKey and internal admin mailbox.                                                                                                             |

Screenshots retained outside the repository under the OS temporary `umanga-phase13c` directory: mobile News create/replace/list/delete, mobile Event create/list, and desktop Events. Screenshots were visually inspected. Temporary harness timing and normal multipart line-ending handling were corrected in the harness; neither required backend behavior changes.

Final News rows: **0**. Final Event rows: **0**. Leftover controlled News media: **0**. Temporary session removed. Cleanup targeted only recorded controlled IDs and their media; legitimate data was untouched.

## Regression and checks

- Gallery: 2, full ordered rows unchanged.
- Our Work: 8, full ordered rows unchanged.
- Stories: 5, full ordered rows unchanged.
- Inbox: 3 legitimate threads / 4 messages, full ordered rows unchanged. No SMTP or form pipeline changes/actions.
- Static News/Event source and assets unchanged. Public list/detail/homepage, SEO, navigation and top bar unchanged.
- `npm run build`: passed; existing tooling warnings only.
- Focused TypeScript on route, managers, UI helper and narrow bridge projection: passed.
- Full TypeScript: same ten existing unrelated errors in Reveal/testimonials/homepage/Resource detail; count unchanged.
- Focused ESLint and Prettier: passed. `git diff --check`: passed.
- Built public JS contains no DB/FTP/SMTP credential values, server mail/storage environment configuration, storage-key property, Nodemailer/mysql2 or passwordHash matches. Changed source scanned against configured secrets; no credentials/session literals introduced.
- UI consumes public image URLs only. News storage keys remain server-side after the narrow bridge projection fix.
- Overall dirty tree still includes the pre-existing uncommitted Phase 13B implementation. Phase 13C added only the route, four UI files, the report and the narrow News bridge payload projection; no backend CRUD semantics were changed.

## Phase 13D readiness

Phase 13C functional verification is complete. No application blocker before static News/Event migration. Phase 13B/13C changes remain uncommitted as instructed; preflight did not establish a committed Phase 13B. No static content migration, public cutover, event-bar cutover or Resources work began.
