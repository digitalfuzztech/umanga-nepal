import { useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MAX_REPLY_LENGTH } from "@/lib/inbox-reply-input";
import { replyInboxServerFn } from "@/lib/admin-inbox-server-functions";

type ReplyIdentity = {
  fromName: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
};
export function InboxReplyComposer({
  threadId,
  identity,
  onRefresh,
}: {
  threadId: string;
  identity: ReplyIdentity | null;
  onRefresh: () => Promise<void>;
}) {
  const send = useServerFn(replyInboxServerFn);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const pending = useRef(false);
  const request = useRef<{ id: string; body: string } | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !identity) return;
    const text = body.trim();
    if (!text || text.length > MAX_REPLY_LENGTH) {
      setError("Enter a reply of 1 to 50,000 characters.");
      textarea.current?.focus();
      return;
    }
    if (!request.current || request.current.body !== text)
      request.current = { id: crypto.randomUUID(), body: text };
    pending.current = true;
    setSending(true);
    setError("");
    setStatus("");
    try {
      const result = await send({
        data: { threadId, requestId: request.current.id, replyBody: text },
      });
      if (result.success) {
        setBody("");
        request.current = null;
        setStatus(result.warning ?? "Reply sent.");
        if (result.warning) toast.warning(result.warning);
        else toast.success("Reply sent.");
      } else {
        setError(result.message);
        // A confirmed failed send may be retried explicitly with a fresh request ID.
        if (
          result.code === "SEND_FAILED" ||
          result.code === "SAVE_FAILED" ||
          result.code === "INVALID_REPLY"
        )
          request.current = null;
      }
      try {
        await onRefresh();
      } catch {
        setError(
          "Unable to refresh message history. Refresh the page before sending again.",
        );
      }
    } catch {
      setError(
        "Delivery could not be confirmed. Check message history before sending again.",
      );
    } finally {
      pending.current = false;
      setSending(false);
      textarea.current?.focus();
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mt-7 border-t border-slate-200 pt-5"
      aria-busy={sending}
    >
      <h3 className="text-sm font-bold text-slate-900">Reply to enquiry</h3>
      {!identity ? (
        <p className="mt-3 text-sm text-slate-600">
          This enquiry does not have a valid reply address.
        </p>
      ) : (
        <>
          <dl className="mt-3 space-y-2 text-sm">
            {[
              ["Replying as", `${identity.fromName} <${identity.fromAddress}>`],
              ["To", identity.toAddress],
              ["Subject", identity.subject],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid gap-1 sm:grid-cols-[100px_minmax(0,1fr)]"
              >
                <dt className="font-medium text-slate-500">{label}</dt>
                <dd className="min-w-0 break-all text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          <label
            htmlFor="inbox-reply-body"
            className="mt-5 block text-sm font-semibold text-slate-800"
          >
            Reply message
          </label>
          <textarea
            ref={textarea}
            id="inbox-reply-body"
            required
            maxLength={MAX_REPLY_LENGTH}
            rows={7}
            value={body}
            disabled={sending}
            onChange={(event) => setBody(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "inbox-reply-error" : "inbox-reply-limit"}
            className="mt-2 w-full min-w-0 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:opacity-60"
          />
          <p id="inbox-reply-limit" className="mt-1 text-xs text-slate-500">
            {body.length.toLocaleString("en-US")} / 50,000 characters
          </p>
          {error && (
            <p
              id="inbox-reply-error"
              role="alert"
              className="mt-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          <p
            role="status"
            aria-live="polite"
            className="mt-3 text-sm text-slate-600"
          >
            {sending ? "Sending reply..." : status}
          </p>
          <Button type="submit" disabled={sending} className="mt-3">
            {sending ? (
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            {sending ? "Sending..." : "Send reply"}
          </Button>
        </>
      )}
    </form>
  );
}
