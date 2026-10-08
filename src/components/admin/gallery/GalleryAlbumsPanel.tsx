import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Images, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  createGalleryAlbumServerFn,
  deleteGalleryAlbumServerFn,
} from "@/lib/admin-gallery-server-functions";
import { inputClass } from "@/components/admin/news-events/news-events-ui";

export type AdminGalleryAlbum = {
  id: string;
  name: string;
  title: string;
  caption: string | null;
  category: string;
  contextName: string | null;
  photoCount: number;
};

export function GalleryAlbumsPanel({
  albums,
  selectedAlbum,
  onSelect,
  refresh,
}: {
  albums: AdminGalleryAlbum[];
  selectedAlbum: string;
  onSelect: (id: string) => void;
  refresh: () => Promise<void>;
}) {
  const [create, setCreate] = useState(false),
    [deleting, setDeleting] = useState<AdminGalleryAlbum | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const remove = useServerFn(deleteGalleryAlbumServerFn);
  const lock = useRef(false),
    opener = useRef<HTMLElement | null>(null),
    upload = useRef<HTMLButtonElement>(null);
  function restoreFocus() {
    (opener.current?.isConnected ? opener.current : upload.current)?.focus();
  }
  async function deleteAlbum() {
    if (!deleting || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await remove({ data: { id: deleting.id } });
      if (!result.success) {
        setError("Album could not be deleted. Please try again.");
        return;
      }
      if (selectedAlbum === deleting.id) onSelect("");
      await refresh();
      setDeleting(null);
      if (result.cleanupWarning)
        toast.warning("Album deleted. Some media still needs cleanup.");
      else toast.success("Album deleted.");
    } catch {
      setError("Album could not be deleted. Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="mt-6 border-b border-slate-200 pb-6"
      aria-label="Gallery albums"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label
          className="grid min-w-0 flex-1 gap-2 text-sm font-semibold"
          htmlFor="admin-album-filter"
        >
          Album
          <select
            id="admin-album-filter"
            aria-label="Album"
            value={selectedAlbum}
            onChange={(event) => onSelect(event.target.value)}
            className={inputClass}
          >
            <option value="">All photos</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.name} ({album.photoCount} photos)
              </option>
            ))}
          </select>
        </label>
        <Button
          ref={upload}
          onClick={() => {
            opener.current = document.activeElement as HTMLElement;
            setCreate(true);
          }}
        >
          <Images aria-hidden />
          Upload Album
        </Button>
      </div>
      {albums.length ? (
        <ul className="mt-4 divide-y divide-slate-200">
          {albums.map((album) => (
            <li
              key={album.id}
              className="flex min-w-0 flex-wrap items-center gap-3 py-3"
            >
              <button
                className="min-w-0 flex-1 text-left text-sm font-semibold text-sky-800 hover:underline focus-visible:outline"
                onClick={() => onSelect(album.id)}
              >
                {album.name}
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {album.photoCount}/25 photos · {album.category}
                  {album.contextName ? ` · ${album.contextName}` : ""}
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete album ${album.name}`}
                title="Delete album"
                onClick={() => {
                  opener.current = document.activeElement as HTMLElement;
                  setError(null);
                  setDeleting(album);
                }}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {create ? (
        <UploadAlbum
          close={() => setCreate(false)}
          refresh={refresh}
          restoreFocus={restoreFocus}
        />
      ) : null}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this album?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} and its {deleting?.photoCount} photos will be
              removed, including their uploaded images.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={deleteAlbum}>
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Trash2 aria-hidden />
              )}
              {busy ? "Deleting…" : "Delete Album"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function UploadAlbum({
  close,
  refresh,
  restoreFocus,
}: {
  close: () => void;
  refresh: () => Promise<void>;
  restoreFocus: () => void;
}) {
  const create = useServerFn(createGalleryAlbumServerFn);
  const [files, setFiles] = useState<File[]>([]),
    [previews, setPreviews] = useState<string[]>([]),
    [category, setCategory] = useState("Event"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    if (!files.length || files.length > 25) {
      setError("Select between 1 and 25 photos.");
      return;
    }
    const data = new FormData(event.currentTarget);
    data.delete("images");
    files.forEach((file) => data.append("images", file));
    data.set("published", data.get("published") === "on" ? "true" : "false");
    data.set("sortOrder", "");
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await create({ data });
      if (!result.success) {
        setError(result.error);
        return;
      }
      await refresh();
      toast.success("Album uploaded.");
      close();
    } catch {
      setError("Album could not be uploaded. Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
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
          <DialogTitle>Upload Album</DialogTitle>
          <DialogDescription>Photo album details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="grid gap-4">
            <label
              className="grid gap-2 text-sm font-semibold"
              htmlFor="album-name"
            >
              Album Name
              <input
                id="album-name"
                name="name"
                required
                maxLength={255}
                className={inputClass}
              />
            </label>
            <label
              className="grid gap-2 text-sm font-semibold"
              htmlFor="album-title"
            >
              Title
              <input
                id="album-title"
                name="title"
                required
                maxLength={255}
                className={inputClass}
              />
            </label>
            <label
              className="grid gap-2 text-sm font-semibold"
              htmlFor="album-caption"
            >
              Caption
              <textarea
                id="album-caption"
                name="caption"
                rows={3}
                maxLength={5000}
                className={inputClass}
              />
            </label>
            <label
              className="grid gap-2 text-sm font-semibold"
              htmlFor="album-category"
            >
              Category
              <select
                id="album-category"
                aria-label="Category"
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
              >
                {["Event", "Activity", "Session", "Other"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label
              className="grid gap-2 text-sm font-semibold"
              htmlFor="album-context"
            >
              {category === "Other" ? "Context" : category} Name
              <input
                id="album-context"
                name="contextName"
                maxLength={255}
                className={inputClass}
              />
            </label>
            <label
              className="grid gap-2 text-sm font-semibold"
              htmlFor="album-images"
            >
              Photos (1–25)
              <input
                id="album-images"
                name="images"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                required
                className={`${inputClass} min-w-0`}
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  if (
                    selected.length > 25 ||
                    selected.some(
                      (file) =>
                        file.size > 8 * 1024 * 1024 ||
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          file.type,
                        ),
                    )
                  ) {
                    event.target.value = "";
                    setFiles([]);
                    setError(
                      "Select at most 25 JPEG, PNG or WebP photos, each no larger than 8 MB.",
                    );
                    return;
                  }
                  setFiles(selected);
                  setError(null);
                }}
              />
              <span className="text-xs font-normal text-slate-500">
                JPEG, PNG or WebP · up to 8 MB each · {files.length}/25 selected
              </span>
            </label>
            {previews.length ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {previews.map((url, index) => (
                  <li key={url}>
                    <img
                      src={url}
                      alt={files[index]?.name ?? "Selected photo"}
                      className="h-auto w-full rounded"
                    />
                  </li>
                ))}
              </ul>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="published" defaultChecked />
              Published
            </label>
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={close}>
                Cancel
              </Button>
              <Button type="submit">
                {busy ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : (
                  <Images aria-hidden />
                )}
                {busy ? "Uploading…" : "Upload Album"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
