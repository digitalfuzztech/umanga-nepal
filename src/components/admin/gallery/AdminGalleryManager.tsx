import { useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  ImageOff,
  ImagePlus,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
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
  createGalleryItemServerFn,
  deleteGalleryItemServerFn,
  replaceGalleryImageServerFn,
  updateGalleryItemServerFn,
} from "@/lib/admin-gallery-server-functions";
import {
  GalleryAlbumsPanel,
  type AdminGalleryAlbum,
} from "./GalleryAlbumsPanel";

const GalleryOptions = createContext<{
  albums: AdminGalleryAlbum[];
  categories: string[];
}>({ albums: [], categories: [] });

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type AdminGalleryItem = {
  id: string;
  title: string;
  caption: string | null;
  category: string | null;
  contextName: string | null;
  albumId: string | null;
  imageUrl: string;
  published: boolean;
  sortOrder: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type GalleryListResult =
  | { success: true; items: AdminGalleryItem[]; albums: AdminGalleryAlbum[] }
  | { success: false; code: string; error: string };

type MetadataValues = {
  title: string;
  caption: string;
  published: boolean;
  sortOrder: string;
  category: string;
  contextName: string;
  albumId: string;
};

type FieldErrors = Partial<
  Record<"title" | "caption" | "sortOrder" | "image", string>
>;

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100";

export function AdminGalleryManager({
  initialResult,
}: {
  initialResult: GalleryListResult;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminGalleryItem | null>(null);
  const [replacingItem, setReplacingItem] = useState<AdminGalleryItem | null>(
    null,
  );
  const [deletingItem, setDeletingItem] = useState<AdminGalleryItem | null>(
    null,
  );

  const items = initialResult.success ? initialResult.items : [];
  const albums = initialResult.success ? initialResult.albums : [];
  const [selectedAlbum, setSelectedAlbum] = useState("");
  const categories = [
    ...new Set([
      "Event",
      "Activity",
      "Session",
      "Other",
      ...items.flatMap((item) => (item.category ? [item.category] : [])),
    ]),
  ];

  async function refreshList() {
    await router.invalidate();
  }

  async function handleUnauthorized() {
    await navigate({ to: "/admin", replace: true });
  }

  return (
    <GalleryOptions.Provider value={{ albums, categories }}>
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
            Umanga Nepal Admin
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-950">
            Gallery
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Manage images displayed in the public gallery.
          </p>
        </div>
        <Button
          type="button"
          className="w-full rounded-xl sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          <ImagePlus aria-hidden />
          Add Gallery Image
        </Button>
      </div>

      {initialResult.success ? (
        <GalleryAlbumsPanel
          albums={albums}
          selectedAlbum={selectedAlbum}
          onSelect={setSelectedAlbum}
          refresh={refreshList}
        />
      ) : null}
      {!initialResult.success ? (
        <section
          className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5"
          role="alert"
        >
          <h3 className="font-bold text-red-950">
            Gallery could not be loaded.
          </h3>
          <p className="mt-1 text-sm text-red-800">
            Please refresh the page and try again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={refreshList}
          >
            <RefreshCw aria-hidden />
            Try Again
          </Button>
        </section>
      ) : items.length === 0 ? (
        <GalleryEmptyState onAdd={() => setCreateOpen(true)} />
      ) : (
        <section
          className="mt-7 grid gap-5 xl:grid-cols-2"
          aria-label="Gallery images"
        >
          {items
            .filter((item) => !selectedAlbum || item.albumId === selectedAlbum)
            .map((item) => (
              <GalleryItemCard
                key={item.id}
                item={item}
                onEdit={() => setEditingItem(item)}
                onReplace={() => setReplacingItem(item)}
                onDelete={() => setDeletingItem(item)}
              />
            ))}
        </section>
      )}

      <CreateGalleryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={refreshList}
        onUnauthorized={handleUnauthorized}
      />
      <EditGalleryDialog
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={refreshList}
        onUnauthorized={handleUnauthorized}
      />
      <ReplaceImageDialog
        item={replacingItem}
        onClose={() => setReplacingItem(null)}
        onSuccess={refreshList}
        onUnauthorized={handleUnauthorized}
      />
      <DeleteGalleryDialog
        item={deletingItem}
        onClose={() => setDeletingItem(null)}
        onSuccess={refreshList}
        onUnauthorized={handleUnauthorized}
      />
    </GalleryOptions.Provider>
  );
}

function GalleryEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="mt-7 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        <ImagePlus className="size-7" aria-hidden />
      </span>
      <h3 className="mt-5 font-display text-xl font-bold text-slate-950">
        No gallery images yet.
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        Add your first image to start building the public gallery.
      </p>
      <Button type="button" className="mt-6 rounded-xl" onClick={onAdd}>
        <ImagePlus aria-hidden />
        Add Gallery Image
      </Button>
    </section>
  );
}

function GalleryItemCard({
  item,
  onEdit,
  onReplace,
  onDelete,
}: {
  item: AdminGalleryItem;
  onEdit: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const { albums } = useContext(GalleryOptions);
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_-38px_rgba(8,47,73,0.5)] sm:grid sm:grid-cols-[11rem_minmax(0,1fr)]">
      <GalleryThumbnail item={item} />
      <div className="min-w-0 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="min-w-0 break-words font-display text-lg font-bold text-slate-950">
            {item.title}
          </h3>
          <span
            className={
              item.published
                ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
                : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
            }
          >
            {item.published ? "Published" : "Unpublished"}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
          {item.caption || "No caption provided."}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
          <span>
            {item.albumId
              ? (albums.find((album) => album.id === item.albumId)?.name ??
                "Album photo")
              : "Standalone photo"}
          </span>
          {item.category ? <span>{item.category}</span> : null}
          {item.contextName ? <span>{item.contextName}</span> : null}
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDate(item.createdAt)}
          </span>
        </div>
        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg"
            onClick={onEdit}
          >
            <Pencil aria-hidden />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg"
            onClick={onReplace}
          >
            <RefreshCw aria-hidden />
            Replace Image
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-lg text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={onDelete}
          >
            <Trash2 aria-hidden />
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

function GalleryThumbnail({ item }: { item: AdminGalleryItem }) {
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
      className="h-48 w-full bg-slate-100 object-cover sm:h-full sm:min-h-52"
      onError={() => setFailed(true)}
    />
  );
}

function CreateGalleryDialog({
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
  const createItem = useServerFn(createGalleryItemServerFn);
  const [values, setValues] = useState<MetadataValues>(emptyMetadata());
  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const previewUrl = useImagePreview(image);

  function reset() {
    setValues(emptyMetadata());
    setImage(null);
    setErrors({});
    setFormError(null);
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
    if (Object.keys(nextErrors).length > 0 || !image) return;

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
      toast.success("Gallery image added successfully.");
    } catch {
      setFormError("Unable to add gallery image. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Add Gallery Image</DialogTitle>
          <DialogDescription>
            Add an image and details for the Umanga Nepal gallery.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <div className="space-y-5 py-2">
            <MetadataFields
              values={values}
              onChange={setValues}
              errors={errors}
              disabled={submitting}
              prefix="create-gallery"
            />
            <ImageField
              id="create-gallery-image"
              file={image}
              previewUrl={previewUrl}
              error={errors.image}
              disabled={submitting}
              onChange={(file) => {
                setImage(file);
                setErrors((current) => {
                  const next = { ...current };
                  delete next.image;
                  return next;
                });
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
                <ImagePlus aria-hidden />
              )}
              {submitting ? "Adding image…" : "Add Gallery Image"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditGalleryDialog({
  item,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  item: AdminGalleryItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onUnauthorized: () => Promise<void>;
}) {
  const updateItem = useServerFn(updateGalleryItemServerFn);
  const [values, setValues] = useState<MetadataValues>(emptyMetadata());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!item) return;
    setValues({
      title: item.title,
      caption: item.caption ?? "",
      published: item.published,
      sortOrder: item.sortOrder === null ? "" : String(item.sortOrder),
      category: item.category ?? "",
      contextName: item.contextName ?? "",
      albumId: item.albumId ?? "",
    });
    setErrors({});
    setFormError(null);
  }, [item]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || submitting) return;
    const nextErrors = validateMetadata(values);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);

    try {
      const result = await updateItem({
        data: {
          id: item.id,
          metadata: {
            title: values.title,
            caption: values.caption,
            published: values.published,
            sortOrder: values.sortOrder,
            category: values.category || null,
            contextName: values.contextName || null,
            albumId: values.albumId || null,
          },
        },
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
      toast.success("Gallery item updated successfully.");
    } catch {
      setFormError("Unable to update gallery item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => !open && !submitting && onClose()}
    >
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Gallery Item</DialogTitle>
          <DialogDescription>
            Update photo details and visibility.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <div className="space-y-5 py-2">
            <MetadataFields
              values={values}
              onChange={setValues}
              errors={errors}
              disabled={submitting}
              prefix="edit-gallery"
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

function ReplaceImageDialog({
  item,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  item: AdminGalleryItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onUnauthorized: () => Promise<void>;
}) {
  const replaceImage = useServerFn(replaceGalleryImageServerFn);
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
      closeAfterSubmit(setImage, setError, setFormError, onClose);
      await onSuccess();
      if (result.cleanupWarning) {
        toast.warning(
          "Image was replaced, but old media cleanup could not be completed automatically.",
        );
      } else {
        toast.success("Gallery image replaced successfully.");
      }
    } catch {
      setFormError("Unable to replace the gallery image. Please try again.");
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
            Upload a new image for this Gallery item. Its metadata will remain
            unchanged.
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
                  alt=""
                  className="mt-2 h-36 w-full rounded-xl bg-slate-100 object-cover"
                />
              </div>
              <ImageField
                id="replacement-gallery-image"
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

function DeleteGalleryDialog({
  item,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  item: AdminGalleryItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onUnauthorized: () => Promise<void>;
}) {
  const deleteItem = useServerFn(deleteGalleryItemServerFn);
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
          "Gallery item was deleted, but media cleanup could not be completed automatically.",
        );
      } else {
        toast.success("Gallery image deleted successfully.");
      }
    } catch {
      setError("Unable to delete gallery item. Please try again.");
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
          <AlertDialogTitle>Delete gallery image?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the Gallery item and its stored image. This action
            cannot be undone.
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
            {submitting ? "Deleting…" : "Delete Image"}
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
}: {
  values: MetadataValues;
  onChange: (values: MetadataValues) => void;
  errors: FieldErrors;
  disabled: boolean;
  prefix: string;
}) {
  const { albums, categories } = useContext(GalleryOptions);
  const isAlbumPhoto = Boolean(values.albumId);
  return (
    <>
      <label
        className="block text-sm font-semibold text-slate-800"
        htmlFor={`${prefix}-album`}
      >
        Album
        <select
          id={`${prefix}-album`}
          aria-label="Album"
          className={inputClassName}
          value={values.albumId}
          disabled={disabled}
          onChange={(event) => {
            const album = albums.find(
              (entry) => entry.id === event.target.value,
            );
            onChange({
              ...values,
              albumId: event.target.value,
              ...(album
                ? {
                    title: album.title,
                    caption: album.caption ?? "",
                    category: album.category,
                    contextName: album.contextName ?? "",
                  }
                : {}),
            });
          }}
        >
          <option value="">Standalone photo</option>
          {albums
            .filter(
              (album) => album.photoCount < 25 || album.id === values.albumId,
            )
            .map((album) => (
              <option key={album.id} value={album.id}>
                {album.name} ({album.photoCount}/25)
              </option>
            ))}
        </select>
      </label>
      <label
        className="block text-sm font-semibold text-slate-800"
        htmlFor={`${prefix}-category`}
      >
        Category
        <select
          id={`${prefix}-category`}
          aria-label="Category"
          className={inputClassName}
          value={values.category}
          disabled={disabled || isAlbumPhoto}
          onChange={(event) =>
            onChange({ ...values, category: event.target.value })
          }
        >
          <option value="">Uncategorized</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </label>
      <label
        className="block text-sm font-semibold text-slate-800"
        htmlFor={`${prefix}-context`}
      >
        {["Event", "Activity", "Session"].includes(values.category)
          ? `${values.category} Name`
          : "Context Name"}
        <input
          id={`${prefix}-context`}
          className={inputClassName}
          value={values.contextName}
          maxLength={255}
          disabled={disabled || isAlbumPhoto}
          onChange={(event) =>
            onChange({ ...values, contextName: event.target.value })
          }
        />
      </label>
      <div>
        <label
          htmlFor={`${prefix}-title`}
          className="text-sm font-semibold text-slate-800"
        >
          Title
        </label>
        <input
          id={`${prefix}-title`}
          type="text"
          required
          maxLength={255}
          value={values.title}
          readOnly={isAlbumPhoto}
          disabled={disabled}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? `${prefix}-title-error` : undefined}
          className={inputClassName}
          onChange={(event) =>
            onChange({ ...values, title: event.target.value })
          }
        />
        {errors.title ? (
          <FieldError id={`${prefix}-title-error`} message={errors.title} />
        ) : null}
      </div>
      <div>
        <label
          htmlFor={`${prefix}-caption`}
          className="text-sm font-semibold text-slate-800"
        >
          Caption <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id={`${prefix}-caption`}
          rows={4}
          maxLength={5000}
          value={values.caption}
          readOnly={isAlbumPhoto}
          disabled={disabled}
          aria-invalid={Boolean(errors.caption)}
          aria-describedby={
            errors.caption ? `${prefix}-caption-error` : undefined
          }
          className={`${inputClassName} resize-y`}
          onChange={(event) =>
            onChange({ ...values, caption: event.target.value })
          }
        />
        <div className="mt-1 flex justify-between gap-4 text-xs text-slate-500">
          {errors.caption ? (
            <FieldError
              id={`${prefix}-caption-error`}
              message={errors.caption}
              className="mt-0"
            />
          ) : (
            <span />
          )}
          <span>{values.caption.length}/5000</span>
        </div>
      </div>
      <div>
        <label className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            type="checkbox"
            checked={values.published}
            disabled={disabled}
            className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            onChange={(event) =>
              onChange({ ...values, published: event.target.checked })
            }
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800">
              Published
            </span>
            <span className="block text-xs leading-5 text-slate-500">
              Visible in the public Gallery.
            </span>
          </span>
        </label>
      </div>
    </>
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
  error: string | undefined;
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

function FieldError({
  id,
  message,
  className = "mt-1.5",
}: {
  id: string;
  message: string;
  className?: string;
}) {
  return (
    <p id={id} className={`${className} text-xs font-medium text-red-700`}>
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
    title: "",
    caption: "",
    published: true,
    sortOrder: "",
    category: "",
    contextName: "",
    albumId: "",
  };
}

function validateMetadata(values: MetadataValues): FieldErrors {
  const errors: FieldErrors = {};
  const title = values.title.trim();
  if (!title) errors.title = "Title is required.";
  else if (title.length > 255)
    errors.title = "Title must be 255 characters or fewer.";
  if (values.caption.trim().length > 5000)
    errors.caption = "Caption must be 5000 characters or fewer.";
  if (values.sortOrder.trim() && !/^-?\d+$/.test(values.sortOrder.trim()))
    errors.sortOrder = "Sort order must be a whole number.";
  return errors;
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
  data.append("title", values.title);
  data.append("caption", values.caption);
  data.append("published", String(values.published));
  data.append("sortOrder", values.sortOrder);
  data.append("category", values.category);
  data.append("contextName", values.contextName);
  data.append("albumId", values.albumId);
  return data;
}

function messageForFailure(
  code: string,
  action: "create" | "update" | "replace" | "delete",
) {
  if (code === "STORAGE_NOT_CONFIGURED")
    return "Media storage is not configured yet. Configure the server media settings before uploading images.";
  if (code === "INVALID_IMAGE")
    return "Please choose a valid JPEG, PNG, or WebP image.";
  if (code === "INVALID_DATA")
    return "Review the highlighted fields and try again.";
  if (code === "NOT_FOUND")
    return "Gallery item not found. The list has been refreshed.";
  if (action === "create")
    return "Unable to add gallery image. Please try again.";
  if (action === "update")
    return "Unable to update gallery item. Please try again.";
  if (action === "replace")
    return "Unable to replace the gallery image. Please try again.";
  return "Unable to delete gallery item. Please try again.";
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

function closeAfterSubmit(
  setImage: (value: File | null) => void,
  setError: (value: string | null) => void,
  setFormError: (value: string | null) => void,
  onClose: () => void,
) {
  setImage(null);
  setError(null);
  setFormError(null);
  onClose();
}
