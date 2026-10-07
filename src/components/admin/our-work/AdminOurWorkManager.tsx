import { useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  HeartHandshake,
  ImageOff,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  createOurWorkItemServerFn,
  deleteOurWorkItemServerFn,
  replaceOurWorkImageServerFn,
  updateOurWorkItemServerFn,
} from "@/lib/admin-our-work-server-functions";

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100";

export type AdminOurWorkItem = {
  id: string;
  slug: string;
  type: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl: string;
  imageStorageKey: string;
  aboutProgram: string | null;
  whatWeCover: string[];
  awarenessSessionCount: number | null;
  participantCount: number | null;
  published: boolean;
  sortOrder: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OurWorkListResult =
  | { success: true; items: AdminOurWorkItem[] }
  | { success: false; code: string; error: string };

type MetadataValues = {
  slug: string;
  type: string;
  title: string;
  description: string;
  tags: string[];
  aboutProgram: string;
  whatWeCover: string[];
  awarenessSessionCount: string;
  participantCount: string;
  published: boolean;
  sortOrder: string;
};

type FieldName =
  | "slug"
  | "type"
  | "title"
  | "description"
  | "tags"
  | "aboutProgram"
  | "whatWeCover"
  | "awarenessSessionCount"
  | "participantCount"
  | "sortOrder"
  | "image";
type FieldErrors = Partial<Record<FieldName, string>>;

export function AdminOurWorkManager({
  initialResult,
}: {
  initialResult: OurWorkListResult;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminOurWorkItem | null>(null);
  const [replacingItem, setReplacingItem] = useState<AdminOurWorkItem | null>(
    null,
  );
  const [deletingItem, setDeletingItem] = useState<AdminOurWorkItem | null>(
    null,
  );
  const items = initialResult.success ? initialResult.items : [];

  async function refreshList() {
    await router.invalidate();
  }

  async function handleUnauthorized() {
    await navigate({ to: "/admin", replace: true });
  }

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
            Umanga Nepal Admin
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-950">
            Our Work
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Manage Umanga Nepal programs and initiatives.
          </p>
          {initialResult.success ? (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              {items.length} {items.length === 1 ? "item" : "items"}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          className="w-full rounded-xl sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus aria-hidden />
          Add Our Work
        </Button>
      </div>

      {!initialResult.success ? (
        <LoadError onRetry={refreshList} />
      ) : items.length === 0 ? (
        <OurWorkEmptyState onAdd={() => setCreateOpen(true)} />
      ) : (
        <section
          className="mt-7 grid gap-5 xl:grid-cols-2"
          aria-label="Our Work items"
        >
          {items.map((item) => (
            <OurWorkItemCard
              key={item.id}
              item={item}
              onEdit={() => setEditingItem(item)}
              onReplace={() => setReplacingItem(item)}
              onDelete={() => setDeletingItem(item)}
            />
          ))}
        </section>
      )}

      <CreateOurWorkDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={refreshList}
        onUnauthorized={handleUnauthorized}
      />
      <EditOurWorkDialog
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={refreshList}
        onUnauthorized={handleUnauthorized}
      />
      <ReplaceOurWorkImageDialog
        item={replacingItem}
        onClose={() => setReplacingItem(null)}
        onSuccess={refreshList}
        onUnauthorized={handleUnauthorized}
      />
      <DeleteOurWorkDialog
        item={deletingItem}
        onClose={() => setDeletingItem(null)}
        onSuccess={refreshList}
        onUnauthorized={handleUnauthorized}
      />
    </>
  );
}

function LoadError({ onRetry }: { onRetry: () => Promise<void> }) {
  return (
    <section
      className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5"
      role="alert"
    >
      <h3 className="font-bold text-red-950">Our Work could not be loaded.</h3>
      <p className="mt-1 text-sm text-red-800">
        Please refresh the page and try again.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={onRetry}
      >
        <RefreshCw aria-hidden /> Try Again
      </Button>
    </section>
  );
}

function OurWorkEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="mt-7 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        <HeartHandshake className="size-7" aria-hidden />
      </span>
      <h3 className="mt-5 font-display text-xl font-bold text-slate-950">
        No Our Work programs have been added yet.
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        Add the first program, campaign, workshop, or initiative.
      </p>
      <Button type="button" className="mt-6 rounded-xl" onClick={onAdd}>
        <Plus aria-hidden /> Add Our Work
      </Button>
    </section>
  );
}

function OurWorkItemCard({
  item,
  onEdit,
  onReplace,
  onDelete,
}: {
  item: AdminOurWorkItem;
  onEdit: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const shownTags = item.tags.slice(0, 4);
  const remainingTags = item.tags.length - shownTags.length;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_-38px_rgba(8,47,73,0.5)] sm:grid sm:grid-cols-[12rem_minmax(0,1fr)]">
      <OurWorkThumbnail item={item} />
      <div className="min-w-0 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
              {item.type}
            </p>
            <h3 className="mt-1 break-words font-display text-lg font-bold text-slate-950">
              {item.title}
            </h3>
            <p className="mt-1 break-all text-xs text-slate-500">
              /our-work/{item.slug}
            </p>
          </div>
          <StatusBadge published={item.published} />
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
          {item.description}
        </p>
        {shownTags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
            {shownTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700"
              >
                {tag}
              </span>
            ))}
            {remainingTags > 0 ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                +{remainingTags}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
          {item.awarenessSessionCount !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <BarChart3 className="size-3.5" aria-hidden />
              {item.awarenessSessionCount} sessions
            </span>
          ) : null}
          {item.participantCount !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden />
              {item.participantCount} participants
            </span>
          ) : null}
          {item.sortOrder !== null ? (
            <span>Sort order: {item.sortOrder}</span>
          ) : null}
        </div>
        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg"
            onClick={onEdit}
          >
            <Pencil aria-hidden /> Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg"
            onClick={onReplace}
          >
            <RefreshCw aria-hidden /> Replace Image
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-lg text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={onDelete}
          >
            <Trash2 aria-hidden /> Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

function OurWorkThumbnail({ item }: { item: AdminOurWorkItem }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="flex min-h-48 items-center justify-center bg-slate-100 text-slate-400 sm:min-h-full"
        role="img"
        aria-label={`Preview unavailable for ${item.title}`}
      >
        <ImageOff className="size-8" aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={item.imageUrl}
      alt=""
      className="h-48 w-full bg-slate-100 object-cover sm:h-full sm:min-h-64"
      onError={() => setFailed(true)}
    />
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={
        published
          ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
          : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
      }
    >
      {published ? "Published" : "Unpublished"}
    </span>
  );
}

function CreateOurWorkDialog({
  open,
  onOpenChange,
  onSuccess,
  onUnauthorized,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
  onUnauthorized: () => Promise<void>;
}) {
  const createItem = useServerFn(createOurWorkItemServerFn);
  const [values, setValues] = useState<MetadataValues>(emptyMetadata());
  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const previewUrl = useImagePreview(image);

  function reset() {
    setValues(emptyMetadata());
    setImage(null);
    setErrors({});
    setFormError(null);
    setSlugManuallyEdited(false);
  }

  function changeOpen(nextOpen: boolean) {
    if (submitting) return;
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = validateMetadata(values);
    const imageError = validateImage(image);
    if (imageError) nextErrors.image = imageError;
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length || !image) return;

    const data = metadataFormData(values);
    data.append("image", image);
    setSubmitting(true);
    try {
      const result = await createItem({ data });
      if (!result.success) {
        if (result.code === "UNAUTHORIZED")
          return void (await onUnauthorized());
        setFormError(messageForFailure(result.code, "create"));
        return;
      }
      onOpenChange(false);
      reset();
      await onSuccess();
      toast.success("Our Work item added successfully.");
    } catch {
      setFormError("Unable to add the Our Work item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-3xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Add Our Work</DialogTitle>
          <DialogDescription>
            Add a program or initiative and its public-facing details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <div className="space-y-5 py-2">
            <MetadataFields
              values={values}
              onChange={setValues}
              errors={errors}
              disabled={submitting}
              prefix="create-our-work"
              onTitleChange={(title) =>
                setValues((current) => ({
                  ...current,
                  title,
                  slug: slugManuallyEdited ? current.slug : suggestSlug(title),
                }))
              }
              onSlugChange={(slug) => {
                setSlugManuallyEdited(true);
                setValues((current) => ({ ...current, slug }));
              }}
            />
            <ImageField
              id="create-our-work-image"
              file={image}
              previewUrl={previewUrl}
              error={errors.image}
              disabled={submitting}
              onChange={(file) => {
                setImage(file);
                clearFieldError(setErrors, "image");
              }}
            />
            {formError ? <FormError message={formError} /> : null}
          </div>
          <DialogFooter className="mt-6 gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={submitting}
              onClick={() => changeOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={submitting}>
              {submitting ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Plus aria-hidden />
              )}
              {submitting ? "Creating…" : "Add Our Work"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditOurWorkDialog({
  item,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  item: AdminOurWorkItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onUnauthorized: () => Promise<void>;
}) {
  const updateItem = useServerFn(updateOurWorkItemServerFn);
  const [values, setValues] = useState<MetadataValues>(emptyMetadata());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!item) return;
    setValues(metadataFromItem(item));
    setErrors({});
    setFormError(null);
  }, [item]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || submitting) return;
    const nextErrors = validateMetadata(values);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    try {
      const result = await updateItem({
        data: { id: item.id, metadata: values },
      });
      if (!result.success) {
        if (result.code === "UNAUTHORIZED")
          return void (await onUnauthorized());
        setFormError(messageForFailure(result.code, "update"));
        if (result.code === "NOT_FOUND") await onSuccess();
        return;
      }
      onClose();
      await onSuccess();
      toast.success("Our Work item updated successfully.");
    } catch {
      setFormError("Unable to update the Our Work item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => !open && !submitting && onClose()}
    >
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-3xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Our Work</DialogTitle>
          <DialogDescription>
            Update program details without changing its image.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <div className="space-y-5 py-2">
            <MetadataFields
              values={values}
              onChange={setValues}
              errors={errors}
              disabled={submitting}
              prefix="edit-our-work"
            />
            {formError ? <FormError message={formError} /> : null}
          </div>
          <DialogFooter className="mt-6 gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={submitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={submitting}>
              {submitting ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Pencil aria-hidden />
              )}
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReplaceOurWorkImageDialog({
  item,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  item: AdminOurWorkItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onUnauthorized: () => Promise<void>;
}) {
  const replaceImage = useServerFn(replaceOurWorkImageServerFn);
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const previewUrl = useImagePreview(image);

  function close() {
    if (submitting) return;
    setImage(null);
    setError(null);
    setFormError(null);
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || submitting) return;
    const imageError = validateImage(image);
    setError(imageError);
    setFormError(null);
    if (imageError || !image) return;

    const data = new FormData();
    data.append("id", item.id);
    data.append("image", image);
    setSubmitting(true);
    try {
      const result = await replaceImage({ data });
      if (!result.success) {
        if (result.code === "UNAUTHORIZED")
          return void (await onUnauthorized());
        setFormError(messageForFailure(result.code, "replace"));
        if (result.code === "NOT_FOUND") await onSuccess();
        return;
      }
      setImage(null);
      setError(null);
      setFormError(null);
      onClose();
      await onSuccess();
      if (result.cleanupWarning) {
        toast.warning(
          "Image updated successfully, but old media cleanup needs attention.",
        );
      } else {
        toast.success("Our Work image replaced successfully.");
      }
    } catch {
      setFormError("Unable to replace the image. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Replace Image</DialogTitle>
          <DialogDescription>
            Upload a new image. Program metadata will remain unchanged.
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <form onSubmit={submit} noValidate>
            <div className="space-y-5 py-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Current image
                </p>
                <img
                  src={item.imageUrl}
                  alt={`Current image for ${item.title}`}
                  className="mt-2 h-36 w-full rounded-xl bg-slate-100 object-cover"
                />
              </div>
              <ImageField
                id="replacement-our-work-image"
                file={image}
                previewUrl={previewUrl}
                error={error ?? undefined}
                disabled={submitting}
                onChange={(file) => {
                  setImage(file);
                  setError(null);
                }}
              />
              {formError ? <FormError message={formError} /> : null}
            </div>
            <DialogFooter className="mt-6 gap-2 sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={submitting}
                onClick={close}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl"
                disabled={submitting}
              >
                {submitting ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : (
                  <RefreshCw aria-hidden />
                )}
                {submitting ? "Replacing…" : "Replace Image"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DeleteOurWorkDialog({
  item,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  item: AdminOurWorkItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onUnauthorized: () => Promise<void>;
}) {
  const deleteItem = useServerFn(deleteOurWorkItemServerFn);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!item || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await deleteItem({ data: { id: item.id } });
      if (!result.success) {
        if (result.code === "UNAUTHORIZED")
          return void (await onUnauthorized());
        setError(messageForFailure(result.code, "delete"));
        if (result.code === "NOT_FOUND") await onSuccess();
        return;
      }
      onClose();
      await onSuccess();
      if (result.cleanupWarning) {
        toast.warning(
          "The item was deleted, but media cleanup needs attention.",
        );
      } else {
        toast.success("Our Work item deleted successfully.");
      }
    } catch {
      setError("Unable to delete the Our Work item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open && !submitting) {
          setError(null);
          onClose();
        }
      }}
    >
      <AlertDialogContent className="w-[calc(100%-1.5rem)] rounded-2xl sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{item?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the CMS record and its associated image. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <FormError message={error} /> : null}
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel disabled={submitting} className="rounded-xl">
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            className="rounded-xl"
            disabled={submitting}
            onClick={remove}
          >
            {submitting ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Trash2 aria-hidden />
            )}
            {submitting ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MetadataFields({
  values,
  onChange,
  errors,
  disabled,
  prefix,
  onTitleChange,
  onSlugChange,
}: {
  values: MetadataValues;
  onChange: (values: MetadataValues) => void;
  errors: FieldErrors;
  disabled: boolean;
  prefix: string;
  onTitleChange?: (title: string) => void;
  onSlugChange?: (slug: string) => void;
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id={`${prefix}-type`}
          label="Type"
          value={values.type}
          maxLength={100}
          placeholder="Program, Campaign, Workshop, Initiative…"
          error={errors.type}
          disabled={disabled}
          required
          onChange={(type) => onChange({ ...values, type })}
        />
        <TextField
          id={`${prefix}-title`}
          label="Title"
          value={values.title}
          maxLength={255}
          error={errors.title}
          disabled={disabled}
          required
          onChange={(title) =>
            onTitleChange
              ? onTitleChange(title)
              : onChange({ ...values, title })
          }
        />
      </div>
      <TextField
        id={`${prefix}-slug`}
        label="Slug"
        helper="Used in the public URL. Changing it later changes the program URL."
        value={values.slug}
        maxLength={191}
        placeholder="mental-health-awareness"
        error={errors.slug}
        disabled={disabled}
        required
        onChange={(slug) =>
          onSlugChange ? onSlugChange(slug) : onChange({ ...values, slug })
        }
      />
      <TextareaField
        id={`${prefix}-description`}
        label="Description"
        helper="Short summary used on program cards."
        value={values.description}
        rows={4}
        maxLength={5000}
        error={errors.description}
        disabled={disabled}
        required
        onChange={(description) => onChange({ ...values, description })}
      />
      <TagEditor
        id={`${prefix}-tags`}
        tags={values.tags}
        error={errors.tags}
        disabled={disabled}
        onChange={(tags) => onChange({ ...values, tags })}
      />
      <TextareaField
        id={`${prefix}-about`}
        label="About the Program"
        helper="Optional longer program description."
        value={values.aboutProgram}
        rows={6}
        maxLength={20000}
        error={errors.aboutProgram}
        disabled={disabled}
        onChange={(aboutProgram) => onChange({ ...values, aboutProgram })}
      />
      <CoverageEditor
        id={`${prefix}-coverage`}
        items={values.whatWeCover}
        error={errors.whatWeCover}
        disabled={disabled}
        onChange={(whatWeCover) => onChange({ ...values, whatWeCover })}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField
          id={`${prefix}-sessions`}
          label="Awareness Session Count"
          value={values.awarenessSessionCount}
          error={errors.awarenessSessionCount}
          disabled={disabled}
          min={0}
          onChange={(awarenessSessionCount) =>
            onChange({ ...values, awarenessSessionCount })
          }
        />
        <NumberField
          id={`${prefix}-participants`}
          label="Participant Count"
          value={values.participantCount}
          error={errors.participantCount}
          disabled={disabled}
          min={0}
          onChange={(participantCount) =>
            onChange({ ...values, participantCount })
          }
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
        <NumberField
          id={`${prefix}-sort-order`}
          label="Sort Order"
          helper="Lower numbers appear first."
          value={values.sortOrder}
          error={errors.sortOrder}
          disabled={disabled}
          onChange={(sortOrder) => onChange({ ...values, sortOrder })}
        />
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={values.published}
            disabled={disabled}
            className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            onChange={(event) =>
              onChange({ ...values, published: event.target.checked })
            }
          />
          Published
        </label>
      </div>
    </>
  );
}

function TextField({
  id,
  label,
  value,
  maxLength,
  placeholder,
  helper,
  error,
  disabled,
  required,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  placeholder?: string | undefined;
  helper?: string | undefined;
  error?: string | undefined;
  disabled: boolean;
  required?: boolean | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800">
          {label}
        </label>
        <span className="text-xs text-slate-400">
          {value.length}/{maxLength}
        </span>
      </div>
      <input
        id={id}
        type="text"
        required={required}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          `${helper ? `${id}-help` : ""}${error ? `${helper ? " " : ""}${id}-error` : ""}` ||
          undefined
        }
        className={inputClassName}
        onChange={(event) => onChange(event.target.value)}
      />
      {helper ? (
        <p id={`${id}-help`} className="mt-1.5 text-xs text-slate-500">
          {helper}
        </p>
      ) : null}
      {error ? <FieldError id={`${id}-error`} message={error} /> : null}
    </div>
  );
}

function TextareaField({
  id,
  label,
  helper,
  value,
  rows,
  maxLength,
  error,
  disabled,
  required,
  onChange,
}: {
  id: string;
  label: string;
  helper?: string | undefined;
  value: string;
  rows: number;
  maxLength: number;
  error?: string | undefined;
  disabled: boolean;
  required?: boolean | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800">
          {label}
        </label>
        <span className="text-xs text-slate-400">
          {value.length}/{maxLength}
        </span>
      </div>
      <textarea
        id={id}
        rows={rows}
        required={required}
        maxLength={maxLength}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
        className={inputClassName}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`${id}-help`} className="mt-1.5 text-xs text-slate-500">
        {helper ?? "Optional."}
      </p>
      {error ? <FieldError id={`${id}-error`} message={error} /> : null}
    </div>
  );
}

function TagEditor({
  id,
  tags,
  error,
  disabled,
  onChange,
}: {
  id: string;
  tags: string[];
  error?: string | undefined;
  disabled: boolean;
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const tag = draft.trim();
    if (!tag || tags.includes(tag) || tag.length > 100) return;
    onChange([...tags, tag]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addTag();
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        Tags
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="text"
          maxLength={100}
          value={draft}
          placeholder="Add a tag"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-help`}
          className={`${inputClassName} mt-0`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="button"
          variant="outline"
          className="rounded-xl sm:shrink-0"
          disabled={disabled || !draft.trim() || tags.includes(draft.trim())}
          onClick={addTag}
        >
          <Tag aria-hidden /> Add Tag
        </Button>
      </div>
      <p id={`${id}-help`} className="mt-1.5 text-xs text-slate-500">
        Press Enter or use Add Tag. Duplicate and blank tags are ignored.
      </p>
      {tags.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              key={tag}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-sky-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-sky-800"
            >
              <span className="truncate">{tag}</span>
              <button
                type="button"
                disabled={disabled}
                className="rounded-full p-1 hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-600"
                aria-label={`Remove tag ${tag}`}
                onClick={() => onChange(tags.filter((value) => value !== tag))}
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <FieldError id={`${id}-error`} message={error} /> : null}
    </div>
  );
}

function CoverageEditor({
  id,
  items,
  error,
  disabled,
  onChange,
}: {
  id: string;
  items: string[];
  error?: string | undefined;
  disabled: boolean;
  onChange: (items: string[]) => void;
}) {
  return (
    <fieldset aria-describedby={error ? `${id}-error` : `${id}-help`}>
      <legend className="text-sm font-semibold text-slate-800">
        What We Cover
      </legend>
      <p id={`${id}-help`} className="mt-1 text-xs text-slate-500">
        Optional ordered list of topics covered by this work.
      </p>
      <div className="mt-3 space-y-2">
        {items.map((item, index) => (
          <div key={`${id}-${index}`} className="flex min-w-0 gap-2">
            <label htmlFor={`${id}-${index}`} className="sr-only">
              Coverage item {index + 1}
            </label>
            <input
              id={`${id}-${index}`}
              type="text"
              maxLength={500}
              value={item}
              placeholder="Mental health literacy"
              disabled={disabled}
              className={`${inputClassName} mt-0 min-w-0`}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                onChange(next);
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="shrink-0 rounded-xl"
              disabled={disabled}
              aria-label={`Remove coverage item ${index + 1}`}
              onClick={() =>
                onChange(items.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <X aria-hidden />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-3 rounded-xl"
        disabled={disabled}
        onClick={() => onChange([...items, ""])}
      >
        <Plus aria-hidden /> Add Item
      </Button>
      {error ? <FieldError id={`${id}-error`} message={error} /> : null}
    </fieldset>
  );
}

function NumberField({
  id,
  label,
  helper,
  value,
  error,
  disabled,
  min,
  onChange,
}: {
  id: string;
  label: string;
  helper?: string | undefined;
  value: string;
  error?: string | undefined;
  disabled: boolean;
  min?: number | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label} <span className="font-normal text-slate-500">(optional)</span>
      </label>
      <input
        id={id}
        type="number"
        min={min}
        step={1}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : helper ? `${id}-help` : undefined
        }
        className={inputClassName}
        onChange={(event) => onChange(event.target.value)}
      />
      {helper ? (
        <p id={`${id}-help`} className="mt-1.5 text-xs text-slate-500">
          {helper}
        </p>
      ) : null}
      {error ? <FieldError id={`${id}-error`} message={error} /> : null}
    </div>
  );
}

function ImageField({
  id,
  file,
  previewUrl,
  error,
  disabled,
  onChange,
}: {
  id: string;
  file: File | null;
  previewUrl: string | null;
  error?: string | undefined;
  disabled: boolean;
  onChange: (file: File | null) => void;
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0] ?? null);
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        Image
      </label>
      <input
        id={id}
        type="file"
        required
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
        className="mt-2 block w-full rounded-xl border border-slate-300 bg-white text-sm text-slate-600 file:mr-4 file:border-0 file:bg-sky-50 file:px-4 file:py-3 file:font-semibold file:text-sky-700 hover:file:bg-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        onChange={handleChange}
      />
      <p id={`${id}-help`} className="mt-1.5 text-xs text-slate-500">
        JPEG, PNG, or WebP. Maximum image size: 8 MB.
      </p>
      {error ? <FieldError id={`${id}-error`} message={error} /> : null}
      {previewUrl && file ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img
            src={previewUrl}
            alt="Selected image preview"
            className="max-h-64 w-full object-contain"
          />
          <p className="truncate border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
            {file.name}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-red-700">
      {message}
    </p>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      aria-live="polite"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
    >
      {message}
    </p>
  );
}

function useImagePreview(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url;
}

function emptyMetadata(): MetadataValues {
  return {
    slug: "",
    type: "",
    title: "",
    description: "",
    tags: [],
    aboutProgram: "",
    whatWeCover: [],
    awarenessSessionCount: "",
    participantCount: "",
    published: true,
    sortOrder: "",
  };
}

function metadataFromItem(item: AdminOurWorkItem): MetadataValues {
  return {
    slug: item.slug,
    type: item.type,
    title: item.title,
    description: item.description,
    tags: [...item.tags],
    aboutProgram: item.aboutProgram ?? "",
    whatWeCover: [...item.whatWeCover],
    awarenessSessionCount:
      item.awarenessSessionCount === null
        ? ""
        : String(item.awarenessSessionCount),
    participantCount:
      item.participantCount === null ? "" : String(item.participantCount),
    published: item.published,
    sortOrder: item.sortOrder === null ? "" : String(item.sortOrder),
  };
}

function validateMetadata(values: MetadataValues): FieldErrors {
  const errors: FieldErrors = {};
  const slug = values.slug.trim();
  if (!slug) errors.slug = "Slug is required.";
  else if (slug.length > 191)
    errors.slug = "Slug must be 191 characters or fewer.";
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    errors.slug =
      "Use lowercase letters, numbers, and single hyphens between words.";
  if (!values.type.trim()) errors.type = "Type is required.";
  else if (values.type.trim().length > 100)
    errors.type = "Type must be 100 characters or fewer.";
  if (!values.title.trim()) errors.title = "Title is required.";
  else if (values.title.trim().length > 255)
    errors.title = "Title must be 255 characters or fewer.";
  if (!values.description.trim())
    errors.description = "Description is required.";
  else if (values.description.trim().length > 5000)
    errors.description = "Description must be 5000 characters or fewer.";
  if (values.aboutProgram.trim().length > 20000)
    errors.aboutProgram =
      "About the Program must be 20000 characters or fewer.";
  if (values.tags.some((tag) => !tag.trim() || tag.trim().length > 100))
    errors.tags = "Remove blank tags and keep each tag within 100 characters.";
  if (
    values.whatWeCover.some((item) => !item.trim() || item.trim().length > 500)
  )
    errors.whatWeCover =
      "Complete or remove blank items and keep each item within 500 characters.";
  validateOptionalInteger(
    values.awarenessSessionCount,
    "Awareness session count",
    true,
    errors,
    "awarenessSessionCount",
  );
  validateOptionalInteger(
    values.participantCount,
    "Participant count",
    true,
    errors,
    "participantCount",
  );
  validateOptionalInteger(
    values.sortOrder,
    "Sort order",
    false,
    errors,
    "sortOrder",
  );
  return errors;
}

function validateOptionalInteger(
  value: string,
  label: string,
  nonNegative: boolean,
  errors: FieldErrors,
  field: "awarenessSessionCount" | "participantCount" | "sortOrder",
) {
  const normalized = value.trim();
  if (!normalized) return;
  if (!/^-?\d+$/.test(normalized)) {
    errors[field] = `${label} must be a whole number.`;
  } else if (nonNegative && Number(normalized) < 0) {
    errors[field] = `${label} cannot be negative.`;
  }
}

function validateImage(file: File | null): string | null {
  if (!file) return "Please choose an image.";
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type))
    return "Please choose a valid JPEG, PNG, or WebP image.";
  if (file.size === 0) return "Please choose a non-empty image.";
  if (file.size > MAX_IMAGE_SIZE_BYTES) return "Image must be 8 MB or smaller.";
  return null;
}

function metadataFormData(values: MetadataValues) {
  const data = new FormData();
  data.append("slug", values.slug);
  data.append("type", values.type);
  data.append("title", values.title);
  data.append("description", values.description);
  data.append("tags", JSON.stringify(values.tags));
  data.append("aboutProgram", values.aboutProgram);
  data.append("whatWeCover", JSON.stringify(values.whatWeCover));
  data.append("awarenessSessionCount", values.awarenessSessionCount);
  data.append("participantCount", values.participantCount);
  data.append("published", String(values.published));
  data.append("sortOrder", values.sortOrder);
  return data;
}

function messageForFailure(
  code: string,
  action: "create" | "update" | "replace" | "delete",
) {
  if (code === "STORAGE_NOT_CONFIGURED")
    return "Media storage is unavailable. Please contact the site administrator.";
  if (code === "INVALID_IMAGE")
    return "Please choose a valid JPEG, PNG, or WebP image.";
  if (code === "FILE_TOO_LARGE") return "Image must be 8 MB or smaller.";
  if (code === "INVALID_OUR_WORK_DATA")
    return "Review the highlighted fields and try again.";
  if (code === "SLUG_ALREADY_EXISTS")
    return "That URL slug is already in use. Choose another slug.";
  if (code === "NOT_FOUND")
    return "Our Work item not found. The list has been refreshed.";
  if (action === "create")
    return "Unable to add the Our Work item. Please try again.";
  if (action === "update")
    return "Unable to update the Our Work item. Please try again.";
  if (action === "replace")
    return "Unable to replace the image. Please try again.";
  return "Unable to delete the Our Work item. Please try again.";
}

function suggestSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 191)
    .replace(/-+$/g, "");
}

function clearFieldError(
  setErrors: React.Dispatch<React.SetStateAction<FieldErrors>>,
  field: FieldName,
) {
  setErrors((current) => {
    const next = { ...current };
    delete next[field];
    return next;
  });
}
