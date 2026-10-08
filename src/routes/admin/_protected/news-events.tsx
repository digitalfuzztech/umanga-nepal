import { createFileRoute } from "@tanstack/react-router";
import { AdminNewsEventsManager } from "@/components/admin/news-events/AdminNewsEventsManager";
import { kathmanduCalendarDate } from "@/components/admin/news-events/news-events-ui";
import { listNewsServerFn } from "@/lib/admin-news-server-functions";
import { listEventsServerFn } from "@/lib/admin-events-server-functions";

export const Route = createFileRoute("/admin/_protected/news-events")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab: "news" | "events" } => ({
    tab: search["tab"] === "events" ? "events" : "news",
  }),
  loader: async () => {
    const [news, events] = await Promise.all([
      listNewsServerFn(),
      listEventsServerFn(),
    ]);
    return { news, events, today: kathmanduCalendarDate() };
  },
  head: () => ({
    meta: [
      { title: "News & Events | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminNewsEventsPage,
});
function AdminNewsEventsPage() {
  const data = Route.useLoaderData();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <AdminNewsEventsManager
      {...data}
      tab={tab}
      onTabChange={(tab) => {
        void navigate({ search: { tab } });
      }}
    />
  );
}
