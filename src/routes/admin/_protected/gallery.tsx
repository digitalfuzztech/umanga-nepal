import { createFileRoute } from "@tanstack/react-router";

import { AdminGalleryManager } from "@/components/admin/gallery/AdminGalleryManager";
import { listGalleryItemsServerFn } from "@/lib/admin-gallery-server-functions";

export const Route = createFileRoute("/admin/_protected/gallery")({
  loader: () => listGalleryItemsServerFn(),
  head: () => ({
    meta: [
      { title: "Gallery | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminGalleryPage,
});

function AdminGalleryPage() {
  const result = Route.useLoaderData();

  return <AdminGalleryManager initialResult={result} />;
}
