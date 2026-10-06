import {
  BookOpen,
  HeartHandshake,
  Images,
  Inbox,
  LayoutDashboard,
  Library,
  Newspaper,
  type LucideIcon,
} from "lucide-react";

export type AdminPath =
  | "/admin/dashboard"
  | "/admin/inbox"
  | "/admin/gallery"
  | "/admin/our-work"
  | "/admin/stories"
  | "/admin/news-events"
  | "/admin/resources";

type AdminNavigationItem = {
  label: string;
  to: AdminPath;
  icon: LucideIcon;
};

export const adminNavigationItems: AdminNavigationItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Inbox", to: "/admin/inbox", icon: Inbox },
  { label: "Gallery", to: "/admin/gallery", icon: Images },
  { label: "Our Work", to: "/admin/our-work", icon: HeartHandshake },
  { label: "Stories", to: "/admin/stories", icon: BookOpen },
  { label: "News & Events", to: "/admin/news-events", icon: Newspaper },
  { label: "Resources", to: "/admin/resources", icon: Library },
];
