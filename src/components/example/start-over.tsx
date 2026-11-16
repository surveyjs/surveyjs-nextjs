// Demo only: the "Start over" button in the action row of the nine Form Library pages that have one (not
// fill-together, not the Creator pages). The example's client component binds #start-over.
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StartOver({ initiallyDisabled = false }: { initiallyDisabled?: boolean }) {
  return (
    <button id="start-over" type="button" disabled={initiallyDisabled} className={cn(buttonVariants({ variant: "outline" }), "h-9 gap-1.5 px-3 font-semibold")}>
      <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 4 3 10 9 10" /><path d="M3.5 15a9 9 0 1 0 2.1-9.4L3 10" /></svg>
      Start over
    </button>
  );
}
