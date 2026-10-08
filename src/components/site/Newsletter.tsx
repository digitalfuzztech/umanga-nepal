import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@tanstack/react-router";
import { submitLeadServerFn } from "@/lib/lead-server-functions";
import type { NewsletterSource } from "@/lib/lead-input";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Newsletter({ source }: { source: NewsletterSource }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const pending = useRef(false);
  const submit = useServerFn(submitLeadServerFn);
  useEffect(() => setIsHydrated(true), []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || !isHydrated) return;
    setStatus(null);
    if (!emailPattern.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!consent) {
      setError("Please confirm you agree to receive updates.");
      return;
    }
    setError(null);
    pending.current = true;
    setIsSubmitting(true);
    try {
      const result = await submit({
        data: { channel: "newsletter", fields: { email }, consent, source },
      });
      if (!result.success) {
        setError(
          result.fieldErrors["email"] ??
            result.fieldErrors["consent"] ??
            result.error,
        );
        return;
      }
      setEmail("");
      setConsent(false);
      setStatus(
        "Thank you. Your request for occasional updates has been received.",
      );
      toast.success(
        "Thank you. Your request for occasional updates has been received.",
      );
    } catch {
      setError(
        "Unable to confirm your submission right now. Please try again shortly.",
      );
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isSubmitting}
      className="w-full max-w-xl"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <Input
            disabled={isSubmitting}
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "newsletter-error" : undefined}
            className="h-12 rounded-full border-border bg-background px-5 text-ink"
          />
        </div>
        <Button
          type="submit"
          variant="warm"
          size="lg"
          disabled={isSubmitting || !isHydrated}
        >
          {isSubmitting ? "Joining..." : "Stay connected"}
        </Button>
      </div>

      <label className="mt-4 flex items-start gap-3 text-sm text-primary-foreground/85">
        <Checkbox
          disabled={isSubmitting}
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5 border-primary-foreground/50 data-[state=checked]:bg-warm-strong"
          aria-label="I agree to receive updates from Umanga Nepal"
          aria-describedby={error ? "newsletter-error" : undefined}
        />
        <span>I agree to receive updates from Umanga Nepal.</span>
      </label>

      {error ? (
        <p
          id="newsletter-error"
          role="alert"
          className="mt-3 text-sm font-medium text-accent"
        >
          {error}
        </p>
      ) : null}
      <p
        role="status"
        aria-live="polite"
        className={
          isSubmitting || status
            ? "mt-3 text-sm text-primary-foreground/85"
            : "sr-only"
        }
      >
        {isSubmitting ? "Sending your request..." : status}
      </p>

      <p className="mt-3 text-xs text-primary-foreground/70">
        We only use your email to send occasional updates. Read our{" "}
        <Link to="/privacy" className="underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
