import Link from "next/link";
import { Code2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  configureHref,
}: {
  title: string;
  description: string;
  configureHref?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      {configureHref && (
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href={configureHref}>
            <Code2Icon />
            Configure Survey JSON
          </Link>
        </Button>
      )}
    </div>
  );
}
