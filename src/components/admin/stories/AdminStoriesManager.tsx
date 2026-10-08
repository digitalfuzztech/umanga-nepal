import { useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  ImageOff,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
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
  createStoryServerFn,
  deleteStoryServerFn,
  listStoriesServerFn,
  replaceStoryImageServerFn,
  updateStoryServerFn,
} from "@/lib/admin-stories-server-functions";

type ListResult = Awaited<ReturnType<typeof listStoriesServerFn>>;
type Story = Extract<ListResult, { success: true }>["items"][number];
type Values = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  attribution: string;
  storyDate: string;
  demoContent: boolean;
  published: boolean;
  sortOrder: string;
};
type Errors = Partial<Record<keyof Values | "image", string>>;
type Action =
  { kind: "create" } | { kind: "edit" | "replace" | "delete"; item: Story };
const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100";
const empty = (): Values => ({
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "",
  attribution: "",
  storyDate: "",
  demoContent: false,
  published: true,
  sortOrder: "",
});
function fromStory(item: Story): Values {
  return {
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt,
    content: item.content,
    category: item.category,
    attribution: item.attribution,
    storyDate: item.storyDate ?? "",
    demoContent: item.demoContent,
    published: item.published,
    sortOrder: item.sortOrder === null ? "" : String(item.sortOrder),
  };
}
function suggestSlug(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 191)
    .replace(/-+$/g, "");
}
function validate(values: Values): Errors {
  const errors: Errors = {};
  for (const [key, label, maximum] of [
    ["title", "Title", 255],
    ["slug", "Slug", 191],
    ["excerpt", "Excerpt", 5000],
    ["content", "Story Content", 200000],
    ["category", "Category", 100],
    ["attribution", "Attribution", 255],
  ] as const) {
    if (!values[key].trim()) errors[key] = `${label} is required.`;
    else if (values[key].trim().length > maximum)
      errors[key] =
        `${label} must be ${maximum.toLocaleString("en-US")} characters or fewer.`;
  }
  if (
    values.slug.trim() &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug.trim())
  )
    errors.slug =
      "Use lowercase letters, numbers, and single hyphens between words.";
  if (values.storyDate) {
    const date = new Date(`${values.storyDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(values.storyDate) ||
      Number(values.storyDate.slice(0, 4)) < 1000 ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== values.storyDate
    )
      errors.storyDate = "Enter a valid calendar date.";
  }
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
function imageError(file: File | null): string | undefined {
  if (!file || file.size === 0) return "Choose an image.";
  if (file.size > 8 * 1024 * 1024) return "Image must be 8 MB or smaller.";
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Use JPEG, PNG, or WebP.";
  return undefined;
}

export function AdminStoriesManager({
  initialResult,
}: {
  initialResult: ListResult;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const [action, setAction] = useState<Action | null>(null);
  const actionOpener = useRef<HTMLElement | null>(null);
  const addButton = useRef<HTMLButtonElement | null>(null);
  const openAction = (next: Action) => {
    actionOpener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setAction(next);
  };
  const restoreFocus = () => {
    const target = actionOpener.current?.isConnected
      ? actionOpener.current
      : addButton.current;
    target?.focus();
  };
  const items = initialResult.success ? initialResult.items : [];
  const refresh = () => router.invalidate();
  return (
    <>
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
            Umanga Nepal Admin
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-slate-950">
            Stories
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Manage community and organizational stories.
          </p>
          {initialResult.success ? (
            <p className="mt-2 text-xs font-medium text-slate-500">
              {items.length} {items.length === 1 ? "Story" : "Stories"}
            </p>
          ) : null}
        </div>
        <Button
          ref={addButton}
          className="w-full rounded-xl sm:w-auto"
          onClick={() => openAction({ kind: "create" })}
        >
          <Plus aria-hidden />
          Add Story
        </Button>
      </div>
      {!initialResult.success ? (
        <section
          role="alert"
          className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5"
        >
          <h3 className="font-bold text-red-950">
            Stories could not be loaded.
          </h3>
          <p className="mt-2 text-sm text-red-800">
            Please refresh and try again.
          </p>
          <Button variant="outline" className="mt-4" onClick={refresh}>
            <RefreshCw aria-hidden />
            Try Again
          </Button>
        </section>
      ) : !items.length ? (
        <section className="mt-7 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <BookOpen className="size-10 text-sky-700" aria-hidden />
          <h3 className="mt-5 font-display text-xl font-bold text-slate-950">
            No Stories have been added yet.
          </h3>
          <Button
            className="mt-6 rounded-xl"
            onClick={() => openAction({ kind: "create" })}
          >
            <Plus aria-hidden />
            Add Story
          </Button>
        </section>
      ) : (
        <section
          aria-label="Stories"
          className="mt-7 grid gap-5 xl:grid-cols-2"
        >
          {items.map((item) => (
            <StoryCard
              key={item.id}
              item={item}
              onAction={(kind) => openAction({ kind, item })}
            />
          ))}
        </section>
      )}
      {action ? (
        <StoryActionDialog
          action={action}
          onClose={() => setAction(null)}
          onReturnFocus={restoreFocus}
          onSuccess={refresh}
          onUnauthorized={() => navigate({ to: "/admin", replace: true })}
        />
      ) : null}
    </>
  );
}

function Thumbnail({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return failedSource === src ? (
    <div
      className={`${className} flex items-center justify-center bg-slate-100 text-slate-400`}
      role="img"
      aria-label={`Preview unavailable for ${title}`}
    >
      <ImageOff className="size-8" aria-hidden />
    </div>
  ) : (
    <img
      src={src}
      alt={title}
      className={`${className} bg-slate-100 object-cover`}
      onError={() => setFailedSource(src)}
    />
  );
}
function StoryCard({
  item,
  onAction,
}: {
  item: Story;
  onAction: (kind: "edit" | "replace" | "delete") => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_-38px_rgba(8,47,73,0.5)] sm:grid sm:grid-cols-[11rem_minmax(0,1fr)]">
      <Thumbnail
        src={item.imageUrl}
        title={item.title}
        className="h-48 w-full sm:h-full sm:min-h-64"
      />
      <div className="min-w-0 p-5">
        <p className="break-words text-xs font-bold uppercase text-sky-700">
          {item.category}
        </p>
        <h3 className="mt-1 break-words font-display text-lg font-bold text-slate-950">
          {item.title}
        </h3>
        <p className="mt-1 break-all text-xs text-slate-500">
          /stories/{item.slug}
        </p>
        <p className="mt-2 break-words text-sm text-slate-600">
          {item.attribution}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={
              item.published
                ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
                : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
            }
          >
            {item.published ? "Published" : "Unpublished"}
          </span>
          {item.demoContent ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
              Demo Content
            </span>
          ) : null}
        </div>
        <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-slate-600">
          {item.excerpt}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
          {item.storyDate ? (
            <span>
              Story Date:{" "}
              {new Date(`${item.storyDate}T12:00:00Z`).toLocaleDateString(
                "en-GB",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                },
              )}
            </span>
          ) : null}
          {item.sortOrder !== null ? (
            <span>Sort order: {item.sortOrder}</span>
          ) : null}
        </div>
        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg"
            onClick={() => onAction("edit")}
          >
            <Pencil aria-hidden />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg"
            onClick={() => onAction("replace")}
          >
            <RefreshCw aria-hidden />
            Replace Image
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-lg text-red-700 hover:bg-red-50"
            onClick={() => onAction("delete")}
          >
            <Trash2 aria-hidden />
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

function StoryActionDialog({
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
  const create = useServerFn(createStoryServerFn);
  const update = useServerFn(updateStoryServerFn);
  const replace = useServerFn(replaceStoryImageServerFn);
  const remove = useServerFn(deleteStoryServerFn);
  const [values, setValues] = useState<Values>(() =>
    action.kind === "create" ? empty() : fromStory(action.item),
  );
  const [manualSlug, setManualSlug] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    const nextErrors =
      action.kind === "create" || action.kind === "edit"
        ? validate(values)
        : {};
    if (action.kind === "create" || action.kind === "replace") {
      const error = imageError(file);
      if (error) nextErrors.image = error;
    }
    setErrors(nextErrors);
    setFailure(null);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      let result;
      if (action.kind === "create") {
        const form = new FormData();
        for (const [key, value] of Object.entries(values))
          form.set(key, String(value));
        form.set("image", file!);
        result = await create({ data: form });
      } else if (action.kind === "edit")
        result = await update({
          data: {
            id: action.item.id,
            metadata: {
              ...values,
              storyDate: values.storyDate || null,
              sortOrder: values.sortOrder.trim() || null,
            },
          },
        });
      else if (action.kind === "replace") {
        const form = new FormData();
        form.set("id", action.item.id);
        form.set("image", file!);
        result = await replace({ data: form });
      } else result = await remove({ data: { id: action.item.id } });
      if (!result.success) {
        if (result.code === "UNAUTHORIZED") {
          await onUnauthorized();
          return;
        }
        setFailure(
          result.code === "SLUG_ALREADY_EXISTS"
            ? "That Story URL slug is already in use. Choose another slug."
            : result.error,
        );
        return;
      }
      const cleanupWarning =
        "cleanupWarning" in result && result.cleanupWarning;
      const message =
        action.kind === "create"
          ? "Story created successfully."
          : action.kind === "edit"
            ? "Story updated successfully."
            : action.kind === "replace"
              ? "Image updated successfully."
              : "Story deleted successfully.";
      if (cleanupWarning)
        toast.warning(
          action.kind === "replace"
            ? "Image updated successfully, but old media cleanup needs attention."
            : "Story deleted, but old media cleanup needs attention.",
        );
      else toast.success(message);
      onClose();
      await onSuccess();
    } catch {
      setFailure("This action could not be completed. Please try again.");
    } finally {
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
          className="w-[calc(100%-1.5rem)] rounded-2xl sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onReturnFocus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">
              Delete “{action.item.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The Story and its associated image will be removed. This cannot be
              undone.
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
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  const title =
    action.kind === "create"
      ? "Add Story"
      : action.kind === "edit"
        ? "Edit Story"
        : "Replace Image";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-3xl sm:p-6"
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {action.kind === "replace"
              ? "Choose a new Story image. The current image will be replaced after saving."
              : "Manage Story content and publication details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="mt-3 space-y-5">
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            {action.kind !== "replace" ? (
              <StoryFields
                values={values}
                errors={errors}
                onChange={(key, value) => {
                  setValues((current) => ({
                    ...current,
                    [key]: value,
                    ...(key === "title" &&
                    action.kind === "create" &&
                    !manualSlug
                      ? { slug: suggestSlug(String(value)) }
                      : {}),
                  }));
                  if (key === "slug") setManualSlug(true);
                }}
              />
            ) : (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">
                  Current image
                </p>
                <Thumbnail
                  src={action.item.imageUrl}
                  title={action.item.title}
                  className="max-h-56 w-full rounded-xl"
                />
              </div>
            )}
            {action.kind === "create" || action.kind === "replace" ? (
              <div>
                <label
                  htmlFor="story-image"
                  className="text-sm font-semibold text-slate-800"
                >
                  {action.kind === "create" ? "Image" : "New Image"}{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  id="story-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={inputClass}
                  aria-invalid={Boolean(errors.image)}
                  aria-describedby={
                    errors.image
                      ? "story-image-help story-image-error"
                      : "story-image-help"
                  }
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <p
                  id="story-image-help"
                  className="mt-2 text-xs text-slate-500"
                >
                  JPEG, PNG or WebP. Maximum 8 MB.
                </p>
                {errors.image ? (
                  <p
                    id="story-image-error"
                    role="alert"
                    className="mt-2 text-xs text-red-700"
                  >
                    {errors.image}
                  </p>
                ) : null}
                {file && preview ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                    <img
                      src={preview}
                      alt="Selected image preview"
                      className="max-h-64 w-full object-contain"
                    />
                    <p className="break-all border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
                      {file.name}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
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
              ) : action.kind === "replace" ? (
                <ImagePlus aria-hidden />
              ) : (
                <Pencil aria-hidden />
              )}
              {busy
                ? action.kind === "create"
                  ? "Creating…"
                  : action.kind === "edit"
                    ? "Saving…"
                    : "Replacing…"
                : action.kind === "create"
                  ? "Create Story"
                  : action.kind === "edit"
                    ? "Save Changes"
                    : "Replace Image"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StoryFields({
  values,
  errors,
  onChange,
}: {
  values: Values;
  errors: Errors;
  onChange: <K extends keyof Values>(key: K, value: Values[K]) => void;
}) {
  function field(
    key:
      | "title"
      | "slug"
      | "excerpt"
      | "content"
      | "category"
      | "attribution"
      | "storyDate"
      | "sortOrder",
    label: string,
    options: { rows?: number; max?: number; help?: string; type?: string } = {},
  ) {
    const id = `story-${key}`;
    const required = key !== "storyDate" && key !== "sortOrder";
    const shared = {
      id,
      value: values[key],
      className: inputClass,
      required,
      "aria-invalid": Boolean(errors[key]),
      "aria-describedby":
        [
          options.help || options.max ? `${id}-help` : null,
          errors[key] ? `${id}-error` : null,
        ]
          .filter(Boolean)
          .join(" ") || undefined,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange(key, event.target.value),
    };
    return (
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800">
          {label}
          {required ? (
            <span className="ml-1 text-red-600">*</span>
          ) : (
            <span className="ml-1 font-normal text-slate-500">(optional)</span>
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
        {options.help || options.max ? (
          <div
            id={`${id}-help`}
            className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-slate-500"
          >
            {options.help ? <span>{options.help}</span> : null}
            {options.max ? (
              <span>
                {values[key].length.toLocaleString("en-US")} /{" "}
                {options.max.toLocaleString("en-US")}
              </span>
            ) : null}
          </div>
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
    <>
      {field("title", "Title")}
      {field("slug", "Slug", {
        help: "Used in the public Story URL. Use lowercase letters, numbers and hyphens.",
      })}
      {field("excerpt", "Excerpt", { rows: 3, max: 5000 })}
      {field("content", "Story Content", {
        rows: 10,
        max: 200000,
        help: "Separate paragraphs with a blank line.",
      })}
      <div className="grid gap-5 sm:grid-cols-2">
        {field("category", "Category")}
        {field("attribution", "Attribution")}
        {field("storyDate", "Story Date", { type: "date" })}
        {field("sortOrder", "Sort Order", {
          type: "number",
          help: "Lower numbers appear first.",
        })}
      </div>
      <div className="flex flex-wrap gap-6">
        {(["demoContent", "published"] as const).map((key) => (
          <label
            key={key}
            className="flex items-center gap-3 text-sm font-semibold text-slate-800"
          >
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              checked={values[key]}
              onChange={(event) => onChange(key, event.target.checked)}
            />
            {key === "demoContent" ? "Demo Content" : "Published"}
          </label>
        ))}
      </div>
    </>
  );
}
