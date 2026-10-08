import { AdminPageHeader } from "@/components/admin/AdminPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { listNewsServerFn } from "@/lib/admin-news-server-functions";
import type { listEventsServerFn } from "@/lib/admin-events-server-functions";
import { AdminNewsManager } from "./AdminNewsManager";
import { AdminEventsManager } from "./AdminEventsManager";

export function AdminNewsEventsManager({
  news,
  events,
  today,
  tab,
  onTabChange,
}: {
  news: Awaited<ReturnType<typeof listNewsServerFn>>;
  events: Awaited<ReturnType<typeof listEventsServerFn>>;
  today: string;
  tab: "news" | "events";
  onTabChange: (tab: "news" | "events") => void;
}) {
  return (
    <>
      <AdminPageHeader
        title="News & Events"
        description="Manage public news articles and event information."
      />
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === "news" || value === "events") onTabChange(value);
        }}
        className="mt-6 min-w-0"
      >
        <TabsList
          aria-label="Content type"
          className="mb-6 h-11 border border-slate-200 bg-white"
        >
          <TabsTrigger
            value="news"
            className="h-9 px-5 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-900"
          >
            News
          </TabsTrigger>
          <TabsTrigger
            value="events"
            className="h-9 px-5 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-900"
          >
            Events
          </TabsTrigger>
        </TabsList>
        <TabsContent value="news">
          <AdminNewsManager initialResult={news} />
        </TabsContent>
        <TabsContent value="events">
          <AdminEventsManager initialResult={events} today={today} />
        </TabsContent>
      </Tabs>
    </>
  );
}
