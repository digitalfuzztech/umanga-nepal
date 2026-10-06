import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPage";

type ContentType = "News" | "Events";

export const Route = createFileRoute("/admin/_protected/news-events")({
  head: () => ({
    meta: [
      { title: "News & Events | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminNewsEventsPage,
});

function AdminNewsEventsPage() {
  const [activeType, setActiveType] = useState<ContentType>("News");

  return (
    <>
      <AdminPageHeader
        title="News & Events"
        description="Manage organizational updates and upcoming events."
      />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div
          className="inline-flex rounded-xl border border-slate-200 bg-white p-1"
          role="tablist"
        >
          {(["News", "Events"] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={activeType === type}
              onClick={() => setActiveType(type)}
              className={
                activeType === type
                  ? "rounded-lg bg-sky-100 px-4 py-2 text-sm font-bold text-sky-900"
                  : "rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
              }
            >
              {type}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled
          className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white opacity-55"
          title="Available in a later phase"
        >
          Add {activeType === "News" ? "News" : "Event"}
        </button>
      </div>
      <AdminEmptyState
        title={`No ${activeType.toLowerCase()} yet.`}
        description={`${activeType} management will be connected in a later CMS phase.`}
      />
    </>
  );
}
