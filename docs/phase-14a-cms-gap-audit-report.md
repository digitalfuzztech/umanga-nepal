# Phase 14A - Remaining CMS Gap Audit

Audit date: 8 October 2026, Asia/Kathmandu.

Branch: `main`. Starting commit: `2b1c8ec` (`Cut over public News and Events to CMS`). The working tree was clean at preflight, confirming Phase 13E was committed. The database tunnel at `127.0.0.1:3307` was reachable. This is a read-only audit; the only repository change is this report.

## Findings

Resources is the only existing admin content module that remains a placeholder. Its ten public text resources still come from `src/data/resources.ts`, with no database table, CRUD service, server-function bridge or upload system. It is the strongest next CMS candidate.

Other active static collections are three testimonials, two partners, six impact overview metrics, and an empty verified support directory. These are conditional future candidates, not an instruction to convert every static page into CMS content. Mission copy, navigation, form definitions, legal text and branding can remain versioned static content.

The completed collection cutovers remain in place. No active public runtime imports of `src/data/news.ts`, `src/data/stories.ts` or `src/data/programs.ts` were found.

## A. Already Complete

| System                  | Actual implementation and consumers                                                                                                  | Audit result                                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin authentication    | `src/server/auth`, auth server-function bridge, protected admin parent route and shared admin layout                                 | Implemented; protected routes require authentication. Client-facing profile masks an internal `admin@` account as `Umanga staff`.                                                                                      |
| Gallery                 | `gallery_items`, `src/server/gallery`, admin/public bridges, `/admin/gallery`, `/gallery`                                            | DB-backed CRUD, publication, ordering, image upload/replacement/deletion and public lightbox are implemented. Two published rows.                                                                                      |
| Our Work                | `our_work_items`, `src/server/our-work`, admin/public bridges, `/admin/our-work`, public list/detail                                 | DB-backed CRUD and media lifecycle implemented. Homepage programs/featured program, related work, per-program impact metrics and Invite program options use published CMS data. Eight published rows.                  |
| Stories                 | `story_items`, `src/server/stories`, admin/public bridges, `/admin/stories`, public list/detail                                      | DB-backed CRUD and media lifecycle implemented. Homepage first three and related first three other published Stories use CMS order. Five published rows; paragraph/date/attribution/demo presentation uses CMS fields. |
| News                    | `news_items`, `src/server/news`, admin/public bridges, News tab of `/admin/news-events`, `/news`, `/news/$slug`                      | DB-backed CRUD and media lifecycle implemented. Homepage News and related News use published CMS queries. Three published rows.                                                                                        |
| Events                  | `event_items`, `src/server/events`, admin/public bridges, Events tab of `/admin/news-events`, `/events`, upcoming section of `/news` | DB-backed CRUD/publication implemented. Events have no image requirement. Chronology derives from date; registration remains independent. Three rows.                                                                  |
| Event bar               | Root loader -> `getNearestEligibleEventServerFn` -> Events backend -> Header                                                         | CMS-backed across the public layout. Kathmandu calendar date, today included, past/unpublished excluded, registration ignored for eligibility. Root loader skips admin paths.                                          |
| Public lead capture     | Shared `InquiryForm`, dedicated `Newsletter`, validated lead server-function bridge and Inbox submission service                     | All seven channels have real persistence and alias notifications. This is operational lead capture, not editorial CMS content.                                                                                         |
| Admin Inbox and replies | `inbox_threads`, `inbox_messages`, Inbox admin/reply services, authenticated bridges, `/admin/inbox`                                 | Filters/search/pagination/read/status/detail/history and forced-channel reply composer implemented. Recipient comes from thread; From/Reply-To resolve server-side. Three legitimate threads/four messages preserved.  |

Completeness above means the functionality is present in the current code and consistent with the committed phases and live baseline. This audit did not rerun destructive CRUD, SMTP or publication tests. Existing character-set limitations are recorded below rather than treated as a new cutover gap.

## Public Route Inventory

There are 23 public route patterns. Directory index definitions use trailing slashes internally; the table uses the user-facing paths. No separate public `/news-events`, Event detail route or standalone Newsletter route exists. Every public route also inherits the CMS Event bar from the root loader.

| Public route        | Primary source and editable content                                                                                                  | Admin counterpart / classification                                                      | Static asset dependency / migration judgment                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | CMS Our Work, Stories, News and Event bar; static Resources, impact overview, partners/testimonials, mission/vision and presentation | Existing collection admins; partially CMS-managed                                       | Hero/partner logos are static. Resources is a definite candidate; other collections are conditional. Full block inventory below. |
| `/about`            | Hard-coded organizational history/mission/approach, `impact.ts` objectives/future direction, `testimonials.ts` partners              | No About editor; intentionally static with a conditional partner collection             | Static hero. Preserve stable organizational copy; consider partners only if staff need maintenance.                              |
| `/impact`           | CMS Our Work metrics plus static six overview metrics, zero `nepalFacts`, testimonials and future direction                          | `/admin/our-work` covers program metrics; partially CMS-managed                         | No editorial image collection. Global metrics are a conditional candidate; do not duplicate program CMS.                         |
| `/our-work`         | Published CMS program list                                                                                                           | `/admin/our-work`; complete                                                             | CMS image URLs. No further migration needed.                                                                                     |
| `/our-work/$slug`   | Published-by-slug CMS lookup, CMS related programs, CMS metadata/metrics                                                             | `/admin/our-work`; complete                                                             | CMS images; unknown/unpublished lookup yields not-found.                                                                         |
| `/stories`          | Published CMS Stories plus static Testimonials component                                                                             | `/admin/stories`; Stories complete                                                      | CMS images. Testimonials are a separate conditional candidate.                                                                   |
| `/stories/$slug`    | Published-by-slug CMS Story, CMS related Stories, static support disclaimer                                                          | `/admin/stories`; complete                                                              | CMS image, safely rendered plain-text paragraphs; disclaimer stays policy copy.                                                  |
| `/news`             | Published CMS News; published CMS Events filtered to today/future, first three; Newsletter form                                      | `/admin/news-events`; complete                                                          | CMS News images; no Event images.                                                                                                |
| `/news/$slug`       | Published-by-slug CMS News; first three other published News; dynamic SEO from CMS                                                   | `/admin/news-events`; complete                                                          | CMS image and paragraph helper. No static lookup/fallback.                                                                       |
| `/events`           | Published CMS Events split by Kathmandu date into upcoming/today and past; Newsletter                                                | `/admin/news-events`; complete                                                          | No images. No stored chronology labels or Event detail links.                                                                    |
| `/gallery`          | Published CMS Gallery query and image-preview component                                                                              | `/admin/gallery`; complete                                                              | CMS images; no static gallery data source.                                                                                       |
| `/resources`        | Static ten-resource array, local title/excerpt/category search and category filtering                                                | `/admin/resources` is a shell; genuine remaining CMS gap                                | No images/files in actual records. Migrate text collection in later authorized phases.                                           |
| `/resources/$slug`  | Static `getResource`, paragraph array, reviewed date, related-resource algorithm and dynamic static-record SEO                       | Placeholder admin; genuine remaining CMS gap                                            | No images/downloads. Preserve slugs, paragraphs, reviewed dates, SEO and relationships in future cutover.                        |
| `/contact`          | Static introduction/disclaimer, `siteConfig` contact details, Contact `InquiryForm`                                                  | `/admin/inbox` receives leads; form backend complete                                    | No resource media. Static copy/config need no automatic CMS conversion.                                                          |
| `/get-involved`     | Five static route/action cards and Newsletter form                                                                                   | Inbox handles Newsletter; no editorial CMS needed                                       | Fixed navigation pathways; intentionally static.                                                                                 |
| `/get-support`      | Static safety/steps/disclaimer; `verifiedSupportContacts` contains zero visible entries                                              | No support-directory admin/table                                                        | Empty curated directory is a conditional future candidate; do not migrate its blank placeholder.                                 |
| `/volunteer`        | Six static role descriptions, static image, Volunteer `InquiryForm`                                                                  | Inbox lead channel complete                                                             | Role options are validated application configuration. Static campaign image/copy can remain.                                     |
| `/partner-with-us`  | Static collaboration descriptions, two static partners, Partner `InquiryForm`                                                        | Inbox lead channel complete; no partner CMS                                             | Partner collection is conditional. Partner list currently uses text logo placeholders, not uploaded media.                       |
| `/invite-umanga`    | Static information/image, CMS published Our Work titles for program options, Invite form                                             | Our Work and Inbox cover dynamic data; partially CMS-managed and operationally complete | Static `program-school.jpg`. No separate Invite content collection required.                                                     |
| `/share-your-story` | Static consent promises/disclaimer and Stories-channel form                                                                          | Inbox receives leads; not automatic Story CMS publication                               | Consent and safety copy are versioned policy. No attachments.                                                                    |
| `/support-us`       | Four static support pathways, financial-support guidance, Support form                                                               | Inbox lead channel complete                                                             | No published donation gateway; no donation CMS implied by static copy.                                                           |
| `/privacy`          | Six static legal/privacy sections                                                                                                    | No admin counterpart; intentionally versioned policy                                    | No media. Policy revisions need review, not an incidental general page editor.                                                   |
| `/terms`            | Six static legal sections and shared support disclaimer                                                                              | No admin counterpart; intentionally versioned policy                                    | No media; preserve safety and demo-content policy statements.                                                                    |

The public lead routes are Contact `/contact`, Volunteer `/volunteer`, Partner `/partner-with-us`, Support `/support-us`, Invite `/invite-umanga`, and Stories `/share-your-story`. Newsletter uses its own embedded component on the homepage, `/get-involved`, `/news` and `/events`. No current form uploads attachments. Static form labels/options should remain coordinated with server validators rather than becoming arbitrary CMS fields.

## Static Data Source Inventory

Nine files exist under `src/data`; no separate `src/content` collection or other public editorial data repository was found.

| Source            | Purpose / count                                                                                                                                    | Active public consumers                                                                                       | DB/admin support                                                             | Classification                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resources.ts`    | Ten records: five articles, five guides; ten category labels; 35 body paragraphs                                                                   | Homepage, Resources list/detail; detail SEO and related lookup                                                | None; `/admin/resources` placeholder                                         | Active editorial collection; should become CMS-managed. Exported category constant is not the list's authority: visible categories derive from records. |
| `impact.ts`       | Six overview metrics; five objective groups; six qualitative Nepal context cards; seven future-direction statements; zero quantitative Nepal facts | Homepage, `/impact`, `/about`                                                                                 | Program-level metrics already exist in Our Work; no global-impact/fact table | Overview metrics/facts are conditional future candidates. Mission/context/objectives can stay static.                                                   |
| `testimonials.ts` | Three anonymous testimonials; two partners and logo references                                                                                     | Testimonials component on homepage, `/impact`, `/stories`; partners on homepage, `/about`, `/partner-with-us` | No tables/admin                                                              | Conditional editorial collections; need consent and partner-name verification before migration.                                                         |
| `support.ts`      | One empty unverified contact placeholder; zero public verified contacts; one shared disclaimer                                                     | `/get-support`; disclaimer on Contact, Resources list/detail, Story detail, Share Your Story and Terms        | No directory table/admin                                                     | Directory is conditional; blank placeholder must not become a real CMS record. Disclaimer is intentional policy content.                                |
| `site-config.ts`  | Organization identity/description, six top-level nav items, nested route links, four footer columns, contact/social config                         | Header, Footer, homepage, Contact                                                                             | No settings table/admin                                                      | Mostly application configuration; not an immediate collection CMS gap. Contact values and four social URLs are currently empty.                         |
| `programs.ts`     | Eight retained static programs                                                                                                                     | No active public consumers                                                                                    | `our_work_items`, `/admin/our-work`                                          | Reference/rollback source; migration utility reads it.                                                                                                  |
| `stories.ts`      | Five retained static Stories                                                                                                                       | No active public consumers                                                                                    | `story_items`, `/admin/stories`                                              | Reference/rollback source; migration utility reads it.                                                                                                  |
| `news.ts`         | Three retained News and three Events                                                                                                               | No active public consumers                                                                                    | `news_items`, `event_items`, `/admin/news-events`                            | Reference/rollback source; migration utility reads it. Stale Event status labels are no longer runtime chronology authority.                            |
| `types.ts`        | Type declarations, including Resource, Reference, Partner, SupportContact and SourcedFact                                                          | Type-only imports in active static collections/cards                                                          | No runtime records                                                           | Shared/reference types; not a migration source.                                                                                                         |

### Resources: exact present scope

| Static ID | Stable public slug                  | Type    | Paragraphs |
| --------- | ----------------------------------- | ------- | ---------- |
| r1        | `what-mental-health-really-means`   | article | 4          |
| r2        | `everyday-ways-to-work-with-stress` | guide   | 4          |
| r3        | `understanding-anxiety`             | article | 4          |
| r4        | `building-self-esteem`              | article | 3          |
| r5        | `social-media-and-your-mind`        | guide   | 3          |
| r6        | `how-to-support-a-friend`           | guide   | 4          |
| r7        | `youth-mental-health-in-nepal`      | article | 3          |
| r8        | `for-families-and-caregivers`       | guide   | 3          |
| r9        | `when-to-seek-professional-help`    | guide   | 4          |
| r10       | `creative-expression-and-wellbeing` | article | 3          |

Actual records use `id`, `slug`, `title`, `excerpt`, `body: string[]`, `category`, `type`, `readingTime`, `publishedAt`, and optionally `reviewedAt`. All ten have publication dates and reading times; only the first two have reviewed dates. None currently has references, an image, download URL, video/audio URL or attached file. The type declaration permits video/audio/download, but those possibilities do not establish a current media requirement.

Source order controls listing and homepage selection (`resources.slice(0, 6)`). List search covers title, excerpt and category. Detail related selection puts same-category alternatives first, then other categories, excludes the current slug and takes three. Reviewed month/year is displayed where present; publication date exists in source but is not currently displayed. Unknown detail slugs use the project's not-found behavior.

## Admin Inventory

The shared protected parent runs `getCurrentAdminServerFn` and redirects guests to `/admin`; backend operations also authenticate independently. Admin bridges dynamically import server-only modules. No temporary authenticated session was needed for this audit.

| Actual admin URL     | State                                  | Database / public integration                                 | Media / publication / unfinished work                                                                                         |
| -------------------- | -------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `/admin`             | Implemented login entry                | Authentication/session backend                                | No editorial CRUD; intentionally public login screen.                                                                         |
| `/admin/dashboard`   | Implemented navigation dashboard       | Six static module cards; not live DB analytics                | No content editor/count dashboard implied. Resources card leads to a placeholder.                                             |
| `/admin/inbox`       | Functional lead management and replies | Threads/messages, authenticated list/detail/mutations/replies | Not an editorial publication system; no attachments.                                                                          |
| `/admin/gallery`     | Functional CRUD                        | Gallery table/public cutover complete                         | Upload, replacement, delete compensation, published and sort controls.                                                        |
| `/admin/our-work`    | Functional CRUD                        | Our Work table/public consumers complete                      | Images, metrics/tags/coverage, featured, published and sort controls.                                                         |
| `/admin/stories`     | Functional CRUD                        | Stories table/public consumers complete                       | Images, text/date/attribution/category/demo, published and sort controls.                                                     |
| `/admin/news-events` | Functional separate News/Events tabs   | Two backend/table systems; public cutovers complete           | News image lifecycle; Events have no image. Published/registration/demo/order controls; date-derived chronology.              |
| `/admin/resources`   | Authenticated UI shell only            | No loader, table, service or bridge                           | Shared header's Add Resource action is disabled. Explicit future-phase placeholder; no CRUD, uploads or publication controls. |

## Database and Migration Inventory

Live `SHOW TABLES` and read-only row queries confirm there are no unused Resource, Partner, Testimonial, global Impact, Support-directory or multimedia tables. Existing content/operational tables are all active.

| Table                  | Rows | Purpose / admin consumer                                                 | Public consumer / static counterpart                                                       |
| ---------------------- | ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `gallery_items`        | 2    | Gallery content and managed images; Gallery manager                      | Published `/gallery`; no active static collection                                          |
| `our_work_items`       | 8    | Programs, metrics, images; Our Work manager                              | List/detail/homepage/Impact/Invite; retained `programs.ts`                                 |
| `story_items`          | 5    | Story text, dates, attribution, images; Stories manager                  | List/detail/homepage/related; retained `stories.ts`                                        |
| `news_items`           | 3    | News text, dates, category/location, images; News manager                | List/detail/homepage/related; retained News part of `news.ts`                              |
| `event_items`          | 3    | Date-only schedules, location, registration; Event manager               | Events, News upcoming block and root Event bar; retained Event part of `news.ts`           |
| `inbox_threads`        | 3    | Lead contacts, structured original metadata, status/read/activity; Inbox | Seven public submission channels write through validated services; no public read endpoint |
| `inbox_messages`       | 4    | Inbound/outbound/system history and delivery state; Inbox                | Lead submission/reply services; never a public content collection                          |
| `admin_users`          | 1    | Authentication infrastructure                                            | No public editorial consumer                                                               |
| `admin_sessions`       | 1    | Existing legitimate authentication session                               | No editorial consumer; left untouched                                                      |
| `__drizzle_migrations` | 9    | Applied schema history                                                   | Infrastructure, not future content                                                         |

Migration history covers admin auth (`0000`), Gallery (`0001`), Our Work and fidelity additions (`0002`-`0004`), Stories and its charset correction (`0005`-`0006`), Inbox (`0007`), and News/Events (`0008`). No Resources migration exists.

Live table collations: Stories, Inbox and News/Events are `utf8mb4_unicode_ci`. Gallery, Our Work, auth and migration-history tables are still `latin1_swedish_ci`. Gallery/Our Work functionality and cutovers are implemented, but their existing charset is a separate Unicode-capacity maintenance risk. No charset alteration was made or proposed as part of the next Resources foundation scope. Any new content table must explicitly use UTF8MB4 rather than inheriting the database's latin1 default.

## Homepage Block Inventory

| Visible block               | Current authority                                                                        | CMS judgment                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Header/navigation/Event bar | Static config/brand assets plus root CMS nearest-event query                             | Event data complete; route contracts/logo need not become editorial records.                                                                    |
| Hero and establishment note | Hard-coded JSX, `siteConfig`, `hero-community.jpg`, hard-coded 1600+ counter             | Stable presentation; counter duplicates impact data and is a future consistency consideration.                                                  |
| Quick-help entry points     | Four hard-coded route tiles                                                              | Intentional navigation.                                                                                                                         |
| Organization introduction   | Hard-coded mission/context paragraphs                                                    | Intentional organizational copy.                                                                                                                |
| Impact overview             | Six `impactMetrics`                                                                      | Conditional maintained-statistics candidate.                                                                                                    |
| Our Work cards              | First six published CMS programs                                                         | Complete.                                                                                                                                       |
| Featured program            | CMS featured selection, description/tags/image; independent hard-coded participant quote | Program CMS complete; quote remains static and is not associated with the selected program in data. Conditional testimonial-governance concern. |
| Partners                    | Two static partner records/logos                                                         | Conditional collection.                                                                                                                         |
| Participant voices          | Three static Testimonials                                                                | Conditional consent-managed collection.                                                                                                         |
| Stories                     | First three published CMS Stories                                                        | Complete.                                                                                                                                       |
| Mental health in Nepal      | Six qualitative static context blocks                                                    | Intentional context copy; not quantitative statistics.                                                                                          |
| Objectives                  | Five static objective groups                                                             | Intentional mission structure.                                                                                                                  |
| Vision and mission          | Hard-coded copy and five commitment points                                               | Intentional organizational copy.                                                                                                                |
| Resources                   | First six static resources                                                               | Main remaining CMS gap.                                                                                                                         |
| Let's Speak multimedia      | Four hard-coded Coming soon tiles; link to CMS Our Work detail                           | No playable media/files. Do not create a speculative media library for placeholders.                                                            |
| Get-involved CTA band       | Four fixed actions/routes                                                                | Intentional navigation/presentation.                                                                                                            |
| News                        | Published CMS News query, all returned items                                             | Complete.                                                                                                                                       |
| Newsletter                  | Static UI copy plus real Inbox/mail submission pipeline                                  | Operationally complete; not a bulk campaign or editorial collection.                                                                            |
| Footer                      | `siteConfig`, static logo and route links, generated current year                        | Configuration/branding, not a mandatory collection CMS.                                                                                         |

## B. Remaining CMS Candidates - Prioritized

| Priority / domain                         | Current source / records                                       | Public routes / admin                                       | Existing DB support                     | Migration / media / cutover complexity                                                                                                           | Should migrate?                                                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Resources                              | `resources.ts`; 10 articles/guides                             | `/resources`, detail, homepage; admin shell exists          | None                                    | Moderate: exact paragraph/date/slug/order fidelity and search/related behavior; media complexity currently none; moderate multi-consumer cutover | Yes. Explicit admin module and real recurring editorial collection already exist.                                                                       |
| 2. Testimonials and partners              | `testimonials.ts`; 3 quotes, 2 partners                        | Homepage, About, Impact, Stories and Partner page; no admin | None                                    | Small data volume; moderate consent/identity decisions; 2 logo assets; multiple consumers and existing type mismatch                             | Conditional. Useful for staff-managed updates, but confirm consent/partner identity and expected maintenance before schema work.                        |
| 3. Global impact overview / sourced facts | `impact.ts`; 6 metrics, 0 facts; duplicate hero number         | Homepage, `/impact`; no dedicated admin                     | Per-program metrics already in Our Work | Moderate governance/verification work; no media; moderate consistency/cutover work                                                               | Conditional. Only global statistics need a separate model if routinely maintained. Do not sum overlapping program figures or duplicate program records. |
| 4. Verified support directory             | `support.ts`; 0 real visible contacts                          | `/get-support`; no admin                                    | None                                    | No useful records to migrate; high verification/safety burden; no current media                                                                  | Conditional on acquiring approved contacts and assigning re-verification responsibility. Never seed the blank placeholder.                              |
| 5. Site contact/social settings           | `site-config.ts`; blank contact values and 4 blank social URLs | Header/Footer/Contact; no settings editor                   | None                                    | Small settings scope, no content migration/media requirement                                                                                     | Optional later settings capability if staff need it. First obtain verified values; do not invent them from SMTP credentials.                            |
| Future multimedia                         | Four Coming soon homepage tiles                                | Homepage/Our Work link; no media admin                      | None                                    | Undefined until actual videos/audio/files exist                                                                                                  | Not a present migration. The current site has no corresponding media records or files.                                                                  |

These priorities are an audit roadmap, not authorization to implement the candidates. Resources is the single next recommended phase below.

## C. Intentionally Static Content

- Mission, vision, history, objectives, approach, stable Nepal context and future-direction copy express the organization's position and do not require a general page builder.
- Navigation, footer route links, CTA pathways, labels and form field definitions are application configuration. Changes to form options may also require coordinated validator changes.
- Privacy, Terms, consent promises and the support disclaimer are safety/policy text that benefits from explicit reviewed code changes.
- Logos, favicon, hero photography and current campaign/supporting images are deliberate repository assets. Being an image does not by itself justify a media CMS.
- Dashboard module cards, disabled Resources placeholder and Coming soon multimedia tiles are UI/configuration states, not hidden content collections.
- Newsletter remains an individual lead/subscriber capture source. Bulk campaigns/general compose are not missing editorial CMS cutovers.

## D. Incomplete Existing Systems and Maintenance Risks

1. **Resources is genuinely unimplemented in admin/backend.** Its route only displays `AdminPageHeader`/`AdminEmptyState`; Add Resource is disabled. Public resources remain fully static. There are no current attachments to implement or migrate.
2. **Resource reference contract is inconsistent.** `Reference` declares `label`, `url`, optional `year`, while the detail component reads `title` and `publisher`. No current resource has references, so this is a latent rendering/type problem, not lost existing citation content. Resolve the contract deliberately before future citation records are accepted; do not invent citation fields during migration.
3. **Impact fact publication guard is only documented.** Source comments require verified facts with source/year, but `/impact` maps a nonempty `nepalFacts` array without checking those attributes. It is currently empty, so no unverified statistic is exposed today. Future statistics work must enforce that policy.
4. **Impact values can drift.** Global static metrics and the homepage hero counter do not automatically follow CMS program metric changes. Figures must not be naively combined because participation may overlap.
5. **Partner verification/presentation needs a decision.** One partner has `nameNeedsConfirmation: true`. Homepage uses the logo assets, while About/Partner lists use literal logo placeholders. A future Partner CMS needs approved identity/presentation and consent decisions, not an automatic assumption that all current fields are verified.
6. **Known static type problems remain.** Testimonials imports a Partner type and also declares its own differing Partner shape (`photo`); Resource reference fields differ as above. These relate to the known historical TypeScript baseline. No compilation fixes or full build were run in this audit.
7. **Legacy charset limits remain.** Gallery/Our Work use latin1 despite later modules using UTF8MB4. Treat as separately scoped maintenance, preserving existing data and media. New Resource tables must avoid inheriting latin1.
8. **Static configuration is intentionally blank in places.** Contact email/phone/address/map and social URLs are blank. Public Contact has a real form; SMTP identity verification does not establish a public telephone/address/social profile. Filling these needs confirmed organizational values, not a speculative CMS rollout.
9. **A retained Our Work asset reference is unresolved.** `programs.ts` imports `src/assets/program-online.jpg`, which is absent at that exact path. It has no active public consumer; migration tooling reads the reference. The similarly named file under `assets/logo` is not evidence of a byte-identical replacement. Preserve sources/assets and investigate before any historical replay, rather than changing current CMS media.

## E. Legacy, Reference and Media Systems

### Retained sources and tools

Keep `src/data/programs.ts`, `src/data/stories.ts`, `src/data/news.ts` and their retained source images. Their migration scripts explicitly read those files; no public runtime consumers remain. Historical Event status strings remain reference data only, not live chronology authority.

Keep manual migration/fidelity/image-sync tools (`migrate-our-work-static.ts`, `backfill-our-work-fidelity.ts`, `sync-our-work-images.ts`, `migrate-stories-static.ts`, `migrate-news-events-static.ts`) and verification scripts as historical/operational tooling. They are not public loaders or automatic fallback systems. Some can create records/media/sessions or send mail and were deliberately not executed.

Existing backend helper/bridge separation is intentional: server repositories own SQL and public projections; `createServerFn` bridges expose them across the boundary; presentation helpers derive paragraphs/metrics/calendar labels. No competing active Resource backend or duplicate active News/Event static query system was found.

The Logo component's temporary-placeholder comment is stale descriptive guidance while the component uses a real repository logo. It is not evidence of an unfinished CMS or an instruction to replace branding.

### Uploaded media

Read-only FTPS directory listing and DB storage-key comparison found **18 media files**: Gallery 2, Our Work 8, Stories 5, News 3. All 18 database references were present; all 18 media files corresponded to database references. No unreferenced uploaded media was found in that configured root. The additional `.ftpquota` file is hosting metadata, not an orphan image. No upload, replacement, delete or binary modification occurred.

All 18 DB image URLs are HTTPS public URLs under `umanganepal.org`. Events have no images. Inbox has no attachments. There is no Resource media category; the existing categories are Gallery, Our Work, Stories, News and a storage-test category. No test media files were found.

This was a directory/reference audit, not a fresh byte/hash certification of every image. Previous News byte/hash verification remains in the committed Phase 13D/13E reports.

### Static assets

There are 27 files under `src/assets`, plus `public/favicon.ico` and `public/robots.txt`. Active static image uses include homepage/About hero, Volunteer image, Invite image, partner logos, header/admin logo and footer logo. No repository PDF, audio/video, document-download resource file was found.

Exact asset-string reference scanning across source found these 14 files without a source asset reference:

- `src/assets/community-session.jpg`
- `src/assets/logo/favvicon.ico`
- `src/assets/logo/favvicon.png`
- `src/assets/logo/hero-community.jpg`
- `src/assets/logo/program-art.jpg`
- `src/assets/logo/program-awareness.jpg`
- `src/assets/logo/program-okay.jpg`
- `src/assets/logo/program-online.jpg`
- `src/assets/logo/program-storytelling.jpg`
- `src/assets/logo/program-stress.jpg`
- `src/assets/logo/umanga-MAIN-LOGO-JPG.jpg`
- `src/assets/logo/umanga-png-2.png`
- `src/assets/logo/umanga.png`
- `src/assets/program-online12.jpg`

These are likely unused by source imports, not proven safe to delete: tools, historical references, manual workflows or assets selected outside imports may still matter. Static originals of migrated images are intentionally retained even when public cards use uploaded CMS URLs. No asset was removed or renamed.

## Security and Boundary Audit

- Public CMS queries apply `published = true` in SQL. Published-by-slug News/Story/Our Work lookups do not return unpublished records. The nearest Event also requires publication and a nonpast Kathmandu date.
- Public projections omit `imageStorageKey`; server-only DB/media/mail modules are not statically imported as runtime code into public routes/components. Type-only imports from server declarations are erased and do not establish runtime database access.
- Admin CRUD/Inbox services authenticate server-side independently of the protected layout. Resource shell remains behind the existing guard; no new endpoints or auth mechanisms were introduced.
- Public/source scans of routes, components and nonserver helpers found no literal internal mailbox, DB URL or SMTP/FTP secret configuration names. Scans of existing built public JS/HTML found no internal mailbox or those secret names. An additional scan of 81 built JS files against three configured password values found no matches. No credential values were printed.
- Some **authenticated admin** Gallery/Our Work responses still carry storage keys through their existing admin projections. These are not passwords and are not present in public collection responses; reducing unused admin payload fields is optional later boundary hardening, not a required public cutover.
- Inbox routing remains server-only. Notifications use `Umanga Nepal Website`, replies use `Umanga Nepal`; partner maps to `partners@`, and reply From/To cannot be overridden by the browser. The audit did not send mail or exercise submission/reply endpoints.
- Source and payload scans are bounded evidence, not a penetration test or proof that every possible response has been examined. No mutation/security test was performed against real records.

## Read-only Runtime Checks

Guest HTTP reads on the existing local application returned 200 for `/`, `/resources`, `/resources/what-mental-health-really-means`, `/news`, `/events`, `/gallery`, `/our-work`, `/stories` and `/contact`. Returned HTML contained neither the internal mailbox nor an `imageStorageKey` property. Guest `/admin/resources` returned 307 to `/admin` with no resource/admin content.

No login, public-form submission, reply, status/publication change, test lead, migration or media upload was made. This phase inspected source and representative SSR responses; it did not claim fresh authenticated UI interaction, mobile visual certification or destructive lifecycle testing. No build was necessary for a report-only change; existing built output was inspected without rebuilding it.

## F. Recommended Single Next Phase

**Phase 14B - Resources CMS Audit and Database Schema Foundation**

**Objective:** establish the smallest database foundation that can faithfully represent the ten existing text resources. Keep public rendering static and `/admin/resources` unchanged during that foundation phase.

**Exact scope:** confirm the current Resource/Reference field contract, design one Resource content table, add inferred types, generate and inspect a narrowly scoped migration, explicitly create UTF8MB4/`utf8mb4_unicode_ci`, apply it, and verify Unicode/paragraph/date/unique-slug behavior through rollback-only checks. Final new table must remain empty. No CRUD, admin editor, static-content migration, public cutover, attachments or media library in this next phase.

**Likely files/systems:** `src/server/db/schema.ts`, one migration plus Drizzle metadata, a narrow Resource type/validation contract if needed, a read-only source inventory and phase report. Use `src/data/resources.ts`, `src/data/types.ts`, ResourceCard, the Resource routes and homepage as audit references; do not rewrite their public behavior during schema foundation.

**Data requirements to finalize from source:** generated CMS IDs; stable unique slugs; title/excerpt; faithful plain-text paragraphs; category; current article/guide type; reading time; publication date; nullable reviewed date; future published visibility, source-order preservation and project timestamps. Confirm optional reference semantics before deciding its representation. Existing video/audio/download union members do not justify file storage fields or upload infrastructure for the current ten records.

**Dependencies:** confirmed organization ownership of mental-health editorial review, exact source-field inventory, current secure database tunnel, and established Drizzle migration conventions. Reuse existing server-only/auth/publication/media boundaries in subsequent authorized work; no new authentication or mail system is required.

**Major risks:** safety/review governance; paragraph and Unicode fidelity; stable URLs linked from support/navigation; date-only round trips; retaining listing order and homepage first six; preserving related-category behavior; resolving the latent citation contract before adding citations; and avoiding latin1 defaults or speculative media features.

There is no audit blocker to planning this foundation. Approval of future scope and an explicit contract for references should precede implementation. No next phase was started here.

## Final Baseline and Change Control

| Domain         | Before | After |
| -------------- | ------ | ----- |
| News           | 3      | 3     |
| Events         | 3      | 3     |
| Gallery        | 2      | 2     |
| Our Work       | 8      | 8     |
| Stories        | 5      | 5     |
| Inbox threads  | 3      | 3     |
| Inbox messages | 4      | 4     |

Full sorted-row SHA-256 snapshots were captured before and after the audit to detect content changes beyond counts. All seven content/Inbox table snapshots match. The existing one admin user and one session also match their snapshots; no temporary session was created or removed. Legitimate Inbox rows/messages were not displayed in this report and were preserved exactly.

No application, schema, configuration, static source, public/admin UI, authentication, mail or media changes were made. No email was sent. No test record/media was created. No migration, commit or push was run. Final Git scope is only this report.
