import { createFileRoute } from "@tanstack/react-router";
import { CmsHub } from "@/components/admin/cms/CmsHub";
export const Route = createFileRoute("/admin/_protected/cms/")({
  head: () => ({
    meta: [
      { title: "CMS | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CmsHub,
});
