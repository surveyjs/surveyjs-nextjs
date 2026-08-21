import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AdminShell } from "@/components/AdminShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "SurveyJS + Next.js — server-rendered, JSON-driven forms",
  description:
    "Complex forms defined as JSON, rendered on the server by Next.js and styled with shadcn/ui through the SurveyJS theme adapter.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AdminShell>{children}</AdminShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
