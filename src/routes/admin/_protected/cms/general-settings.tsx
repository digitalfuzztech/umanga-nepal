import { createFileRoute } from "@tanstack/react-router";
import { GeneralSettingsEditor } from "@/components/admin/cms/GeneralSettingsEditor";
import { getAdminSettingsServerFn } from "@/lib/general-settings-server-functions";
export const Route = createFileRoute("/admin/_protected/cms/general-settings")({
  loader: () => getAdminSettingsServerFn(),
  head: () => ({
    meta: [
      { title: "General Settings | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});
function Page() {
  return <GeneralSettingsEditor initialResult={Route.useLoaderData()} />;
}
