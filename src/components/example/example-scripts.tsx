"use client";
// Demo only: the page scripts every platform loads unchanged, after hydration: shared/ui/code-highlight.js
// (highlight.js on the Code tab) and shared/ui/page-tabs.js (the tabs, the panel, the sheet, the counters). They
// work on the server-rendered markup of the example layout, which React never re-renders. Then src/demo/host.ts
// starts the Data panel. Each runs once per page: modules are evaluated once, and startHost() is idempotent.
import { useEffect } from "react";
import { startHost } from "@/demo/host";
import "@/styles/code.css";

export function ExampleScripts() {
  useEffect(() => {
    void import("../../../shared/ui/code-highlight.js");
    // @ts-expect-error page-tabs.js is a classic script with no exports: importing it runs it
    void import("../../../shared/ui/page-tabs.js");
    startHost();
  }, []);
  return null;
}
