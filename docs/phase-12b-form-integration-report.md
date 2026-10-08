# Phase 12B: Public lead forms

Branch: `main`. Starting commit: `d24d6b4` (`Add Inbox and mail routing foundation`). Phase 12A was committed, the initial worktree was clean, and `127.0.0.1:3307` was listening. No commit or push was performed.

## Status

All seven form pipelines are implemented. Six channels have complete recorded UI, database and SMTP results. The Stories form created its seventh test thread, but the browser harness incorrectly waited for the word "received" rather than the form's preserved Story-specific success wording. Its cleanup deleted that test row before recording the notification metadata and SMTP message ID. A single additional Stories-only verification submission has been requested; it has not been performed without approval. Phase 12B is not declared fully verified while this check is pending.

## Changed files

- `src/lib/lead-input.ts`: strict per-channel Zod validation and safe public result types.
- `src/lib/lead-server-functions.ts`: public POST server function with dynamic server-only import.
- `src/server/inbox/submit-lead.ts`: one shared mapping/persistence/notification pipeline and injectable server-only failure-test boundaries.
- `src/server/inbox/notification.ts`: readable text and escaped HTML notifications.
- `src/server/mail/channel-routing.ts`: notification display name becomes `Umanga Nepal Website`; From, To and Reply-To remain server-controlled public aliases.
- `src/components/site/InquiryForm.tsx` and `Newsletter.tsx`: real async submission, pending guards, accessible errors/status, reset only after capture.
- Six inquiry routes: Contact, Volunteer, Partner, Support, Invite and Share Your Story.
- Four Newsletter placements: homepage, Get Involved, Events and News. These routes change only their Newsletter source prop; no News/Events CMS work was started.
- `scripts/verify-lead-failures.ts`: manual injected-failure verification, never sends email and never runs automatically.
- This report. Temporary browser/type/security harnesses are removed after use.

No schema, migrations, admin Inbox, auth, favicon, storage, Gallery/Our Work/Stories CRUD, public CMS detail/list rendering or lead-reply implementation changes.

## Routes and preserved form fields

The complete existing field inventory remains in `docs/phase-12a-foundation-report.md`. No fields or attachments were added or removed.

| Channel    | Public form                                            | Wiring                                                               |
| ---------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| contact    | `/contact` -> InquiryForm                              | fixed channel contact                                                |
| newsletter | `/`, `/get-involved`, `/events`, `/news` -> Newsletter | fixed channel newsletter; explicit allowlisted source                |
| volunteer  | `/volunteer` -> InquiryForm                            | fixed channel volunteer                                              |
| partner    | `/partner-with-us` -> InquiryForm                      | fixed channel partner                                                |
| support    | `/support-us` -> InquiryForm                           | fixed channel support                                                |
| invite     | `/invite-umanga` -> InquiryForm                        | fixed channel invite; current published CMS program choices retained |
| stories    | `/share-your-story` -> InquiryForm                     | fixed channel stories; creates Inbox lead only                       |

## Submission architecture

Public form -> POST `createServerFn` -> dynamic import of server-only submission module -> strict Zod parse -> channel-specific mapping -> one MariaDB transaction -> alias notification -> safe public result.

The server function accepts unknown transport input so invalid requests are translated to safe structured form errors by the submission service rather than exposing raw validation internals. Seven channels only: contact, newsletter, volunteer, partner, support, invite, stories. Objects are strict at both envelope and field level. Unknown channels and arbitrary routing properties are rejected; there is no identity fallback.

Required human text is trimmed only at the edges, preserving internal paragraph breaks and Unicode. Optional blank name/phone/subject values become null where applicable. Email is trimmed, validated and lowercased. Phone remains human-readable. Limits: names/contact names/organizations/locations/program/audience/title 255 characters; phone 100; email 320; ordinary message/details/motivation/proposal 20,000; submitted Story body 100,000. Select values match audited options. Invite program must additionally match a currently published Our Work title or "Not sure yet".

All consent values must be explicit boolean true and are stored in metadata. Newsletter does not subscribe other lead channels. Story consent preserves the existing acknowledgement; it does not automatically authorize publication or create a CMS Story.

Universal contact values are stored in thread columns. Metadata retains organization, location, role, availability, organization type, support type, program, audience, attribution preference, consent and source as applicable. Human message text is stored in the inbound message, not duplicated into metadata. Blank optional structured strings become null.

Each valid capture uses distinct random UUIDs for its thread and message. Both inserts share a transaction, start with status `new` and `readAt = NULL`, and use the same timestamp for thread creation/last message and inbound creation. The initial message is direction inbound, sender type lead, From = normalized lead email, To = server-resolved public alias, and SMTP delivery fields remain null.

Newsletter has null name/phone/subject, empty inbound body (the schema permits this), and metadata `event = newsletter_subscription`, source and consent. Its internal notification describes a subscription request explicitly; no fake user paragraph is stored.

## Reliability and notification behavior

Notification is attempted only after the thread/message transaction commits. SMTP failure keeps the complete captured lead and returns `{ success: true }`. Notification status is stored under server-owned `metadata.notification`, with sent/failed/pending semantics; failure uses only `MAIL_NOTIFICATION_FAILED`. A notification-status persistence failure is logged safely and does not undo capture or report it as rejected. There is no automatic mail retry or duplicate notification loop.

Database failure returns a safe public failure and never invokes mail. Logs contain safe codes, channel and internal thread ID, never raw exceptions, lead bodies, credentials or transport configuration.

Notification From is `Umanga Nepal Website <channel alias>`. To and Reply-To are the same public alias, resolved by Phase 12A routing. No notification is sent directly to the internal forwarded mailbox, and no email is sent to the lead. General info/news identities are unused by these pipelines.

Subjects are static channel descriptions, avoiding unnecessary personal or sensitive subject text. Both text and HTML contain channel/source, submitted timestamp, available contact fields, actual user subject/title, message and readable structured field labels. HTML escapes all user content; plain text preserves paragraphs. Future staff replies are directed to the Admin Inbox workflow, not direct replies from the internal mailbox.

## Real public UI verification

Initial Inbox was empty. Exactly one successful submission was attempted per channel in the main seven-form run, at 390px, with unique Umanga-domain test emails, unmistakable temporary text, Nepali and emoji. The main cleanup found and deleted seven controlled test threads and their cascading messages. Six channel records were fully compared before the Stories success-text wait interrupted result capture.

For each of those six: one thread, one inbound message, exact searchable fields, exact structured metadata, new/unread state, separate IDs, matching timestamps, original paragraph text, correct alias and sent notification status were verified. Pending button/input state, reset after capture and visible success feedback also passed. The Contact double-click produced one POST and one lead.

| Channel    | Notification subject                         | From / To / Reply-To                            | SMTP accepted / rejected      | Message ID                                               |
| ---------- | -------------------------------------------- | ----------------------------------------------- | ----------------------------- | -------------------------------------------------------- |
| contact    | `[Umanga Nepal] New Contact Enquiry`         | contact@umanganepal.org                         | 1 / 0                         | `<f6b7ea73-6b59-9104-a3da-575967720142@umanganepal.org>` |
| newsletter | `[Umanga Nepal] New Newsletter Subscription` | newsletter@umanganepal.org                      | 1 / 0                         | `<24858c54-dc03-85bb-93f8-7720126bea0f@umanganepal.org>` |
| volunteer  | `[Umanga Nepal] New Volunteer Enquiry`       | volunteer@umanganepal.org                       | 1 / 0                         | `<946e7a44-0986-9085-6576-c07b4e924f11@umanganepal.org>` |
| partner    | `[Umanga Nepal] New Partnership Enquiry`     | partners@umanganepal.org                        | 1 / 0                         | `<58e6c51e-afc1-badb-39dd-35c0ef924ea0@umanganepal.org>` |
| support    | `[Umanga Nepal] New Support Request`         | support@umanganepal.org                         | 1 / 0                         | `<5acee3c5-0327-f45b-09cb-d0992b55dcda@umanganepal.org>` |
| invite     | `[Umanga Nepal] New Invite Umanga Request`   | invite@umanganepal.org                          | 1 / 0                         | `<fa036483-3fec-23f9-a164-546758c1f09d@umanganepal.org>` |
| stories    | `[Umanga Nepal] New Story Submission`        | stories@umanganepal.org (code mapping verified) | receipt metadata not retained | pending additional verification approval                 |

**MANUAL ALIAS FORWARDING CONFIRMATION REQUIRED.** SMTP acceptance does not establish final mailbox receipt/forwarding or received header preservation. Inspect the subjects and message IDs above in the receiving mailbox manually. No IMAP access was added or used.

## Validation, failure and cleanup checks

- Real Contact UI invalid email and missing name were rejected before any POST, database write or email.
- Direct real public server-function calls rejected admin/random/info channels, fake From/To/Reply-To/mailbox properties, invalid email, absent name/consent, oversized body and nonexistent Invite program. Snapshots were unchanged.
- A deliberately invalid select option passed basic client nonempty validation, then received a safe server field error in the actual UI. The error had `aria-invalid`/`aria-describedby`, and entered values remained intact. No capture or notification occurred.
- Injected SMTP send failure created one temporary thread/message pair, retained it, recorded safe failure metadata and returned captured-success. Unicode, paragraphs and email lowercase normalization were verified.
- Injected database failure used a deliberate foreign-key rejection on the second insert. The first thread insert rolled back, no partial pair survived, and the mail boundary was called zero times.
- HTML/script-looking text remained literal in the text email and escaped in HTML.
- Only unique test IDs were cleaned. The seven primary test threads and one persisted SMTP-failure test thread were removed by thread deletion; their messages disappeared through the cascade. No legitimate Inbox content was deleted.
- Final Inbox: **0 threads, 0 messages**. No schema or media operations.

## Responsive, accessibility and regressions

All seven forms passed 390px and 1440px checks: inputs/selects/textareas/buttons fit the viewport, labels and button names exist, status regions are polite live regions, and no horizontal overflow occurred. Pending/success states were verified for the six fully recorded channels. The Stories form's additional recorded result remains pending as described above.

Buttons are disabled during requests, and a synchronous ref guards rapid repeated activation before a React rerender. Fields and consent are disabled while pending. Buttons remain disabled until hydration, preventing premature native submission. Success resets only after server-confirmed capture; errors preserve entered values. Existing layouts, headings, forms, select choices and consent labels are retained.

Public checks passed for homepage, Contact, all seven form routes, all Newsletter placements, Stories, Gallery and Our Work. Homepage and Contact hard refreshes passed. No browser runtime/hydration errors were observed. Gallery **2**, Our Work **8**, Stories **5** and complete content snapshots are unchanged. Admin Inbox remains the untouched placeholder; no reply or general compose action exists. Logos and favicon are untouched.

No existing honeypot, CAPTCHA, rate limiter or anti-spam service was found. This phase adds strict bounded server validation and fixed alias routing; it does not add an external anti-spam service.

## Build, quality and privacy

`npm run build` passed. Focused TypeScript for new/changed components, server helpers and the manual failure utility passed. Comparing the whole project against in-memory HEAD sources found **10 existing diagnostics and 0 added diagnostics**. Existing Reveal, partner/homepage typing and Resources errors were not changed.

Focused ESLint and Prettier passed for the new helpers, changed form components, notification routing and failure utility. The minimally patched public routes already have formatting diagnostics: baseline comparison found **0 added lint errors/warnings and 0 new formatting regressions**. They were not broadly reformatted. `git diff --check` passed.

Changed source and built public assets contain no internal mailbox address, configured secrets, SMTP configuration, database credentials or storage keys. Public server results contain only safe success/error information, never thread IDs or notification metadata. The notification module and SMTP/database dependencies remain behind server-only boundaries.

Git scope is limited to form integration, validation, notification/submission helpers, verification utility and this report. Schema, migration and existing CMS/auth/media modules are unchanged. No commit/push and no Admin Inbox/reply/News/Events/Resources implementation was performed.

Before Phase 12C: finish the Stories-only receipt/field verification if authorized, then perform manual alias-forwarding confirmation. The pending verification is a test-harness record gap, not a reproduced application bug.
