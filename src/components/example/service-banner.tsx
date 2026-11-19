// Demo only: shown when a Run Server-Side Workflows switch is off. The reference's <p>, with the classes of shadcn's
// Alert (whose role="alert" the banner doesn't have: it isn't an error).
export const bannerClass = "relative w-full rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-left text-sm text-amber-900";

export function ServiceBanner({ name, on }: { name: "VALIDATE_RESPONSES" | "LINT_DEFINITIONS"; on: boolean }) {
  if (on) return null;
  return (
    <p className={bannerClass}>
      <strong>{name === "VALIDATE_RESPONSES" ? "Response validation is disabled." : "Form schema checking is disabled."}</strong>
      {" "}Set <code>{name}=true</code> in <code>settings.env</code> and restart the app.
    </p>
  );
}
