import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

type AppLinkProps = Omit<ComponentProps<typeof Link>, "to"> & { to: string };

/** Link wrapper for paths that come from data files (CMS-ready strings). */
export function AppLink({ to, ...props }: AppLinkProps) {
  return <Link to={to as never} {...props} />;
}
