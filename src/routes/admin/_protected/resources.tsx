import { createFileRoute } from "@tanstack/react-router";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/admin/_protected/resources")({
  head: () => ({
    meta: [
      { title: "Resources | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminResourcesPage,
});

function AdminResourcesPage() {
  return (
    <>
      <AdminPageHeader
        title="Resources"
        description="Manage guides, articles and mental-health resources."
        actionLabel="Add Resource"
      />
      <AdminEmptyState description="Resource management will be added in a later CMS phase." />
    </>
  );
}
