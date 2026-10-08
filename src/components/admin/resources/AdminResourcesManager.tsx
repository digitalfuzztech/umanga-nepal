import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  createResourceServerFn,
  updateResourceServerFn,
  deleteResourceServerFn,
  listResourcesServerFn,
} from "@/lib/admin-resources-server-functions";
import {
  inputClass,
  suggestSlug,
} from "@/components/admin/news-events/news-events-ui";

type Result = Awaited<ReturnType<typeof listResourcesServerFn>>;
type Item = Extract<Result, { success: true }>["items"][number];
type Action = { kind: "create" } | { kind: "edit" | "delete"; item: Item };
const fields = [
  ["title", "Title", "text", 255],
  ["slug", "Slug", "text", 191],
  ["excerpt", "Excerpt", "textarea", 5000],
  ["content", "Content", "textarea", 100000],
  ["category", "Category", "text", 100],
  ["readingTime", "Reading Time (minutes)", "number", 0],
  ["sortOrder", "Sort Order", "number", 0],
  ["publishedAt", "Published At", "date", 0],
  ["reviewedAt", "Reviewed At", "date", 0],
] as const;

export function AdminResourcesManager({
  initialResult,
}: {
  initialResult: Result;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const add = useRef<HTMLButtonElement>(null);
  const items = initialResult.success ? initialResult.items : [];
  function open(next: Action) {
    opener.current = document.activeElement as HTMLElement;
    setAction(next);
  }
  function restoreFocus() {
    (opener.current?.isConnected ? opener.current : add.current)?.focus();
  }
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-950">
            Resources
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Manage guides, articles and mental-health resources.
          </p>
        </div>
        <Button ref={add} onClick={() => open({ kind: "create" })}>
          <Plus aria-hidden />
          Create Resource
        </Button>
      </header>
      {!initialResult.success ? (
        <p role="alert" className="mt-6 text-red-700">
          Resources could not be loaded.{" "}
          <Button variant="outline" onClick={() => router.invalidate()}>
            Try Again
          </Button>
        </p>
      ) : !items.length ? (
        <section className="mt-7 flex min-h-64 flex-col items-center justify-center border-y border-dashed border-slate-300 p-6 text-center">
          <BookOpen aria-hidden className="size-10 text-sky-700" />
          <h3 className="mt-4 font-display text-xl font-bold">
            No resources yet.
          </h3>
        </section>
      ) : (
        <section
          aria-label="Resources"
          className="mt-7 grid gap-4 xl:grid-cols-2"
        >
          {items.map((item) => (
            <article
              key={item.id}
              className="min-w-0 rounded-lg border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span>{item.category}</span>
                <span className="capitalize">{item.type}</span>
                <span
                  className={item.published ? "text-sky-800" : "text-slate-500"}
                >
                  {item.published ? "Published" : "Unpublished"}
                </span>
              </div>
              <h3 className="mt-2 break-words text-lg font-bold">
                {item.title}
              </h3>
              <p className="mt-1 break-all text-xs text-slate-500">
                {item.slug}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                {[
                  ["Published", item.publishedAt],
                  ["Reviewed", item.reviewedAt],
                  [
                    "Reading time",
                    item.readingTime === null
                      ? null
                      : `${item.readingTime} min`,
                  ],
                  ["Sort order", item.sortOrder],
                  ["Updated", new Date(item.updatedAt).toLocaleDateString()],
                ]
                  .filter(([, v]) => v !== null)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd className="mt-1 font-medium">{value}</dd>
                    </div>
                  ))}
              </dl>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => open({ kind: "edit", item })}
                >
                  <Pencil aria-hidden />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  aria-label={`Delete ${item.title}`}
                  onClick={() => open({ kind: "delete", item })}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
      {action ? (
        <ResourceAction
          key={
            action.kind === "create" ? "create" : action.item.id + action.kind
          }
          action={action}
          close={() => setAction(null)}
          refresh={() => router.invalidate()}
          restoreFocus={restoreFocus}
        />
      ) : null}
    </>
  );
}

function ResourceAction({
  action,
  close,
  refresh,
  restoreFocus,
}: {
  action: Action;
  close: () => void;
  refresh: () => Promise<void>;
  restoreFocus: () => void;
}) {
  const create = useServerFn(createResourceServerFn),
    update = useServerFn(updateResourceServerFn),
    remove = useServerFn(deleteResourceServerFn);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const [slug, setSlug] = useState(
    action.kind === "create" ? "" : action.item.slug,
  );
  const slugTouched = useRef(false);
  const item = action.kind === "create" ? null : action.item;
  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      let result;
      if (action.kind === "delete")
        result = await remove({ data: { id: action.item.id } });
      else {
        const form = new FormData(event!.currentTarget);
        const metadata = {
          title: form.get("title"),
          slug,
          excerpt: form.get("excerpt"),
          content: form.get("content"),
          category: form.get("category"),
          type: form.get("type"),
          readingTime: form.get("readingTime")
            ? Number(form.get("readingTime"))
            : null,
          sortOrder: form.get("sortOrder") || null,
          publishedAt: form.get("publishedAt") || null,
          reviewedAt: form.get("reviewedAt") || null,
          published: form.get("published") === "on",
        };
        result =
          action.kind === "create"
            ? await create({ data: metadata })
            : await update({ data: { id: action.item.id, metadata } });
      }
      if (!result.success) {
        setError(
          result.code === "SLUG_ALREADY_EXISTS"
            ? "Slug already exists. Choose another slug."
            : result.code === "INVALID_RESOURCE_DATA"
              ? "Check the required fields, slug, numbers and dates."
              : result.code === "UNAUTHORIZED"
                ? "Your session has expired. Please sign in again."
                : "Resource could not be saved. Please try again.",
        );
        return;
      }
      await refresh();
      toast.success(
        action.kind === "delete" ? "Resource deleted." : "Resource saved.",
      );
      close();
    } catch {
      setError("Resource could not be saved. Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const feedback = error ? (
    <p role="alert" className="text-sm text-red-700">
      {error}
    </p>
  ) : null;
  if (action.kind === "delete")
    return (
      <AlertDialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) close();
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resource?</AlertDialogTitle>
            <AlertDialogDescription>
              {action.item.title} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {feedback}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => submit()}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Trash2 aria-hidden />
              )}
              {busy ? "Deleting…" : "Delete Resource"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-2xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {action.kind === "create" ? "Create Resource" : "Edit Resource"}
          </DialogTitle>
          <DialogDescription>Article and guide details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="grid gap-4">
            {fields.map(([name, label, type, max]) => (
              <label
                key={name}
                className="grid min-w-0 gap-2 text-sm font-medium"
                htmlFor={`resource-${name}`}
              >
                {label}
                {type === "textarea" ? (
                  <textarea
                    aria-label={label}
                    id={`resource-${name}`}
                    name={name}
                    required
                    rows={name === "content" ? 9 : 3}
                    maxLength={max}
                    defaultValue={item?.[name] ?? ""}
                    className={inputClass}
                  />
                ) : (
                  <input
                    id={`resource-${name}`}
                    name={name}
                    type={type}
                    required={["title", "slug", "category"].includes(name)}
                    maxLength={max || undefined}
                    min={name === "readingTime" ? 1 : undefined}
                    step={type === "number" ? 1 : undefined}
                    pattern={
                      name === "slug" ? "[a-z0-9]+(?:-[a-z0-9]+)*" : undefined
                    }
                    value={name === "slug" ? slug : undefined}
                    defaultValue={
                      name === "slug" ? undefined : (item?.[name] ?? "")
                    }
                    className={inputClass}
                    onChange={(event) => {
                      if (name === "slug") {
                        slugTouched.current = true;
                        setSlug(event.target.value);
                      }
                      if (
                        name === "title" &&
                        action.kind === "create" &&
                        !slugTouched.current
                      )
                        setSlug(suggestSlug(event.target.value));
                    }}
                  />
                )}
              </label>
            ))}
            <label
              className="grid gap-2 text-sm font-medium"
              htmlFor="resource-type"
            >
              Type
              <select
                id="resource-type"
                aria-label="Type"
                name="type"
                defaultValue={item?.type ?? "article"}
                className={inputClass}
              >
                <option value="article">Article</option>
                <option value="guide">Guide</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="published"
                defaultChecked={item?.published ?? true}
              />
              Published
            </label>
            {feedback}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit">
                {busy ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : null}
                {busy ? "Saving…" : "Save Resource"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
