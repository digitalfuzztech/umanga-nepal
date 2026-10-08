import {
  Inbox,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type AdminPath =
  | "/admin/dashboard"
  | "/admin/inbox"
  | "/admin/gallery"
  | "/admin/our-work"
  | "/admin/stories"
  | "/admin/news-events"
  | "/admin/resources"
  | "/admin/cms";

type AdminNavigationItem = {
  label: string;
  to: AdminPath;
  icon: LucideIcon;
};

export const adminNavigationItems: AdminNavigationItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Inbox", to: "/admin/inbox", icon: Inbox },
  { label: "CMS", to: "/admin/cms", icon: Settings },
];
