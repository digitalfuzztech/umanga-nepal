import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  HeartHandshake,
  Images,
  Inbox,
  Library,
  Newspaper,
} from "lucide-react";

import { AdminModuleCard, AdminPageHeader } from "@/components/admin/AdminPage";

const modules = [
  {
    title: "Inbox",
    description: "Review website enquiries and submissions.",
    to: "/admin/inbox",
    icon: Inbox,
  },
  {
    title: "Gallery",
    description: "Prepare and organize public gallery images.",
    to: "/admin/gallery",
    icon: Images,
  },
  {
    title: "Our Work",
    description: "Manage programs and Umanga initiatives.",
    to: "/admin/our-work",
    icon: HeartHandshake,
  },
  {
    title: "Stories",
    description: "Manage community and organizational stories.",
    to: "/admin/stories",
    icon: BookOpen,
  },
  {
    title: "News & Events",
    description: "Prepare news updates and upcoming events.",
    to: "/admin/news-events",
    icon: Newspaper,
  },
  {
    title: "Resources",
    description: "Manage guides, articles and wellbeing resources.",
    to: "/admin/resources",
    icon: Library,
  },
] as const;

export const Route = createFileRoute("/admin/_protected/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Umanga Nepal Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { admin } = Route.useRouteContext();

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description={`Welcome back. You are signed in as ${admin.email}.`}
      />
      <section className="mt-7">
        <h3 className="font-display text-lg font-bold text-slate-950">
          Content modules
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Choose a module to view its administration workspace.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <AdminModuleCard key={module.to} {...module} />
          ))}
        </div>
      </section>
    </>
  );
}
