import { createFileRoute } from "@tanstack/react-router";

import { AdminStoriesManager } from "@/components/admin/stories/AdminStoriesManager";
import { listStoriesServerFn } from "@/lib/admin-stories-server-functions";

export const Route = createFileRoute("/admin/_protected/stories")({
  loader: () => listStoriesServerFn(),
  head: () => ({
    meta: [
      { title: "Stories | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminStoriesPage,
});

function AdminStoriesPage() {
  return <AdminStoriesManager initialResult={Route.useLoaderData()} />;
}
