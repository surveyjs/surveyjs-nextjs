"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardListIcon,
  ShoppingCartIcon,
  TableIcon,
  type LucideIcon,
} from "lucide-react";
import { isActiveRoute, navItems, type NavId } from "@/schemas";
import { cn } from "@/lib/utils";

const ICONS: Record<NavId, LucideIcon> = {
  claims: ClipboardListIcon,
  checkout: ShoppingCartIcon,
  records: TableIcon,
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1 p-3">
      {navItems.map((item) => {
        const active = isActiveRoute(pathname, item.path);
        const Icon = ICONS[item.id];
        return (
          <Link
            key={item.id}
            href={item.path}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                active
                  ? "text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground",
              )}
            />
            <span className="flex flex-col gap-0.5">
              <span>{item.label}</span>
              <span className="text-muted-foreground text-xs leading-tight">
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
