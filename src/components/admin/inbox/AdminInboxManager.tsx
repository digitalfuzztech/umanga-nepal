import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  Mail,
  MailOpen,
  Search,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { InboxReplyComposer } from "./InboxReplyComposer";
import {
  channelLabels,
  inboxChannels,
  inboxStatuses,
  statusLabels,
  parseInboxSearch,
} from "@/lib/admin-inbox-input";
import {
  getInboxServerFn,
  listInboxServerFn,
  readInboxServerFn,
  statusInboxServerFn,
} from "@/lib/admin-inbox-server-functions";

type ListResult = Awaited<ReturnType<typeof listInboxServerFn>>;
type DetailResult = Awaited<ReturnType<typeof getInboxServerFn>>;
type Detail = NonNullable<Extract<DetailResult, { success: true }>["detail"]>;
type InboxSearch = ReturnType<typeof parseInboxSearch>;
const controlClass =
  "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:opacity-60";
const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kathmandu",
});
function date(value: Date) {
  return dateFormat.format(new Date(value));
}
const labels: Record<string, string> = {
  organization: "Organization",
  location: "Location",
  role: "Area of interest",
  availability: "Availability",
  type: "Organization type",
  supportType: "Support category",
  program: "Program",
  audience: "Audience",
  attribution: "Attribution preference",
  consent: "Consent",
  source: "Submission page",
  event: "Submission type",
};
function label(key: string) {
  return (
    labels[key] ??
    key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/^./, (value) => value.toUpperCase())
  );
}
function metadataText(value: Detail["thread"]["metadata"][string]): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string")
    return value === "newsletter_subscription"
      ? "Newsletter subscription"
      : value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value))
    return value.map(metadataText).filter(Boolean).join(", ");
  return Object.entries(value)
    .map(([key, item]) => `${label(key)}: ${metadataText(item)}`)
    .join("\n");
}
function Badge({
  children,
  status = false,
}: {
  children: string;
  status?: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${status ? "bg-slate-100 text-slate-700" : "bg-sky-50 text-sky-800"}`}
    >
      {children}
    </span>
  );
}

export function AdminInboxManager({
  data,
  search,
}: {
  data: { list: ListResult; detail: DetailResult | null };
  search: InboxSearch;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const navigationLoading = useRouterState({
    select: (state) => state.status === "pending",
  });
  const setRead = useServerFn(readInboxServerFn);
  const setStatus = useServerFn(statusInboxServerFn);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const pendingNavigation = hydrated && navigationLoading;
  const [error, setError] = useState("");
  const opened = useRef<string | undefined>(undefined);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const lastThread = useRef<string | undefined>(undefined);
  const list = data.list;
  const detail = data.detail?.success ? data.detail.detail : null;
  const selectedId = detail?.thread.id;
  const filtersActive =
    search.channel !== "all" ||
    search.status !== "all" ||
    search.read !== "all" ||
    Boolean(search.q);

  useEffect(() => setHydrated(true), []);

  async function changeSearch(change: Partial<InboxSearch>) {
    await navigate({ to: "/admin/inbox", search: { ...search, ...change } });
  }
  useEffect(() => {
    if (!selectedId) {
      setBusy(false);
      return;
    }
    if (opened.current === selectedId) return;
    opened.current = selectedId;
    detailHeading.current?.focus();
    let active = true;
    setBusy(true);
    setError("");
    void setRead({ data: { id: selectedId, read: true } })
      .then(async (result) => {
        if (!active) return;
        if (!result.success) setError(result.message);
        else await router.invalidate();
      })
      .catch(() => {
        if (active)
          setError("Unable to mark this enquiry read. Please try again.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId, router, setRead]);
  useEffect(() => {
    if (!search.thread) {
      opened.current = undefined;
      if (lastThread.current)
        document.getElementById(`thread-${lastThread.current}`)?.focus();
    }
    lastThread.current = search.thread;
  }, [search.thread]);

  async function markUnread() {
    if (!detail || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await setRead({
        data: { id: detail.thread.id, read: false },
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      await changeSearch({ thread: undefined });
      await router.invalidate();
      toast.success("Enquiry marked unread.");
    } catch {
      setError("Unable to update read state. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(value: string) {
    if (!detail || busy) return;
    const status = inboxStatuses.find((item) => item === value);
    if (!status) return;
    setBusy(true);
    setError("");
    try {
      const result = await setStatus({
        data: { id: detail.thread.id, status },
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      await router.invalidate();
      toast.success("Status updated.");
    } catch {
      setError("Unable to update status. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    await changeSearch({ q, page: 1, thread: undefined });
  }
  function filter(key: "channel" | "status" | "read", value: string) {
    const next = parseInboxSearch({ ...search, [key]: value, page: 1 });
    void changeSearch({ ...next, thread: undefined });
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          title="Inbox"
          description="Website enquiries and submissions."
        />
        {list.success && (
          <span
            className="rounded-md bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-900"
            aria-live="polite"
          >
            {list.unread} unread
          </span>
        )}
      </div>
      <div className={`${search.thread ? "hidden lg:block" : ""} mt-6`}>
        <form onSubmit={submitSearch} className="flex min-w-0 gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="inbox-search" className="sr-only">
              Search enquiries
            </label>
            <input
              key={search.q}
              id="inbox-search"
              name="q"
              type="search"
              maxLength={200}
              defaultValue={search.q}
              placeholder="Search name, email, phone or subject"
              className={controlClass}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={!hydrated || pendingNavigation}
            aria-label="Search enquiries"
            title="Search enquiries"
          >
            <Search className="size-4" aria-hidden />
          </Button>
        </form>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(
            [
              [
                "channel",
                "Channel",
                inboxChannels.map((value) => [value, channelLabels[value]]),
              ],
              [
                "status",
                "Status",
                inboxStatuses.map((value) => [value, statusLabels[value]]),
              ],
              [
                "read",
                "Read state",
                [
                  ["unread", "Unread"],
                  ["read", "Read"],
                ],
              ],
            ] as const
          ).map(([key, text, options]) => (
            <div key={key}>
              <label
                htmlFor={`filter-${key}`}
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                {text}
              </label>
              <select
                id={`filter-${key}`}
                value={search[key]}
                disabled={!hydrated || pendingNavigation}
                onChange={(event) => filter(key, event.target.value)}
                className={controlClass}
              >
                <option value="all">All</option>
                {options.map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() =>
              void changeSearch({
                channel: "all",
                status: "all",
                read: "all",
                q: "",
                page: 1,
                thread: undefined,
              })
            }
          >
            <X className="size-4" aria-hidden />
            Clear filters
          </Button>
        )}
      </div>
      <div
        role="status"
        aria-live="polite"
        className="mt-3 text-sm text-slate-600"
      >
        {pendingNavigation || busy ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
            Updating Inbox...
          </span>
        ) : null}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {!list.success ? (
        <p role="alert" className="mt-4 text-sm text-red-800">
          {list.message}
        </p>
      ) : (
        <div
          className={`mt-4 grid min-w-0 gap-5 ${search.thread ? "lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]" : ""}`}
        >
          <section
            aria-label="Enquiry list"
            className={`${search.thread ? "hidden lg:block" : ""} min-w-0`}
            aria-busy={pendingNavigation}
          >
            <p className="mb-3 text-sm text-slate-500">
              {list.total} {list.total === 1 ? "enquiry" : "enquiries"}
            </p>
            {!list.items.length ? (
              <div className="rounded-lg border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
                <Inbox className="mx-auto size-8 text-slate-400" aria-hidden />
                <h2 className="mt-3 text-lg font-semibold">
                  {filtersActive
                    ? "No enquiries match these filters."
                    : "No enquiries yet."}
                </h2>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {list.items.map((item) => (
                  <li key={item.id}>
                    <button
                      id={`thread-${item.id}`}
                      type="button"
                      aria-current={
                        search.thread === item.id ? "true" : undefined
                      }
                      onClick={() => void changeSearch({ thread: item.id })}
                      className={`w-full min-w-0 px-4 py-4 text-left transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-500 ${!item.readAt ? "bg-sky-50/50" : "bg-white"} ${search.thread === item.id ? "ring-2 ring-inset ring-sky-300" : ""}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`flex min-w-0 items-center gap-2 break-all text-sm ${!item.readAt ? "font-bold" : "font-medium"}`}
                        >
                          <span className="shrink-0">
                            {item.readAt ? (
                              <MailOpen
                                className="size-4 text-slate-400"
                                aria-hidden
                              />
                            ) : (
                              <Mail
                                className="size-4 text-sky-700"
                                aria-hidden
                              />
                            )}
                          </span>
                          <span className="sr-only">
                            {item.readAt ? "Read" : "Unread"}:{" "}
                          </span>
                          {item.leadName || item.leadEmail}
                        </span>
                        <Badge>{channelLabels[item.channel]}</Badge>
                      </div>
                      {item.leadName && (
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {item.leadEmail}
                        </p>
                      )}
                      <p
                        className={`mt-2 break-words text-sm ${!item.readAt ? "font-semibold" : "text-slate-700"}`}
                      >
                        {item.subject ||
                          (item.channel === "newsletter"
                            ? "Newsletter subscription"
                            : `${channelLabels[item.channel]} enquiry`)}
                      </p>
                      <p className="mt-1 line-clamp-2 break-words text-sm text-slate-500">
                        {item.channel === "newsletter" && !item.preview
                          ? "Newsletter subscription"
                          : item.preview}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <Badge status>{statusLabels[item.status]}</Badge>
                        <time
                          dateTime={new Date(item.lastMessageAt).toISOString()}
                          className="text-xs text-slate-500"
                        >
                          {date(item.lastMessageAt)}
                        </time>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {list.total > list.pageSize || search.page > 1 ? (
              <div className="mt-4 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={search.page <= 1 || pendingNavigation}
                  onClick={() =>
                    void changeSearch({
                      page: search.page - 1,
                      thread: undefined,
                    })
                  }
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </Button>
                <span className="text-sm text-slate-500">
                  Page {search.page} of{" "}
                  {Math.max(1, Math.ceil(list.total / list.pageSize))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    search.page * list.pageSize >= list.total ||
                    pendingNavigation
                  }
                  onClick={() =>
                    void changeSearch({
                      page: search.page + 1,
                      thread: undefined,
                    })
                  }
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
            ) : null}
          </section>
          {search.thread && (
            <section
              aria-label="Enquiry detail"
              className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
            >
              <Button
                variant="ghost"
                size="sm"
                className="mb-4"
                onClick={() => void changeSearch({ thread: undefined })}
              >
                <ArrowLeft className="size-4" aria-hidden />
                Back to Inbox
              </Button>
              {data.detail && !data.detail.success ? (
                <p role="alert" className="text-sm text-red-800">
                  {data.detail.message}
                </p>
              ) : !detail ? (
                <p>This enquiry is no longer available.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{channelLabels[detail.thread.channel]}</Badge>
                    <Badge status>{statusLabels[detail.thread.status]}</Badge>
                    <span className="py-1 text-xs font-semibold text-slate-500">
                      {detail.thread.readAt ? "Read" : "Unread"}
                    </span>
                  </div>
                  <h2
                    ref={detailHeading}
                    tabIndex={-1}
                    className="mt-3 break-words font-display text-xl font-bold outline-none"
                  >
                    {detail.thread.subject ||
                      (detail.thread.channel === "newsletter"
                        ? "Newsletter subscription"
                        : `${channelLabels[detail.thread.channel]} enquiry`)}
                  </h2>
                  <dl className="mt-4 space-y-2 text-sm">
                    {[
                      ["Name", detail.thread.leadName],
                      ["Email", detail.thread.leadEmail],
                      ["Phone", detail.thread.leadPhone],
                      ["Received via", detail.thread.mailbox],
                      ["Received", date(detail.thread.createdAt)],
                    ]
                      .filter(([, value]) => value)
                      .map(([text, value]) => (
                        <div
                          key={text}
                          className="grid gap-1 sm:grid-cols-[100px_minmax(0,1fr)]"
                        >
                          <dt className="font-medium text-slate-500">{text}</dt>
                          <dd className="min-w-0 break-all text-slate-800">
                            {value}
                          </dd>
                        </div>
                      ))}
                  </dl>
                  <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-4">
                    <div className="min-w-36">
                      <label
                        htmlFor="thread-status"
                        className="mb-1 block text-xs font-semibold text-slate-600"
                      >
                        Enquiry status
                      </label>
                      <select
                        id="thread-status"
                        value={detail.thread.status}
                        disabled={busy}
                        onChange={(event) =>
                          void changeStatus(event.target.value)
                        }
                        className={controlClass}
                      >
                        {inboxStatuses.map((value) => (
                          <option key={value} value={value}>
                            {statusLabels[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void markUnread()}
                    >
                      <Mail className="size-4" aria-hidden />
                      Mark as unread
                    </Button>
                  </div>
                  {detail.notificationFailed && (
                    <p
                      role="status"
                      className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                    >
                      Internal email notification failed; lead was still
                      captured.
                    </p>
                  )}
                  <h3 className="mt-7 text-sm font-bold text-slate-900">
                    Original form details
                  </h3>
                  <dl className="mt-3 space-y-3">
                    {Object.entries(detail.thread.metadata).map(
                      ([key, value]) => {
                        const text = metadataText(value);
                        return text ? (
                          <div
                            key={key}
                            className="grid gap-1 text-sm sm:grid-cols-[140px_minmax(0,1fr)]"
                          >
                            <dt className="font-medium text-slate-500">
                              {label(key)}
                            </dt>
                            <dd className="min-w-0 whitespace-pre-wrap break-words text-slate-800">
                              {text}
                            </dd>
                          </div>
                        ) : null;
                      },
                    )}
                  </dl>
                  <h3 className="mt-7 text-sm font-bold text-slate-900">
                    Message history
                  </h3>
                  <ol className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                    {detail.messages.map((message) => (
                      <li key={message.id} className="py-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600">
                            {message.direction === "inbound"
                              ? "Received from lead"
                              : message.direction === "outbound"
                                ? "Reply from Umanga"
                                : "System message"}
                          </span>
                          <time
                            className="text-xs text-slate-500"
                            dateTime={new Date(message.createdAt).toISOString()}
                          >
                            {date(message.createdAt)}
                          </time>
                        </div>
                        <p className="mt-2 break-all text-xs text-slate-500">
                          From: {message.fromAddress}
                          <br />
                          To: {message.toAddress}
                        </p>
                        {message.subject && (
                          <p className="mt-2 break-words text-sm font-semibold">
                            {message.subject}
                          </p>
                        )}
                        {message.body ? (
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
                            {message.body}
                          </p>
                        ) : detail.thread.channel === "newsletter" &&
                          message.direction === "inbound" ? (
                          <p className="mt-3 text-sm text-slate-600">
                            Newsletter subscription
                          </p>
                        ) : null}
                        {message.direction !== "inbound" &&
                          message.deliveryStatus && (
                            <p className="mt-2 text-xs font-medium text-slate-500">
                              Delivery:{" "}
                              {message.deliveryStatus === "failed"
                                ? "Failed"
                                : message.deliveryStatus === "pending"
                                  ? "Pending"
                                  : "Sent"}
                            </p>
                          )}
                      </li>
                    ))}
                  </ol>
                  <InboxReplyComposer
                    key={detail.thread.id}
                    threadId={detail.thread.id}
                    identity={detail.replyIdentity}
                    onRefresh={async () => {
                      await router.invalidate();
                    }}
                  />
                </>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
