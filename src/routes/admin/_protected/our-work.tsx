import { createFileRoute } from "@tanstack/react-router";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/admin/_protected/our-work")({
  head: () => ({
    meta: [
      { title: "Our Work | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOurWorkPage,
});

function AdminOurWorkPage() {
  return (
    <>
      <AdminPageHeader
        title="Our Work"
        description="Manage Umanga Nepal programs and initiatives."
        actionLabel="Add Our Work"
      />
      <AdminEmptyState description="Program management will be connected after its database schema is introduced." />
    </>
  );
}
