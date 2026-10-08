# Phase 12A: Inbox and mail foundation

Verified on 2026-10-08. Branch: `main`. Starting commit: `575d67d` (`Migrate Stories and connect public Stories to CMS`). The worktree was clean at preflight, Stories cutover was committed, and the database tunnel was listening on `127.0.0.1:3307`.

## Files

- `src/server/db/schema.ts`: two Inbox tables, relations and inferred types; existing tables unchanged.
- `drizzle/0007_right_guardian.sql`: generated migration with explicit UTF8MB4 table options.
- `drizzle/meta/0007_snapshot.json` and `drizzle/meta/_journal.json`: generated migration metadata.
- `src/server/mail/index.ts`: narrowly adds a trusted server-side sender argument to the existing sender; transporter/configuration/error handling stay shared.
- `src/server/mail/channel-routing.ts`: central typed routing and sending helpers.
- `scripts/verify-mail-routing.ts`: manual SMTP identity verification utility.
- `package.json`: `mail:routing:verify` command, never invoked by build/start/install.
- This report. Temporary database/browser/type-check harnesses were removed after verification.

## Public form audit

`R` means required by current client validation; `O` means optional. Every InquiryForm has one required consent checkbox in addition to its listed fields. There are no file inputs, radio groups or attachments in these seven channels.

| Channel    | Route / component                                      | Current field inventory                                                                                                                                                                                    | Future mailbox             |
| ---------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| contact    | `/contact`, `Contact` -> `InquiryForm`                 | `name` text R; `email` email R; `phone` tel O; `subject` select R; `message` textarea R; consent R                                                                                                         | contact@umanganepal.org    |
| newsletter | `/`, `/get-involved`, `/events`, `/news`; `Newsletter` | `email` email R; consent checkbox R. No name, phone, subject or message.                                                                                                                                   | newsletter@umanganepal.org |
| volunteer  | `/volunteer`, `Volunteer` -> `InquiryForm`             | `name` text R; `email` email R; `phone` tel O; `location` text O; `role` select R; `availability` select O; `motivation` textarea R; consent R                                                             | volunteer@umanganepal.org  |
| partner    | `/partner-with-us`, `PartnerWithUs` -> `InquiryForm`   | `organization` text R; `contactName` text R; `email` email R; `phone` tel O; `type` select R; `proposal` textarea R; consent R                                                                             | partners@umanganepal.org   |
| support    | `/support-us`, `SupportUs` -> `InquiryForm`            | `name` text R; `organization` text O; `email` email R; `supportType` select R; `details` textarea R; consent R                                                                                             | support@umanganepal.org    |
| invite     | `/invite-umanga`, `InviteUmanga` -> `InquiryForm`      | `organization` text R; `contactName` text R; `email` email R; `phone` tel O; `location` text O; `program` select R; `audience` text O; `details` textarea R (preferred dates and other context); consent R | invite@umanganepal.org     |
| stories    | `/share-your-story`, `ShareYourStory` -> `InquiryForm` | `name` text O; `email` email R; `attribution` select R; `title` text O; `story` textarea R; consent R                                                                                                      | stories@umanganepal.org    |

Select choices:

- Contact: General enquiry; Invite Umanga to our community; Volunteering; Partnership; Media; Other. A contact reason does not change the channel away from contact.
- Volunteer role: Session facilitator; Creative program volunteer; Content & translation; Outreach & community liaison; Event support; Design & media; Not sure yet.
- Volunteer availability: A few hours a month; Weekly; Event-based; Flexible.
- Partner type: School or college; NGO or network; Workplace or company; Local body or government; Other.
- Support type: Give your skills; Provide materials or space; Amplify the work; Organizational support; Something else.
- Invite program: published Our Work CMS titles in query order, plus Not sure yet. Preferred dates currently live in free text, not a separate date input.
- Story attribution: Publish anonymously; Use my first name only; Use my full name; I'll decide later. Submission consent acknowledges that publication requires later explicit consent; it is not permission to publish automatically.

All six InquiryForm instances currently validate fields/email/consent locally, reset local state and show a success toast. None passes `onSubmitValues`; no submission is saved or emailed. Newsletter similarly validates email and consent, resets and shows a toast. There are no existing public lead server functions or active public mail calls. `/get-support` provides support guidance but has no additional lead form.

Phase 12B must explicitly capture consent: InquiryForm currently keeps it separately and its optional callback receives only field values. No form behavior was changed here.

## Mail architecture and routing

The existing Nodemailer transport uses server-only `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM_ADDRESS`, and `MAIL_FROM_NAME`. It retains secure TLS verification and existing bounded timeouts and safe error mapping. The authenticated SMTP identity is `info@umanganepal.org`.

The legacy `sendAdminNotification` remains server-only and unused by public forms. New lead notifications use `sendLeadNotification(channel, input)` instead: recipient, From and Reply-To are resolved to the public alias. `sendLeadMail` resolves the channel From/Reply-To for future outbound communication. `sendGeneralMail` uses only info/news identities. No public action or route was connected to these helpers.

`LeadChannel` derives from the schema's seven constrained channel values. `getLeadMailbox`, `getOutboundIdentity` and `getGeneralOutboundIdentity` fail closed for unknown values, including prototype-property names. Runtime tests passed. From display name is always `Umanga Nepal`. No browser-controlled sender or Reply-To is accepted by the routing helpers. SMTP authentication and public sender identity are separate.

General identities: `info` -> `info@umanganepal.org`; `news` -> `news@umanganepal.org`. Neither substitutes for a lead alias.

### SMTP results

`npm run mail:routing:verify` passed transport verification, then sent exactly one controlled test per identity, sequentially without retries. Each lead message was addressed to its own public alias. The two general messages were addressed to `info@umanganepal.org`. All nine messages had one accepted recipient and zero rejected recipients.

| From identity              | Accepted recipient         | Rejected | Message ID                                               |
| -------------------------- | -------------------------- | -------- | -------------------------------------------------------- |
| contact@umanganepal.org    | contact@umanganepal.org    | none     | `<d5a3e146-57ab-496a-731f-4e862c31d720@umanganepal.org>` |
| newsletter@umanganepal.org | newsletter@umanganepal.org | none     | `<b633addd-a0be-3344-49fa-b2383420ecdb@umanganepal.org>` |
| volunteer@umanganepal.org  | volunteer@umanganepal.org  | none     | `<f79a4320-8675-6046-4e43-50a8fe41b94b@umanganepal.org>` |
| partners@umanganepal.org   | partners@umanganepal.org   | none     | `<5e5aa4ab-a139-98c8-1877-763f397c7bfb@umanganepal.org>` |
| support@umanganepal.org    | support@umanganepal.org    | none     | `<72c55e95-aeac-826b-823a-52fe8dedca42@umanganepal.org>` |
| invite@umanganepal.org     | invite@umanganepal.org     | none     | `<acadf06e-229d-2b39-d573-e69b5e16f175@umanganepal.org>` |
| stories@umanganepal.org    | stories@umanganepal.org    | none     | `<2a4af6cc-357d-b79c-96a6-98c02ae41eee@umanganepal.org>` |
| info@umanganepal.org       | info@umanganepal.org       | none     | `<b5275a98-67c1-80ea-f4a8-74376d4df517@umanganepal.org>` |
| news@umanganepal.org       | info@umanganepal.org       | none     | `<88a76c6c-f5fb-9ae6-2908-e7399b6b808f@umanganepal.org>` |

SMTP acceptance establishes that the server accepted the required sender/recipient envelopes and message submissions. Actual mailbox receipt, forwarding, and received From/Reply-To headers were not inspected through mailbox access. Manual confirmation of the nine test messages is still required; no IMAP/POP or mailbox synchronization was added.

## Database model

Two tables only, with UUID-shaped `varchar(36)` primary keys. Future successful form submissions will create a thread and first inbound message in one transaction. This phase did not implement that flow.

### inbox_threads

| Column          | SQL type                                                          | Null / default                                                       |
| --------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| id              | varchar(36), primary key                                          | required                                                             |
| channel         | enum(contact,newsletter,volunteer,partner,support,invite,stories) | required                                                             |
| mailbox         | varchar(320)                                                      | required, resolved public alias                                      |
| lead_name       | varchar(255)                                                      | nullable, supports anonymous Stories and email-only Newsletter       |
| lead_email      | varchar(320)                                                      | required                                                             |
| lead_phone      | varchar(100)                                                      | nullable                                                             |
| subject         | varchar(255)                                                      | nullable, actual contact reason / Story title where supplied         |
| metadata        | JSON object                                                       | required, no invented SQL default                                    |
| status          | enum(new,open,resolved)                                           | required, default new                                                |
| read_at         | datetime                                                          | nullable, null means unread                                          |
| last_message_at | timestamp                                                         | required, default now; later updated explicitly when adding messages |
| created_at      | timestamp                                                         | required, default now                                                |
| updated_at      | timestamp                                                         | required, default now, on update current timestamp                   |

Metadata preserves original form-specific structured fields such as organization, role, availability, location, audience, selected program/support/organization type, attribution preference, consent and originating route. Primary name/email/phone/subject/channel remain directly searchable. Original long-form text belongs to the first inbound message. Newsletter has no user-authored message; future integration must distinguish its subscription event from an invented user message and preserve email/consent/source/timestamp.

Indexes: channel, status, read_at, last_message_at, created_at, lead_email. No uniqueness on lead_email: one person can submit multiple independent enquiries.

### inbox_messages

| Column              | SQL type                      | Null / default                            |
| ------------------- | ----------------------------- | ----------------------------------------- |
| id                  | varchar(36), primary key      | required                                  |
| thread_id           | varchar(36), foreign key      | required                                  |
| direction           | enum(inbound,outbound,system) | required                                  |
| sender_type         | enum(lead,staff,system)       | required                                  |
| from_address        | varchar(320)                  | required                                  |
| to_address          | varchar(320)                  | required                                  |
| subject             | varchar(998)                  | nullable                                  |
| body                | mediumtext                    | required, preserves plain-text paragraphs |
| delivery_status     | enum(pending,sent,failed)     | nullable; null for inbound/system         |
| smtp_message_id     | varchar(998)                  | nullable                                  |
| delivery_error_code | varchar(100)                  | nullable, safe application code only      |
| created_at          | timestamp                     | required, default now                     |

Composite index: `(thread_id, created_at)`. Foreign key: `thread_id` -> `inbox_threads.id`, `ON DELETE CASCADE`. No attachment table because no audited form supports uploads. No spam/archive workflow, bulk newsletter campaigns, lead-to-CMS-Story conversion or admin reply implementation was added.

Types exported: `InboxThread`, `NewInboxThread`, `InboxMessage`, `NewInboxMessage`, and recursive `InboxMetadataValue`. Relations support thread/message navigation.

## Migration and verification

- Generated `0007_right_guardian.sql`; inspected before applying. SQL creates only the two Inbox tables, seven secondary indexes and one foreign key. It does not alter any existing CMS/auth table.
- Both CREATE TABLE statements explicitly specify `DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`; the database's latin1 default is not used. Drizzle does not model table charset/collation, so the migration is authoritative and must be retained for fresh setups.
- `npm run db:migrate` passed. Live SHOW CREATE TABLE confirms InnoDB, every intended column/index, cascade foreign key and UTF8MB4 defaults on both tables.
- MariaDB represents JSON as checked LONGTEXT using utf8mb4_bin internally. Drizzle returned the nested object/array/boolean/null metadata correctly; no double serialization.
- Rollback-only test verified exact Nepali name/subject/body, emoji, blank-line paragraph preservation, nullable read/phone/delivery fields, new status default, and cascading child deletion. The transaction was rolled back.
- Final Inbox: **0 threads, 0 messages**. No attachments table or permanent demo leads.
- Complete pre/post CMS snapshots match: Gallery **2**, Our Work **8**, Stories **5**. No existing CMS content/media changes.

## Privacy, regressions and quality

- Public/frontend source and built public assets contain no internal mailbox address. Existing public site-config email is blank; Contact/Footer publish no Umanga email address today. New public identity literals live only in the server-only routing map.
- Public source/built assets have no SMTP username/password configuration, MAIL_ADMIN_ADDRESS, DATABASE_URL, Nodemailer or channel-routing implementation exposure. Representative public HTML also contains no internal mailbox address.
- Changed-file scan against configured secret values passed. No credentials, private keys, session tokens or buffers added to tracked files.
- Browser checks passed for `/`, `/contact`, `/stories`, `/gallery`, `/our-work` and authenticated `/admin/dashboard`, with no browser runtime errors. `/admin/inbox` still shows its original placeholder.
- Temporary normal-login sessions used for regression checks were individually removed. Legitimate session snapshots were preserved.
- Public forms, form submission behavior, CMS/public Stories/Gallery/Our Work code, favicon, logos, auth, storage and all existing schema definitions remain unchanged.
- `npm run build` passed. Existing Vite paths-plugin notice and npm min-release-age configuration warning remain; no targeted-code warnings/errors.
- Focused ESLint and Prettier checks passed for schema, existing mail helper, routing module, verification script and package JSON. Focused TypeScript passed using existing project strict settings plus Node types for the manual script. Generated SQL was inspected rather than formatted with an unsupported parser.
- No commit or push performed. No Phase 12B form wiring or Phase 12C Inbox UI started.

The application foundation is ready for Phase 12B. Manual confirmation of forwarded mailbox receipt and received identity headers remains an operational check, not an SMTP acceptance result inferred by the application.
