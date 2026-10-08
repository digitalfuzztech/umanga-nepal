import { useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createEventServerFn,
  deleteEventServerFn,
  listEventsServerFn,
  updateEventServerFn,
} from "@/lib/admin-events-server-functions";
import {
  chronology,
  inputClass,
  isCalendarDate,
  suggestSlug,
} from "./news-events-ui";

type ListResult = Awaited<ReturnType<typeof listEventsServerFn>>;
type EventRecord = Extract<ListResult, { success: true }>["items"][number];
type Values = {
  title: string;
  slug: string;
  summary: string;
  category: string;
  eventStart: string;
  location: string;
  registrationOpen: boolean;
  demoContent: boolean;
  published: boolean;
  sortOrder: string;
};
type Errors = Partial<Record<keyof Values, string>>;
type Action =
  { kind: "create" } | { kind: "edit" | "delete"; item: EventRecord };
const empty = (): Values => ({
  title: "",
  slug: "",
  summary: "",
  category: "",
  eventStart: "",
  location: "",
  registrationOpen: false,
  demoContent: false,
  published: true,
  sortOrder: "",
});
function fromEvent(item: EventRecord): Values {
  return {
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    category: item.category,
    eventStart: item.eventStart,
    location: item.location,
    registrationOpen: item.registrationOpen,
    demoContent: item.demoContent,
    published: item.published,
    sortOrder: item.sortOrder === null ? "" : String(item.sortOrder),
  };
}
function validate(values: Values): Errors {
  const errors: Errors = {};
  for (const [key, label, maximum] of [
    ["title", "Title", 255],
    ["slug", "Slug", 191],
    ["summary", "Summary", 5000],
    ["category", "Category", 100],
    ["location", "Location", 255],
  ] as const) {
    if (!values[key].trim()) errors[key] = `${label} is required.`;
    else if (values[key].trim().length > maximum)
      errors[key] = `${label} must be ${maximum} characters or fewer.`;
  }
  if (
    values.slug.trim() &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug.trim())
  )
    errors.slug =
      "Use lowercase letters, numbers, and single hyphens between words.";
  if (!isCalendarDate(values.eventStart))
    errors.eventStart = "Enter a valid calendar date.";
  if (
    values.sortOrder.trim() &&
    (!/^-?\d+$/.test(values.sortOrder.trim()) ||
      Number(values.sortOrder) < -2147483648 ||
      Number(values.sortOrder) > 2147483647)
  )
    errors.sortOrder =
      "Enter a whole number between -2147483648 and 2147483647.";
  return errors;
}

export function AdminEventsManager({
  initialResult,
  today,
}: {
  initialResult: ListResult;
  today: string;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const [action, setAction] = useState<Action | null>(null);
  const actionOpener = useRef<HTMLElement | null>(null);
  const addButton = useRef<HTMLButtonElement | null>(null);
  const items = initialResult.success ? initialResult.items : [];
  function openAction(next: Action) {
    actionOpener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setAction(next);
  }
  function restoreFocus() {
    (actionOpener.current?.isConnected
      ? actionOpener.current
      : addButton.current
    )?.focus();
  }
  return (
    <>
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-950">
            Events
          </h3>
          {initialResult.success ? (
            <p className="mt-2 text-xs font-medium text-slate-500">
              {items.length} {items.length === 1 ? "Event" : "Events"}
            </p>
          ) : null}
        </div>
        <Button
          ref={addButton}
          className="w-full rounded-xl sm:w-auto"
          onClick={() => openAction({ kind: "create" })}
        >
          <Plus aria-hidden />
          Create Event
        </Button>
      </div>
      {!initialResult.success ? (
        <section
          role="alert"
          className="mt-7 border border-red-200 bg-red-50 p-5"
        >
          <h3 className="font-bold text-red-950">
            Events could not be loaded.
          </h3>
          <p className="mt-2 text-sm text-red-800">
            Please refresh and try again.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.invalidate()}
          >
            <RefreshCw aria-hidden />
            Try Again
          </Button>
        </section>
      ) : !items.length ? (
        <section className="mt-7 flex min-h-64 flex-col items-center justify-center border-y border-dashed border-slate-300 px-6 py-10 text-center">
          <CalendarDays className="size-10 text-sky-700" aria-hidden />
          <h3 className="mt-5 font-display text-xl font-bold text-slate-950">
            No events yet.
          </h3>
          <Button
            className="mt-6 rounded-xl"
            onClick={() => openAction({ kind: "create" })}
          >
            <Plus aria-hidden />
            Create Event
          </Button>
        </section>
      ) : (
        <section aria-label="Events" className="mt-7 grid gap-5 xl:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5"
            >
              <p className="break-words text-xs font-bold uppercase text-sky-700">
                {item.category}
              </p>
              <h3 className="mt-1 break-words font-display text-lg font-bold text-slate-950">
                {item.title}
              </h3>
              <p className="mt-1 break-all text-xs text-slate-500">
                {item.slug}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">
                  {chronology(item.eventStart, today)}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                  {item.registrationOpen
                    ? "Registration Open"
                    : "Registration Closed"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 ${item.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {item.published ? "Published" : "Unpublished"}
                </span>
                {item.demoContent ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                    Demo Content
                  </span>
                ) : null}
              </div>
              <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-slate-600">
                {item.summary}
              </p>
              <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                <div>
                  <dt className="inline font-semibold">Event Date: </dt>
                  <dd className="inline">
                    <time dateTime={item.eventStart}>{item.eventStart}</time>
                  </dd>
                </div>
                <div className="min-w-0 break-words">
                  <dt className="inline font-semibold">Location: </dt>
                  <dd className="inline">{item.location}</dd>
                </div>
                {item.sortOrder !== null ? (
                  <div>
                    <dt className="inline font-semibold">Sort order: </dt>
                    <dd className="inline">{item.sortOrder}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openAction({ kind: "edit", item })}
                >
                  <Pencil aria-hidden />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-700 hover:bg-red-50"
                  onClick={() => openAction({ kind: "delete", item })}
                >
                  <Trash2 aria-hidden />
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
      {action ? (
        <EventActionDialog
          action={action}
          onClose={() => setAction(null)}
          onReturnFocus={restoreFocus}
          onSuccess={() => router.invalidate()}
          onUnauthorized={() => navigate({ to: "/admin", replace: true })}
        />
      ) : null}
    </>
  );
}

function EventActionDialog({
  action,
  onClose,
  onReturnFocus,
  onSuccess,
  onUnauthorized,
}: {
  action: Action;
  onClose: () => void;
  onReturnFocus: () => void;
  onSuccess: () => Promise<void>;
  onUnauthorized: () => Promise<unknown>;
}) {
  const create = useServerFn(createEventServerFn);
  const update = useServerFn(updateEventServerFn);
  const remove = useServerFn(deleteEventServerFn);
  const [values, setValues] = useState<Values>(() =>
    action.kind === "create" ? empty() : fromEvent(action.item),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [manualSlug, setManualSlug] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (submitting.current) return;
    const nextErrors = action.kind === "delete" ? {} : validate(values);
    setErrors(nextErrors);
    setFailure(null);
    if (Object.keys(nextErrors).length) return;
    submitting.current = true;
    setBusy(true);
    try {
      const metadata = {
        ...values,
        sortOrder: values.sortOrder.trim() || null,
      };
      const result =
        action.kind === "create"
          ? await create({ data: metadata })
          : action.kind === "edit"
            ? await update({ data: { id: action.item.id, metadata } })
            : await remove({ data: { id: action.item.id } });
      if (!result.success) {
        if (result.code === "UNAUTHORIZED") {
          await onUnauthorized();
          return;
        }
        setFailure(
          result.code === "SLUG_ALREADY_EXISTS"
            ? "That Event slug is already in use. Choose another slug."
            : result.error,
        );
        return;
      }
      toast.success(
        action.kind === "create"
          ? "Event created successfully."
          : action.kind === "edit"
            ? "Event updated successfully."
            : "Event deleted successfully.",
      );
      onClose();
      await onSuccess();
    } catch {
      setFailure("This action could not be completed. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const errorPanel = failure ? (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {failure}
    </p>
  ) : null;
  if (action.kind === "delete")
    return (
      <AlertDialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) onClose();
        }}
      >
        <AlertDialogContent
          className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onReturnFocus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">
              Delete "{action.item.title}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The Event will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {errorPanel}
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
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  function field(
    key:
      | "title"
      | "slug"
      | "summary"
      | "category"
      | "eventStart"
      | "location"
      | "sortOrder",
    label: string,
    options: { rows?: number; type?: string; help?: string } = {},
  ) {
    const id = `event-${key}`;
    const shared = {
      id,
      value: values[key],
      className: inputClass,
      required: key !== "sortOrder",
      "aria-invalid": Boolean(errors[key]),
      "aria-describedby":
        [options.help ? `${id}-help` : null, errors[key] ? `${id}-error` : null]
          .filter(Boolean)
          .join(" ") || undefined,
      onChange: (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        const value = event.target.value;
        setValues((current) => ({
          ...current,
          [key]: value,
          ...(key === "title" && action.kind === "create" && !manualSlug
            ? { slug: suggestSlug(value) }
            : {}),
        }));
        if (key === "slug") setManualSlug(true);
      },
    };
    return (
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800">
          {label}
          {key === "sortOrder" ? (
            <span className="ml-1 font-normal text-slate-500">(optional)</span>
          ) : (
            <span className="ml-1 text-red-600">*</span>
          )}
        </label>
        {options.rows ? (
          <textarea
            {...shared}
            rows={options.rows}
            className={`${inputClass} resize-y leading-6`}
          />
        ) : (
          <input {...shared} type={options.type ?? "text"} />
        )}
        {options.help ? (
          <p id={`${id}-help`} className="mt-2 text-xs text-slate-500">
            {options.help}
          </p>
        ) : null}
        {key === "summary" ? (
          <p className="mt-2 text-xs text-slate-500">
            {values.summary.length.toLocaleString("en-US")} / 5,000
          </p>
        ) : null}
        {errors[key] ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-2 text-xs text-red-700"
          >
            {errors[key]}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-2xl sm:p-6"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {action.kind === "create" ? "Create Event" : "Edit Event"}
          </DialogTitle>
          <DialogDescription>
            Manage event information and publication details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="mt-3 space-y-5">
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            {field("title", "Title")}
            {field("slug", "Slug", {
              help: "Stable identifier. Use lowercase letters, numbers and hyphens.",
            })}
            {field("summary", "Summary", { rows: 4 })}
            <div className="grid gap-5 sm:grid-cols-2">
              {field("category", "Category")}
              {field("eventStart", "Event Date", { type: "date" })}
              {field("location", "Location")}
              {field("sortOrder", "Sort Order", {
                type: "number",
                help: "Lower numbers appear first.",
              })}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-4">
              {(["registrationOpen", "published", "demoContent"] as const).map(
                (key) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 text-sm font-semibold text-slate-800"
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      checked={values[key]}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                    />
                    {key === "registrationOpen"
                      ? "Registration Open"
                      : key === "published"
                        ? "Published"
                        : "Demo Content"}
                  </label>
                ),
              )}
            </div>
          </fieldset>
          {errorPanel}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Pencil aria-hidden />
              )}
              {busy
                ? action.kind === "create"
                  ? "Creating..."
                  : "Saving..."
                : action.kind === "create"
                  ? "Create Event"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
