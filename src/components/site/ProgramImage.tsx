import { ImageOff } from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps } from "react";

type ProgramImageProps = Omit<ComponentProps<"img">, "src" | "alt"> & {
  src: string;
  alt: string;
};

export function ProgramImage({
  src,
  alt,
  className,
  ...props
}: ProgramImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // An SSR image may fail before React attaches its error handler.
    if (imageRef.current?.complete && imageRef.current.naturalWidth === 0) {
      setFailedSource(src);
    }
  }, [src]);
  if (failedSource === src) {
    return (
      <div
        className={`${className ?? ""} flex items-center justify-center bg-surface text-muted-foreground`}
        role="img"
        aria-label={`Image unavailable for ${alt}`}
      >
        <ImageOff className="size-8" aria-hidden />
      </div>
    );
  }
  return (
    <img
      {...props}
      ref={imageRef}
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailedSource(src)}
    />
  );
}
