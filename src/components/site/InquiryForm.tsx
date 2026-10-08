import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { submitLeadServerFn } from "@/lib/lead-server-functions";
import type { LeadInput } from "@/lib/lead-input";

export type FormField = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  help?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InquiryForm({
  channel,
  fields,
  submitLabel = "Send",
  consentLabel = "I understand my information will be used to respond to this message.",
  successMessage = "Thank you. Your message has been received.",
}: {
  channel: Exclude<LeadInput["channel"], "newsletter">;
  fields: FormField[];
  submitLabel?: string;
  consentLabel?: string;
  successMessage?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pending = useRef(false);
  const submit = useServerFn(submitLeadServerFn);
  useEffect(() => setIsHydrated(true), []);

  const setValue = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || !isHydrated) return;
    setStatus(null);
    setSubmitError(null);
    const nextErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = (values[field.name] ?? "").trim();
      if (field.required && !value)
        nextErrors[field.name] = `${field.label} is required.`;
      else if (field.type === "email" && value && !emailPattern.test(value))
        nextErrors[field.name] = "Please enter a valid email address.";
    });
    if (!consent) nextErrors["consent"] = "Please confirm before submitting.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    pending.current = true;
    setIsSubmitting(true);
    try {
      const result = await submit({
        data: { channel, fields: values, consent },
      });
      if (!result.success) {
        setErrors(result.fieldErrors);
        setSubmitError(result.error);
        return;
      }
      setValues({});
      setConsent(false);
      setStatus(successMessage);
      toast.success(successMessage);
    } catch {
      setSubmitError(
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
      className="flex flex-col gap-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          const isWide = field.type === "textarea" || field.type === "select";
          const id = `field-${field.name}`;
          const error = errors[field.name];
          return (
            <div
              key={field.name}
              className={isWide ? "sm:col-span-2" : undefined}
            >
              <Label
                htmlFor={id}
                className="text-sm font-semibold text-ink-deep"
              >
                {field.label}
                {field.required ? (
                  <span className="text-warm-strong"> *</span>
                ) : null}
              </Label>
              <div className="mt-2">
                {field.type === "textarea" ? (
                  <Textarea
                    disabled={isSubmitting}
                    id={id}
                    rows={5}
                    placeholder={field.placeholder}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className="rounded-2xl"
                  />
                ) : field.type === "select" ? (
                  <select
                    disabled={isSubmitting}
                    id={id}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className="h-11 w-full rounded-full border border-input bg-background px-4 text-sm text-ink"
                  >
                    <option value="">Please select…</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    disabled={isSubmitting}
                    id={id}
                    type={field.type ?? "text"}
                    placeholder={field.placeholder}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className="h-11 rounded-full px-4"
                  />
                )}
              </div>
              {field.help ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {field.help}
                </p>
              ) : null}
              {error ? (
                <p
                  id={`${id}-error`}
                  role="alert"
                  className="mt-1.5 text-xs font-medium text-destructive"
                >
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <Checkbox
          disabled={isSubmitting}
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5"
          aria-label={consentLabel}
          aria-invalid={Boolean(errors["consent"])}
          aria-describedby={
            errors["consent"] ? "inquiry-consent-error" : undefined
          }
        />
        <span>{consentLabel}</span>
      </label>
      {errors["consent"] ? (
        <p
          id="inquiry-consent-error"
          role="alert"
          className="-mt-3 text-xs font-medium text-destructive"
        >
          {errors["consent"]}
        </p>
      ) : null}

      <div>
        <Button
          type="submit"
          variant="brand"
          size="lg"
          disabled={isSubmitting || !isHydrated}
        >
          {isSubmitting ? "Sending..." : submitLabel}
        </Button>
      </div>
      {submitError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {submitError}
        </p>
      ) : null}
      <p
        role="status"
        aria-live="polite"
        className={
          isSubmitting || status ? "text-sm text-brand-strong" : "sr-only"
        }
      >
        {isSubmitting ? "Sending your message..." : status}
      </p>
      <p className="text-xs text-muted-foreground">
        Please do not share sensitive personal or clinical details through this
        form. Umanga Nepal is not an emergency service.
      </p>
    </form>
  );
}
