import { createFileRoute } from "@tanstack/react-router";

import { AdminResourcesManager } from "@/components/admin/resources/AdminResourcesManager";
import { listResourcesServerFn } from "@/lib/admin-resources-server-functions";

export const Route = createFileRoute("/admin/_protected/resources")({
  loader: () => listResourcesServerFn(),
  head: () => ({
    meta: [
      { title: "Resources | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminResourcesPage,
});

function AdminResourcesPage() {
  return <AdminResourcesManager initialResult={Route.useLoaderData()} />;
}
