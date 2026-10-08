import { useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Save, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminSettingsServerFn,
  replaceBrandAssetServerFn,
  updateSettingsServerFn,
} from "@/lib/general-settings-server-functions";
import {
  settingsMetadataSchema,
  type AdminSettings,
  type BrandingSlot,
  type SettingsMetadata,
} from "@/lib/general-settings";

const sections: {
  title: string;
  fields: {
    key: keyof SettingsMetadata;
    label: string;
    type?: "email" | "url" | "number" | "textarea";
  }[];
}[] = [
  {
    title: "Company Information",
    fields: [
      { key: "companyName", label: "Company Name" },
      {
        key: "companyDescription",
        label: "Company Description",
        type: "textarea",
      },
      { key: "address", label: "Company Address", type: "textarea" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email", type: "email" },
    ],
  },
  {
    title: "Map Location",
    fields: [
      { key: "latitude", label: "Map Latitude", type: "number" },
      { key: "longitude", label: "Map Longitude", type: "number" },
    ],
  },
  {
    title: "Social Media",
    fields: [
      "facebook",
      "instagram",
      "twitter",
      "youtube",
      "tiktok",
      "linkedin",
    ].map((name) => ({
      key: `${name}Url` as keyof SettingsMetadata,
      label: `${name === "tiktok" ? "TikTok" : name === "linkedin" ? "LinkedIn" : name.charAt(0).toUpperCase() + name.slice(1)} URL`,
      type: "url",
    })),
  },
  {
    title: "SEO Settings",
    fields: [
      { key: "websiteUrl", label: "Website URL", type: "url" },
      { key: "websiteTitle", label: "Website Title" },
      { key: "seoTitle", label: "SEO Title" },
      { key: "seoDescription", label: "SEO Description", type: "textarea" },
      { key: "seoContent", label: "SEO Content", type: "textarea" },
      { key: "seoKeywords", label: "SEO Keywords", type: "textarea" },
      { key: "openGraphTitle", label: "Open Graph Title" },
      {
        key: "openGraphDescription",
        label: "Open Graph Description",
        type: "textarea",
      },
    ],
  },
];
const inputClass =
  "w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-60";
function metadataOf(item: AdminSettings) {
  return Object.fromEntries(
    Object.keys(settingsMetadataSchema.shape).map((key) => [
      key,
      item[key as keyof AdminSettings],
    ]),
  ) as SettingsMetadata;
}
export function GeneralSettingsEditor({
  initialResult,
}: {
  initialResult: Awaited<ReturnType<typeof getAdminSettingsServerFn>>;
}) {
  const router = useRouter();
  const initialItem = initialResult.success ? initialResult.item : null;
  const [item, setItem] = useState(initialItem);
  const [draft, setDraft] = useState<SettingsMetadata | null>(
    initialItem ? metadataOf(initialItem) : null,
  );
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof SettingsMetadata, string>>
  >({});
  const [message, setMessage] = useState("");
  if (!item || !draft)
    return (
      <div
        role="alert"
        className="rounded-lg border border-slate-200 bg-white p-6"
      >
        {initialResult.success
          ? "General Settings has not been initialized."
          : initialResult.error}
      </div>
    );
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !draft) return;
    const result = settingsMetadataSchema.safeParse(draft);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [issue.path[0], issue.message]),
        ),
      );
      setMessage("Please check the highlighted fields.");
      return;
    }
    busy.current = true;
    setPending(true);
    setErrors({});
    setMessage("");
    try {
      const saved = await updateSettingsServerFn({ data: result.data });
      if (!saved.success) {
        setMessage(saved.error);
        return;
      }
      setItem(saved.item);
      setDraft(metadataOf(saved.item));
      toast.success("General Settings saved.");
      await router.invalidate();
    } catch {
      setMessage("Unable to save settings. Please try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function replace(
    slot: BrandingSlot,
    file: File | undefined,
    input: HTMLInputElement,
  ) {
    if (!file || busy.current) return;
    if (file.size > 8 * 1024 * 1024) {
      setMessage("Image exceeds the 8 MB limit.");
      input.value = "";
      return;
    }
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]!);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const mimeType =
        file.type ||
        (file.name.toLowerCase().endsWith(".ico") ? "image/x-icon" : "");
      const saved = await replaceBrandAssetServerFn({
        data: { slot, base64, mimeType },
      });
      if (!saved.success) {
        setMessage(
          saved.error +
            (saved.cleanupWarning
              ? " Media cleanup needs administrator attention."
              : ""),
        );
        return;
      }
      setItem(saved.item);
      toast.success("Branding image saved.");
      if (saved.cleanupWarning)
        toast.warning("Image saved; previous image cleanup needs attention.");
      await router.invalidate();
    } catch {
      setMessage("Unable to save the branding image.");
    } finally {
      input.value = "";
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <div className="space-y-7">
      <header>
        <h2 className="font-display text-2xl font-bold">General Settings</h2>
        <p className="mt-2 text-sm text-slate-600">
          Manage branding, contact information and global SEO.
        </p>
      </header>
      <p role="status" aria-live="polite" className="text-sm text-slate-700">
        {pending ? "Saving..." : message}
      </p>
      <section
        aria-labelledby="branding-heading"
        className="border-b border-slate-200 pb-7"
      >
        <h3 id="branding-heading" className="mb-4 font-semibold">
          Branding
        </h3>
        <div className="grid gap-5 sm:grid-cols-3">
          {(["headerLogo", "footerLogo", "favicon"] as const).map((slot) => (
            <div key={slot}>
              <label
                htmlFor={slot}
                className="mb-2 block text-sm font-semibold"
              >
                {slot === "headerLogo"
                  ? "Header Logo"
                  : slot === "footerLogo"
                    ? "Footer Logo"
                    : "Favicon"}
              </label>
              <div
                className={`mb-3 flex h-28 items-center justify-center rounded-md border border-slate-200 ${slot === "footerLogo" ? "bg-slate-800" : "bg-white"}`}
              >
                {item[`${slot}Url`] ? (
                  <img
                    src={item[`${slot}Url`]!}
                    alt={
                      slot === "favicon" ? "Current favicon" : "Current logo"
                    }
                    className="max-h-24 max-w-full object-contain p-2"
                  />
                ) : null}
              </div>
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-600">
                <Upload className="size-4" aria-hidden />
                {slot === "favicon" ? "ICO or PNG" : "JPEG, PNG or WebP"}, max.
                8 MB
              </div>
              <input
                id={slot}
                type="file"
                disabled={pending}
                accept={
                  slot === "favicon"
                    ? ".ico,image/x-icon,image/vnd.microsoft.icon,image/png"
                    : "image/jpeg,image/png,image/webp"
                }
                className={`${inputClass} text-xs`}
                onChange={(event) => {
                  void replace(
                    slot,
                    event.currentTarget.files?.[0],
                    event.currentTarget,
                  );
                }}
              />
            </div>
          ))}
        </div>
      </section>
      <form onSubmit={save} className="space-y-7">
        {sections.map((section) => (
          <section
            key={section.title}
            className="border-b border-slate-200 pb-7"
            aria-label={section.title}
          >
            <h3 className="mb-4 font-semibold">{section.title}</h3>
            {section.title === "SEO Settings" ? (
              <p className="mb-4 text-sm text-slate-600">
                SEO Content and SEO Keywords are editorial references. They are
                not inserted as hidden text or meta-keywords.
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div
                  key={field.key}
                  className={
                    field.type === "textarea" ? "sm:col-span-2" : "min-w-0"
                  }
                >
                  <label
                    htmlFor={field.key}
                    className="mb-1.5 block text-sm font-medium"
                  >
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      id={field.key}
                      className={inputClass}
                      rows={field.key === "seoContent" ? 6 : 3}
                      disabled={pending}
                      value={String(draft[field.key] ?? "")}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          [field.key]:
                            event.target.value === ""
                              ? null
                              : event.target.value,
                        })
                      }
                      aria-invalid={Boolean(errors[field.key])}
                      aria-describedby={
                        errors[field.key] ? `${field.key}-error` : undefined
                      }
                    />
                  ) : (
                    <input
                      id={field.key}
                      type={field.type || "text"}
                      step={field.type === "number" ? "0.0000001" : undefined}
                      min={
                        field.key === "latitude"
                          ? -90
                          : field.key === "longitude"
                            ? -180
                            : undefined
                      }
                      max={
                        field.key === "latitude"
                          ? 90
                          : field.key === "longitude"
                            ? 180
                            : undefined
                      }
                      disabled={pending}
                      className={inputClass}
                      value={draft[field.key] ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          [field.key]:
                            event.target.value === ""
                              ? null
                              : field.type === "number"
                                ? Number(event.target.value)
                                : event.target.value,
                        })
                      }
                      aria-invalid={Boolean(errors[field.key])}
                      aria-describedby={
                        errors[field.key] ? `${field.key}-error` : undefined
                      }
                    />
                  )}
                  {errors[field.key] ? (
                    <p
                      id={`${field.key}-error`}
                      className="mt-1 text-sm text-red-700"
                    >
                      {errors[field.key]}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50"
        >
          <Save className="size-4" aria-hidden />
          {pending ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
