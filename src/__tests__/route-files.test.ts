import { describe, it, expect } from "vitest";

// Quick smoke test: every units / tenants / contracts route file must exist,
// import successfully, and expose a valid TanStack Route object. This guards
// against the route-tree generation breaking when files are renamed or moved
// (the exact failure that previously produced 500s / blank pages).
const routeModules: Record<string, () => Promise<Record<string, unknown>>> = {
  "units (layout)": () => import("../routes/units"),
  "units.index": () => import("../routes/units.index"),
  "units.$id": () => import("../routes/units.$id"),
  "tenants (layout)": () => import("../routes/tenants"),
  "tenants.index": () => import("../routes/tenants.index"),
  "tenants.$id": () => import("../routes/tenants.$id"),
  "contracts (layout)": () => import("../routes/contracts"),
  "contracts.index": () => import("../routes/contracts.index"),
  "contracts.$id": () => import("../routes/contracts.$id"),
};

describe("units / tenants / contracts route files", () => {
  it.each(Object.entries(routeModules))(
    "loads %s and exposes a valid Route",
    async (_name, importer) => {
      const mod = await importer();
      const route = mod.Route as { options?: unknown; useParams?: unknown } | undefined;
      expect(route).toBeDefined();
      // Every route built via createFileRoute exposes these members.
      expect(route).toHaveProperty("options");
      expect(typeof route!.useParams).toBe("function");
      expect((route!.options as { component?: unknown }).component).toBeDefined();
    },
  );
});