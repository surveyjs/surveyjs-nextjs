"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRightIcon, LayersIcon, MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { ThemeSwitcher } from "./ThemeSwitcher";

const SIDEBAR_WIDTH = "17rem";

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden lg:gap-4">
      <Link
        href="/"
        className="flex min-w-0 items-center gap-2 text-inherit hover:underline"
      >
        <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
          <LayersIcon className="size-4" />
        </span>
        <span className="truncate text-sm font-semibold">
          SurveyJS + Next.js Template
        </span>
      </Link>
      <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
        <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
          MIT
        </span>
        <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
          shadcn/ui
        </span>
      </span>
      <span className="bg-border hidden h-5 w-px shrink-0 lg:inline-block" />
      <a
        href="https://surveyjs.io/documentation"
        target="_blank"
        rel="noreferrer"
        aria-label="Documentation"
        title="Documentation"
        className="text-muted-foreground hover:text-foreground hidden shrink-0 items-center gap-1 text-xs sm:flex"
      >
        <span className="hidden lg:inline">Documentation</span>
        <ArrowUpRightIcon className="size-3.5" />
      </a>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isWide = pathname.endsWith("/configure");

  return (
    <div className="bg-background text-foreground flex h-svh min-h-svh flex-col">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
            >
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b">
              <SheetTitle className="text-left">
                <Brand />
              </SheetTitle>
            </SheetHeader>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="hidden lg:flex">
          <Brand />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://github.com/surveyjs/surveyjs-nextjs"
              target="_blank"
              rel="noreferrer"
            >
              Source
            </a>
          </Button>
          <ThemeSwitcher />
        </div>
      </header>

      <div className="flex min-h-0 flex-1" style={{ height: 0 }}>
        <aside
          className="bg-sidebar text-sidebar-foreground hidden h-full shrink-0 overflow-y-auto border-r lg:block"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <Sidebar />
        </aside>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div
            className={
              isWide
                ? "h-full w-full px-4 py-4 sm:px-6"
                : "mx-auto h-full w-full max-w-[96rem] px-4 py-6 sm:px-6 lg:py-8"
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
