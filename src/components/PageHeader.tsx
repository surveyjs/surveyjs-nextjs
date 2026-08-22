import Link from "next/link";
import { Code2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  configureHref,
  customized,
}: {
  title: string;
  description: string;
  configureHref?: string;
  customized: boolean;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {customized && <Badge variant="secondary">Custom JSON</Badge>}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      {configureHref && (
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link href={configureHref}>
          <Code2Icon />
          Configure Survey
        </Link>
      </Button>
      )}
    </div>
  );
}
