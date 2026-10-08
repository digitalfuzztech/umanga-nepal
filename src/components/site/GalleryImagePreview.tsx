import * as Dialog from "@radix-ui/react-dialog";
import { ImageOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function GalleryImagePreview({
  imageUrl,
  title,
  caption,
  imageWidth,
  imageHeight,
}: {
  imageUrl: string;
  title: string;
  caption: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
}) {
  const [status, setStatus] = useState<"pending" | "loaded" | "failed">(
    "pending",
  );
  const [open, setOpen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Handle cached images and errors that occurred before hydration.
    const image = imageRef.current;
    if (image?.complete) {
      setStatus(image.naturalWidth > 0 ? "loaded" : "failed");
    }
  }, [imageUrl]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <figure className="group relative overflow-hidden rounded-lg border border-border bg-surface-blue shadow-card">
        {status === "failed" ? (
          <div
            className="flex min-h-48 flex-col items-center justify-center gap-3 bg-brand-pale px-5 text-center text-muted-foreground"
            role="img"
            aria-label={`Image unavailable for ${title}`}
          >
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white text-brand-strong shadow-soft">
              <ImageOff className="size-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold">Image unavailable</span>
          </div>
        ) : (
          <Dialog.Trigger asChild>
            <button
              type="button"
              disabled={status !== "loaded"}
              aria-label={`Preview ${title}`}
              className="block w-full cursor-zoom-in focus-visible:outline-offset-[-4px] disabled:cursor-default"
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt={title}
                loading="lazy"
                width={imageWidth ?? undefined}
                height={imageHeight ?? undefined}
                className="block h-auto w-full"
                onLoad={() => setStatus("loaded")}
                onError={() => setStatus("failed")}
              />
            </button>
          </Dialog.Trigger>
        )}
        <figcaption className="break-words px-4 py-3 text-ink-deep">
          <span className="block text-sm font-semibold">{title}</span>
          {caption ? (
            <span className="mt-1 block whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
              {caption}
            </span>
          ) : null}
        </figcaption>
      </figure>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-ink-deep/90" />
        <Dialog.Content
          aria-modal="true"
          className="fixed inset-0 z-[101] flex flex-col gap-4 px-4 pb-6 pt-20 text-white outline-none sm:px-10 sm:pb-8"
          {...(caption ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            closeRef.current?.focus();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <Dialog.Close asChild>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close image preview"
              className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-white sm:right-6 sm:top-6"
            >
              <X className="size-6" aria-hidden />
            </button>
          </Dialog.Close>
          <div
            className="flex min-h-0 flex-1 items-center justify-center"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <img
              src={imageUrl}
              alt={title}
              className="max-h-full max-w-full rounded-lg object-contain"
              onError={() => {
                setStatus("failed");
                setOpen(false);
              }}
            />
          </div>
          <div className="mx-auto max-h-28 w-full max-w-3xl shrink-0 overflow-y-auto text-center">
            <Dialog.Title className="break-words text-lg font-semibold leading-6 sm:text-xl">
              {title}
            </Dialog.Title>
            {caption ? (
              <Dialog.Description className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/80">
                {caption}
              </Dialog.Description>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
