import { createFileRoute } from "@tanstack/react-router";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPage";

const inboxSections = [
  "Contact",
  "Volunteer",
  "Partnership Enquiry",
  "Support Us",
  "Invite Umanga",
  "Share Your Story",
  "Newsletter",
];

export const Route = createFileRoute("/admin/_protected/inbox")({
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
    <>
      <AdminPageHeader
        title="Inbox"
        description="Website enquiries and submissions will appear here."
      />
      <div
        className="mt-6 flex gap-2 overflow-x-auto pb-2"
        aria-label="Inbox categories"
      >
        {inboxSections.map((section, index) => (
          <span
            key={section}
            className={
              index === 0
                ? "shrink-0 rounded-full bg-sky-100 px-3.5 py-2 text-xs font-bold text-sky-900"
                : "shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-500"
            }
          >
            {section}
          </span>
        ))}
      </div>
      <AdminEmptyState
        title="No submissions yet."
        description="The inbox structure is ready. Public form connections will be added in a later phase."
      />
    </>
  );
}
