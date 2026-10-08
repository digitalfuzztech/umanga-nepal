import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  FileText,
  Heart,
  Image,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

const groups: {
  title: string;
  items: {
    name: string;
    description: string;
    icon: LucideIcon;
    to?:
      | "/admin/cms/general-settings"
      | "/admin/stories"
      | "/admin/resources"
      | "/admin/news-events"
      | "/admin/our-work"
      | "/admin/gallery";
  }[];
}[] = [
  {
    title: "Global",
    items: [
      {
        name: "General Settings",
        description:
          "Branding, contact details, social profiles and global SEO.",
        icon: Settings,
        to: "/admin/cms/general-settings",
      },
    ],
  },
  {
    title: "Main Pages",
    items: [
      {
        name: "Homepage",
        description: "Homepage sections and content.",
        icon: LayoutDashboard,
      },
      {
        name: "About",
        description: "Organization and team information.",
        icon: Users,
      },
      {
        name: "Stories",
        description: "Manage published stories.",
        icon: BookOpen,
        to: "/admin/stories",
      },
      {
        name: "Resources",
        description: "Manage articles and guides.",
        icon: FileText,
        to: "/admin/resources",
      },
      {
        name: "News",
        description: "Manage news articles.",
        icon: FileText,
        to: "/admin/news-events",
      },
      {
        name: "Events",
        description: "Manage event information.",
        icon: CalendarDays,
        to: "/admin/news-events",
      },
      {
        name: "Our Work",
        description: "Manage programs and initiatives.",
        icon: Heart,
        to: "/admin/our-work",
      },
      {
        name: "Gallery",
        description: "Manage photos and albums.",
        icon: Image,
        to: "/admin/gallery",
      },
    ],
  },
  {
    title: "Get Involved",
    items: [
      "Get Involved",
      "Volunteer",
      "Partner With Us",
      "Support Us",
      "Invite Umanga",
      "Share Your Story",
    ].map((name) => ({
      name,
      description: `${name} page content.`,
      icon: Users,
    })),
  },
  {
    title: "Support / Contact",
    items: ["Contact", "Get Support", "Impact"].map((name) => ({
      name,
      description: `${name} page content.`,
      icon: Heart,
    })),
  },
  {
    title: "Legal",
    items: ["Privacy Policy", "Terms"].map((name) => ({
      name,
      description: `${name} content.`,
      icon: FileText,
    })),
  },
];
export function CmsHub() {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-2xl font-bold">CMS</h2>
        <p className="mt-2 text-sm text-slate-600">
          Manage website content and global settings.
        </p>
      </header>
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h3 className="mb-3 text-sm font-bold text-slate-700">
            {group.title}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <div
                key={item.name}
                className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-5"
              >
                <item.icon className="mb-3 size-5 text-sky-700" aria-hidden />
                <h4 className="font-semibold">{item.name}</h4>
                <p className="mt-1 flex-1 text-sm text-slate-600">
                  {item.description}
                </p>
                {item.to ? (
                  <Link
                    to={item.to}
                    aria-label={`Manage ${item.name}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:underline focus-visible:outline-2 focus-visible:outline-sky-500"
                  >
                    Manage <ArrowRight className="size-4" aria-hidden />
                  </Link>
                ) : (
                  <span className="mt-4 text-xs text-slate-500">
                    Editor planned for a later phase
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
