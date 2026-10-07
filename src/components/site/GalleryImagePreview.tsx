import * as Dialog from "@radix-ui/react-dialog";
import { ImageOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function GalleryImagePreview({
  imageUrl,
  title,
  caption,
}: {
  imageUrl: string;
  title: string;
  caption: string | null;
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
      <figure className="group relative h-full overflow-hidden rounded-[1.75rem] border border-border bg-surface-blue shadow-card">
        {status === "failed" ? (
          <div
            className="flex size-full flex-col items-center justify-center gap-3 bg-brand-pale px-5 text-center text-muted-foreground"
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
              className="block size-full cursor-zoom-in focus-visible:outline-offset-[-4px] disabled:cursor-default"
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt={title}
                loading="lazy"
                width={1400}
                height={1000}
                className="size-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.025]"
                onLoad={() => setStatus("loaded")}
                onError={() => setStatus("failed")}
              />
            </button>
          </Dialog.Trigger>
        )}
        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-deeper/90 via-brand-deeper/45 to-transparent px-5 pb-4 pt-12 text-white">
          <span className="block text-sm font-semibold">{title}</span>
          {caption ? (
            <span className="mt-1 block text-xs leading-5 text-white/85">
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
              <Dialog.Description className="mt-2 break-words text-sm leading-6 text-white/80">
                {caption}
              </Dialog.Description>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
