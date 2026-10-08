# Phase 12C: Admin Inbox

Phase 12C is complete. Branch `main`; starting commit `e8727dc` (`Connect public lead forms to Inbox and mail routing`). Phase 12B was committed, the initial worktree was clean, and the database tunnel was listening. No commit or push was performed.

## Files and scope

- `src/server/inbox/admin.ts`: authenticated list/detail/read/status operations, safe errors.
- `src/lib/admin-inbox-input.ts`: shared strict input validators, human channel/status labels and URL search parsing.
- `src/lib/admin-inbox-server-functions.ts`: GET list/detail and POST read/status bridges, with dynamic server-only imports.
- `src/routes/admin/_protected/inbox.tsx`: thin protected route, URL search validation and SSR loader.
- `src/components/admin/inbox/AdminInboxManager.tsx`: responsive Inbox list, filters and thread detail.
- `src/lib/admin-auth-server-functions.ts`: narrow privacy correction discovered during live verification. The existing shared shell displayed the real internal mailbox from the authenticated profile. Its client-facing display value is now `Umanga staff` for an internal admin address. Authentication, account data, sessions and authorization remain unchanged.
- This report. Temporary browser/type-check harnesses were removed.

No schema, migrations, public forms, SMTP/routing, Gallery/Our Work/Stories CRUD, media, favicon, News/Events/Resources or reply implementation changes.

## Architecture and queries

Protected admin route -> TanStack server functions -> dynamic import of authenticated server-only Inbox module -> existing MariaDB schema. Every list/detail/read/status operation checks the current administrator before parsing inputs or accessing Inbox data. Failures return safe unauthorized, invalid-input, not-found or generic Inbox messages.

The list is bounded to 25 threads per page, ordered by `lastMessageAt DESC, id DESC`. It returns contact/list fields and a 180-character latest-message preview. Total filtered count and global unread count support pagination and the page header. Latest previews use an explicitly qualified correlated thread ID; live verification confirmed previews display correctly.

Channel, status, read state, search, page and selected thread are stored in URL search parameters. Channel choices are All/Contact/Newsletter/Volunteer/Partner/Support/Invite/Stories. Status choices are All/New/Open/Resolved. Read choices are All/Unread/Read. Search trims input, limits it to 200 characters and uses parameterized Drizzle LIKE comparisons across lead name, email, phone and subject. Wildcards are escaped. All filters combine; refresh preserves them.

Detail retrieves the selected thread and chronologically ordered messages (`createdAt ASC, id ASC`). Original metadata is preserved and given human labels, including organization, location, area of interest, availability, organization type, support category, program, audience, attribution preference, consent and submission page. Other metadata values remain accessible with readable fallback labels. Blank/null values are omitted. Notification transport metadata is excluded from browser data; a safe notification-failure flag produces a warning that the lead was still captured. Raw SMTP errors/message internals are not exposed.

Opening an enquiry marks it read through an authenticated POST mutation, setting `readAt` only if previously unread. It never changes workflow status. Mark as unread clears `readAt` and returns to the list so a refresh does not immediately mark it read again. New/Open/Resolved changes are separate authenticated operations. Original content, metadata, messages and activity timestamps are not rewritten by management actions.

## Presentation

The existing admin shell and controls are reused. List rows show read/unread mail icons, explicit accessible read-state text, stronger unread typography, contact name/email, channel badge, subject, bounded message preview, status badge and Kathmandu timestamp. Empty Inbox copy is `No enquiries yet.`; filtered empty copy is `No enquiries match these filters.`

Desktop supports list plus selected detail. At 390px the list gives way to a full-width detail with Back to Inbox. Opening focuses the detail heading; returning restores focus to the originating row. Search/filters/status controls have labels, rows and commands are keyboard reachable, loading is announced politely and errors use alert semantics. Inbox has no Send, Reply or Compose action.

Detail shows lead name/email/phone when present, public mailbox, received time, status, original structured form data and chronological history. Human message bodies use safe plain text with preserved whitespace/paragraph breaks. Inbound/outbound/system directions have distinct labels; outbound/system delivery status can render without raw errors. Newsletter uses its subscription description and empty original body, rather than inventing a user paragraph. Stories leads are presented as submissions, without linking them to published CMS records.

## Live verification

Exactly one controlled submission per channel was made through the real public UI, at 390px. No duplicate or replacement submissions were made. Each produced one new unread thread, one inbound message and an accepted internal alias notification.

| Channel | Public form | Public mailbox | Result |
| --- | --- | --- | --- |
| Contact | `/contact` | `contact@umanganepal.org` | Passed |
| Newsletter | homepage Newsletter | `newsletter@umanganepal.org` | Passed |
| Volunteer | `/volunteer` | `volunteer@umanganepal.org` | Passed |
| Partner | `/partner-with-us` | `partners@umanganepal.org` | Passed |
| Support | `/support-us` | `support@umanganepal.org` | Passed |
| Invite | `/invite-umanga` | `invite@umanganepal.org` | Passed |
| Stories lead | `/share-your-story` | `stories@umanganepal.org` | Passed |

All seven had exact searchable contact values, source-specific metadata, explicit consent, public mailbox, timestamps and original message representation. Unicode/Nepali/emoji in names, metadata and bodies matched; blank-line paragraph text matched exactly. Newsletter preserved its subscriber email, consent, source and subscription timestamp with no fake body. Partner used `partners@`; Stories created no CMS Story.

The list initially showed seven New/Unread controlled leads. Every channel filter returned its corresponding lead. New showed seven; Open/Resolved and Read initially showed none; Unread showed seven. Search by contact name, unique email and Story title passed. Combined Contact + New + Read + search returned exactly Contact. Hard refresh preserved URL filters.

Opening Contact set `readAt`, left status New and rendered exact details/body. Mark unread set SQL NULL and remained unread after refresh. Reopening marked it read again. New -> Open -> Resolved -> New persisted through refreshes. Each channel detail showed its exact public mailbox, original metadata and message. No notification metadata or message changed during Inbox management. The server module and bridge have no SMTP/mail imports or calls; management actions send zero emails.

390px and 1440px list/detail checks passed with no horizontal overflow. Labels, named buttons, keyboard-reachable rows, native status select and focus return passed. Screenshots were inspected. Hard-refresh hydration was verified after correcting a newly introduced router pending-state SSR mismatch by gating the loading indicator until hydration; primary content remains SSR-loaded.

Logged-out `/admin/inbox` redirected to login. Real unauthenticated browser calls to list, detail, mark read, mark unread and status update all returned UNAUTHORIZED without Inbox data or mutation. Authenticated Inbox HTML contained no internal admin mailbox after the profile privacy correction. Built public assets contained no internal mailbox, DATABASE_URL, SMTP password/configuration, Nodemailer/mysql2 or storage keys.

An SSH tunnel interruption occurred during the final recheck. Once the listener returned, verification resumed using the same seven leads. Only the exact failed-cleanup test-session ID was removed, and later temporary sessions were removed normally. Legitimate starting sessions were preserved.

## Cleanup and regressions

Only the seven recorded Phase 12C test threads were deleted, after verifying exact channel/email/run identity and absence from baseline data. Their messages were removed through the existing FK cascade. Final Inbox: **0 threads, 0 messages**. No legitimate independent leads appeared or were deleted. Temporary authenticated sessions were removed; original sessions remained.

Complete CMS snapshots were unchanged: Gallery **2**, Our Work **8**, Stories **5**. `/admin/gallery`, `/admin/our-work`, `/admin/stories` and `/admin/dashboard` remained operational. Final public hard-refresh checks for `/`, `/contact`, `/stories`, `/gallery` and `/our-work` returned normal pages with no hydration/runtime errors. Seven actual public submissions demonstrated the unchanged Phase 12B capture pipeline; all central alias identities and website notification From behavior remained unchanged. No schema, media, public CMS, favicon or logo changes.

## Quality and remaining work

`npm run build` passed after final code changes. Focused TypeScript: **0 diagnostics**. Focused ESLint: **0 errors/warnings**. Prettier check passed on all changed application files. Full-project TypeScript still reports the same 10 historical Reveal/testimonials/homepage/Resources diagnostics outside this phase; they were not modified. `git diff --check` passed. No credentials, token values or image buffers were introduced in tracked files or report output.

Git scope is limited to Inbox implementation, one verified admin profile privacy correction and this report. No Phase 12D reply/send/general compose feature has been started. No application blocker remains before Phase 12D. **MANUAL ALIAS FORWARDING CONFIRMATION REQUIRED** remains an operational mail receipt check: SMTP acceptance does not prove hosting-forwarder delivery.

Dev site: `http://127.0.0.1:5177/admin/inbox`.
