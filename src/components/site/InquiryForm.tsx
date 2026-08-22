import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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

/**
 * Frontend-only form with validation.
 * `onSubmitValues` is the single integration point for a future backend/CMS endpoint.
 */
export function InquiryForm({
  fields,
  submitLabel = "Send",
  consentLabel = "I understand my information will be used to respond to this message.",
  successMessage = "Thank you — your message has been prepared for the Umanga Nepal team.",
  onSubmitValues,
}: {
  fields: FormField[];
  submitLabel?: string;
  consentLabel?: string;
  successMessage?: string;
  onSubmitValues?: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setValue = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = (values[field.name] ?? "").trim();
      if (field.required && !value) nextErrors[field.name] = `${field.label} is required.`;
      else if (field.type === "email" && value && !emailPattern.test(value))
        nextErrors[field.name] = "Please enter a valid email address.";
    });
    if (!consent) nextErrors["consent"] = "Please confirm before submitting.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmitValues?.(values);
    setValues({});
    setConsent(false);
    toast.success(successMessage);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          const isWide = field.type === "textarea" || field.type === "select";
          const id = `field-${field.name}`;
          const error = errors[field.name];
          return (
            <div key={field.name} className={isWide ? "sm:col-span-2" : undefined}>
              <Label htmlFor={id} className="text-sm font-semibold text-ink-deep">
                {field.label}
                {field.required ? <span className="text-warm-strong"> *</span> : null}
              </Label>
              <div className="mt-2">
                {field.type === "textarea" ? (
                  <Textarea
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
                    id={id}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    aria-invalid={Boolean(error)}
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
                <p className="mt-1.5 text-xs text-muted-foreground">{field.help}</p>
              ) : null}
              {error ? (
                <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5"
          aria-label={consentLabel}
        />
        <span>{consentLabel}</span>
      </label>
      {errors["consent"] ? (
        <p role="alert" className="-mt-3 text-xs font-medium text-destructive">
          {errors["consent"]}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="brand" size="lg">
          {submitLabel}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Please do not share sensitive personal or clinical details through this form. Umanga Nepal
        is not an emergency service.
      </p>
    </form>
  );
}
