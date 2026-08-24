"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, LayersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "./ThemeSwitcher";

const PRODUCTS = ["Form Library", "Creator", "Dashboard", "PDF"];

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
          SurveyJS Suite + Next.js Template
        </span>
      </Link>
      <span className="hidden shrink-0 items-center gap-1.5 lg:flex">
        {PRODUCTS.map((product) => (
          <span
            key={product}
            className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium"
          >
            {product}
          </span>
        ))}
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
  return (
    <div className="bg-background text-foreground flex h-svh min-h-svh flex-col">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur">
        <Brand />

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

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto h-full w-full max-w-[100rem] px-4 py-6 sm:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
