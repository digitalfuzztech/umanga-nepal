import { createFileRoute } from "@tanstack/react-router";

import { AdminInboxManager } from "@/components/admin/inbox/AdminInboxManager";
import { parseInboxSearch } from "@/lib/admin-inbox-input";
import {
  getInboxServerFn,
  listInboxServerFn,
} from "@/lib/admin-inbox-server-functions";

export const Route = createFileRoute("/admin/_protected/inbox")({
  validateSearch: parseInboxSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { thread, ...filters } }) => ({
    list: await listInboxServerFn({ data: filters }),
    detail: thread ? await getInboxServerFn({ data: { id: thread } }) : null,
  }),
  head: () => ({
    meta: [
      { title: "Inbox | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminInboxPage,
});

function AdminInboxPage() {
  return (
    <AdminInboxManager
      data={Route.useLoaderData()}
      search={Route.useSearch()}
    />
  );
}
