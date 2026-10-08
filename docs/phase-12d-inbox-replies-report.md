# Phase 12D: Channel-specific Inbox replies

Phase 12D is complete. Branch `main`; starting commit `c8fd0c9` (`Add Admin Inbox lead management`). Phase 12C was committed, the worktree was clean and the local MariaDB tunnel was listening. No commit or push was performed.

## Files changed

- `src/server/inbox/reply.ts`: authenticated reply service, central routing resolution, escaped mail formatting, transactional pending reservation, delivery updates and server-only fault injection.
- `src/lib/inbox-reply-input.ts`: strict reply transport schema and safe result types.
- `src/lib/admin-inbox-server-functions.ts`: authenticated server-only reply bridge through dynamic import.
- `src/server/inbox/admin.ts`: provides validated read-only reply identity in thread detail.
- `src/components/admin/inbox/InboxReplyComposer.tsx`: plain-text composer with fixed From/To/subject display, pending guard, safe result handling and explicit manual retry after confirmed failure.
- `src/components/admin/inbox/AdminInboxManager.tsx`: embeds composer and labels outbound history as replies rather than claiming all attempts were sent.
- `scripts/verify-inbox-reply-failures.ts`: manual no-email fault verification. Run explicitly with `node node_modules/tsx/dist/cli.mjs scripts/verify-inbox-reply-failures.ts`; never runs automatically.
- This report. Temporary live browser/type/receipt harnesses were removed.

No schema, migrations, public form behavior/routing, SMTP transport, channel map, Gallery/Our Work/Stories, favicon, general composer, campaigns or attachment changes.

## Reply architecture

Actual Inbox form -> POST `createServerFn` -> dynamic import of server-only reply module -> existing administrator authentication -> strict server validation -> load and lock thread -> central channel identity -> existing secure `sendLeadMail` transport -> delivery update -> route invalidation.

Client input is limited to `threadId`, `replyBody` and a UUID `requestId` used for duplicate protection. From, Reply-To, channel, recipient and mailbox are never accepted from the client. Extra properties fail strict validation. The thread's channel is checked against the seven-channel allowlist; lead email is validated from `thread.leadEmail`. Invalid/corrupt channels or recipients fail closed before sending. The internal mailbox is also rejected as a reply recipient or authored reply content.

Central `getOutboundIdentity` supplies `Umanga Nepal` and the channel address. `sendLeadMail` forces the same address as Reply-To. Existing website notifications retain `Umanga Nepal Website`; their behavior is unchanged. Partner uses `partners@`, with an s. General info/news identities are not reply senders.

Subject uses the thread's original subject with one normalized `Re:` prefix; repeated existing prefixes are removed. Missing subjects use Contact enquiry, Newsletter enquiry, Volunteer enquiry, Partnership enquiry, Support request, Invite Umanga request or Story submission. Header line breaks are normalized safely. Subject is read-only in the UI.

Body is required, outer-trimmed and bounded to 50,000 characters. Internal Unicode and paragraph breaks remain unchanged. Both text and HTML are sent. HTML escapes text characters and preserves line breaks, with simple Umanga branding; no arbitrary HTML is accepted.

## Persistence and recovery semantics

The service reserves the request UUID as the outbound message ID in a MariaDB transaction before SMTP. It inserts direction `outbound`, sender type `staff`, resolved public From, thread lead recipient, subject/body, delivery `pending` and creation timestamp. The same transaction updates `lastMessageAt` to the attempted message creation time. It does not change read state or workflow status.

The parent thread is locked while checking/reserving a request. Repeated concurrent requests with the same ID/body/thread reuse the existing record and never send it again. A confirmed sent record returns success; failed/pending records return a safe failure/unconfirmed state without resending. The UI adds a synchronous ref guard and disabled Sending state, and retains its request ID when transport delivery is ambiguous. A confirmed failed attempt may be explicitly retried with a fresh request ID. No background or automatic retry exists.

SMTP success requires the thread recipient in accepted recipients and zero rejections. The message becomes `sent` and stores its SMTP message ID. A safe authenticated response also contains accepted/rejected/message ID receipt data. SMTP failure leaves the attempted body in history as `failed`, with `REPLY_SEND_FAILED` and null SMTP ID. No credentials or raw mail errors reach the UI.

If SMTP succeeds but saving sent status fails, the initial pending record remains. The result warns that the server accepted the reply but status needs confirmation; the UI clears the composer and warns against resending. Only message ID and SMTP ID are logged for reconciliation. Repeating the original request does not send again. This is a manual reconciliation edge case, not a distributed transaction or automatic retry system. If recording failed status also fails, the service returns delivery-unconfirmed with a check-before-resending message.

Composer displays non-editable Replying as, To and Subject. It has one labelled textarea and Send reply command, no From selector, editable recipient, CC/BCC or uploads. Success clears text, refreshes history, retains selected thread/filter/search context and announces sent state. Failure retains text, displays a safe error and refreshes the failed history. Focus returns to the textarea. Invalid lead addresses disable the reply workflow with explanatory copy.

## Seven real UI replies

Exactly one controlled lead per channel was created through its actual public form, then exactly one SMTP reply per channel was sent through `/admin/inbox`. All lead recipients were the existing controlled Umanga mailbox `info@umanganepal.org`. This address was a recipient only, not an alternative sender identity.

Every row below used From display name **Umanga Nepal**, Reply-To equal to its From address, SMTP accepted recipient `info@umanganepal.org`, and **zero rejected recipients**.

| Channel | From and Reply-To | Outbound SMTP message ID |
| --- | --- | --- |
| Contact | `contact@umanganepal.org` | `<f22fb96e-95e2-f66f-ce5e-302f30d6686f@umanganepal.org>` |
| Newsletter | `newsletter@umanganepal.org` | `<675410c1-05e0-2e37-8bee-eb23fc627ac3@umanganepal.org>` |
| Volunteer | `volunteer@umanganepal.org` | `<404d1649-0161-5622-6a36-a9661bab369e@umanganepal.org>` |
| Partner | `partners@umanganepal.org` | `<60688edf-7964-9a54-cc5e-a1b3d83a796d@umanganepal.org>` |
| Support | `support@umanganepal.org` | `<a6b03605-c7b8-6b1e-8d44-5892cb2aeca1@umanganepal.org>` |
| Invite | `invite@umanganepal.org` | `<7dbd93cf-c29d-7f6d-b6ff-e6d814175c88@umanganepal.org>` |
| Stories | `stories@umanganepal.org` | `<aed49471-7275-7451-4c5f-e0852de491d2@umanganepal.org>` |

The Contact result was recovered from its saved sent record after a harness assertion compared an unescaped SMTP ID against the framework's escaped serialized response. It was not resent. The remaining six SMTP receipt responses were decoded using the framework's Seroval parser and accepted/rejected arrays checked directly. Contact's sent state also requires accepted recipient and zero rejections in the actual service. A harness-only browser function naming issue was corrected without modifying application behavior or resending any reply.

Each thread had one original inbound message and one sent outbound message. Outbound stored sender/recipient/subject/body/delivery/SMTP ID matched the expected channel identity. Read state and status remained unchanged by send; last activity matched the outbound creation time, and replied threads rose in the list. Original metadata remained identical. Hard refresh preserved sent messages and exact body text. All replies included Nepali/emoji and multiple paragraphs, preserved exactly in MariaDB and plain-text/HTML send input. Stories replies did not create CMS Stories. Newsletter remained an individual thread reply, not a campaign.

## Security and failure verification

- Real authenticated server-function requests with recipient override, attacker From, internal mailbox From, arbitrary channel, Reply-To override and whitespace-only body were rejected without new outbound rows or mail.
- A real unauthenticated reply call returned UNAUTHORIZED without sending or writing a message.
- Contact whitespace-only UI submission was rejected. Rapid double activation of Send produced one outbound row and one SMTP send.
- Server-only corrupt-channel resolution failed closed with no mail. Invalid bodies, routes and unauthorized/failing persistence paths were checked in the manual harness.
- Concurrent matching request IDs produced exactly one mocked send; replay of a sent request did not send again.
- Injected SMTP failure persisted a failed attempt with exact Unicode/body, safe code and no SMTP ID. Repeating the failed request did not send again.
- Injected post-SMTP database save failure kept a pending record, returned an accepted-but-unconfirmed warning, and repeating its ID invoked the mail boundary only once.
- HTML-looking text remained literal in the text body and escaped in HTML. Repeated Re prefixes normalized to one.
- Actual browser failure UX was verified with a controlled mail-send boundary that throws and a harness-only intercepted response. Text remained, a safe error appeared, history showed Failed and no SMTP internals leaked. Zero real emails were sent by failure tests. Their fixtures were removed by exact IDs/cascade.

Configured From/Reply-To values, public UI/payloads, history and email templates contained no internal mailbox identity. Built client/public assets contained no internal mailbox, SMTP credentials/configuration, DATABASE_URL, Nodemailer or mysql2. The internal-address rejection guard exists only in the server-only module. No credential or token values were added to tracked files or reported.

**MANUAL LEAD-MAILBOX RECEIPT CONFIRMATION REQUIRED.** SMTP acceptance proves server acceptance, not final receipt or provider-preserved displayed headers. Inspect the seven message IDs in the controlled recipient mailbox manually. No IMAP access or mailbox deletion was used. The earlier manual alias-forwarding confirmation requirement remains separate.

## Responsive, regression and cleanup results

At 390px, fixed sender/recipient display wrapped safely, textarea and Send were usable, messages/status/errors fit and no horizontal overflow occurred. At 1440px the existing list/detail workflow and compact composer remained intact. Screenshots were inspected. Labelled textarea, named Send control, polite sending/success announcements, understandable alert errors, disabled pending controls and focus return passed. Hard refreshes produced no runtime/hydration errors.

Combined channel/status/read/search filters worked after replying. Filter/search/thread selection remained on send. Read/unread, read-on-open and New/Open status management still persisted, with original metadata visible. No management-only action sent mail.

The starting live Inbox snapshot contained **2 legitimate threads and 3 messages**. These were preserved byte-for-byte in the verification snapshot. Exactly the **7 controlled test threads** and their cascading messages were removed, as were all controlled failure fixtures and temporary authenticated sessions. Final Inbox: **2 threads, 3 messages**, all legitimate retained data. No other leads were edited or replied to during testing. Sent test emails remain in mailboxes by design.

Complete CMS content snapshots were unchanged: Gallery **2**, Our Work **8**, Stories **5**. Public `/`, `/contact`, `/gallery`, `/our-work`, `/stories` and admin Gallery/Our Work/Stories remained operational. Seven authentic public submissions verified Phase 12B capture/alias notifications still function; their routing and Website display-name convention were untouched. No schema or media changes.

## Build and scope

`npm run build` passed. Focused TypeScript reported **0 diagnostics**; focused ESLint **0 errors/warnings** and Prettier passed for all changed application files and the retained manual verification utility. Full-project TypeScript still reports the same ten historical Reveal/testimonials/homepage/Resources diagnostics outside this phase, which were not changed. `git diff --check` passed.

Scope is limited to thread replies, reply-safe detail context, composer/history integration, manual no-email fault utility and this report. No general compose, info/news sender workflow, bulk sending, attachment, schema or unrelated CMS work was started. No application blocker remains before declaring the scoped Inbox reply system complete; manual mailbox receipt/alias forwarding checks remain operational confirmation tasks.

Dev site: `http://127.0.0.1:5177/admin/inbox`.
