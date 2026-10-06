import { createFileRoute } from "@tanstack/react-router";

import { AdminOurWorkManager } from "@/components/admin/our-work/AdminOurWorkManager";
import { listOurWorkItemsServerFn } from "@/lib/admin-our-work-server-functions";

export const Route = createFileRoute("/admin/_protected/our-work")({
  loader: () => listOurWorkItemsServerFn(),
  head: () => ({
    meta: [
      { title: "Our Work | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOurWorkPage,
});

function AdminOurWorkPage() {
  const result = Route.useLoaderData();

  return <AdminOurWorkManager initialResult={result} />;
}
