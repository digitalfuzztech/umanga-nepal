import { createFileRoute } from "@tanstack/react-router";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/admin/_protected/stories")({
  head: () => ({
    meta: [
      { title: "Stories | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminStoriesPage,
});

function AdminStoriesPage() {
  return (
    <>
      <AdminPageHeader
        title="Stories"
        description="Manage community and organizational stories."
        actionLabel="Add Story"
      />
      <AdminEmptyState description="Story management will be added in a later CMS phase." />
    </>
  );
}
