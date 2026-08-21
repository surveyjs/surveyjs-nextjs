export type NavId = "claims" | "checkout" | "records";

export interface NavItem {
  readonly id: NavId;
  readonly label: string;
  readonly path: string;
  readonly description: string;
  readonly schemaId: string;
}

export const navItems: readonly NavItem[] = [
  {
    id: "claims",
    label: "Claims",
    path: "/claims",
    description: "Patient intake / medical-insurance form.",
    schemaId: "medical-form",
  },
  {
    id: "checkout",
    label: "Checkout",
    path: "/checkout",
    description: "Multi-step checkout wizard.",
    schemaId: "checkout",
  },
  {
    id: "records",
    label: "Records",
    path: "/records",
    description: "Browse and edit insurance-claim records.",
    schemaId: "insurance-claim",
  },
] as const;

export function getNavItem(id: NavId): NavItem {
  const item = navItems.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown nav id: ${id}`);
  return item;
}

export function isActiveRoute(pathname: string, routePath: string): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}
