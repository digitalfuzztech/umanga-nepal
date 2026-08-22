import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@tanstack/react-router";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Frontend-only. Wire to a backend/CMS endpoint later. */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!consent) {
      setError("Please confirm you agree to receive updates.");
      return;
    }
    setError(null);
    setEmail("");
    setConsent(false);
    toast.success("Thank you — we'll be in touch with occasional updates.");
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <Input
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
        <Button type="submit" variant="warm" size="lg">
          Stay connected
        </Button>
      </div>

      <label className="mt-4 flex items-start gap-3 text-sm text-primary-foreground/85">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5 border-primary-foreground/50 data-[state=checked]:bg-warm-strong"
          aria-label="I agree to receive updates from Umanga Nepal"
        />
        <span>I agree to receive updates from Umanga Nepal.</span>
      </label>

      {error ? (
        <p id="newsletter-error" role="alert" className="mt-3 text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}

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
