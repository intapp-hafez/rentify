import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

const tabs = [
  { to: "/settings", label: "الإعدادات العامة" },
  { to: "/settings/about", label: "حول Rentify" },
];

function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAbout = pathname === "/settings/about";

  return (
    <AppLayout
      title={isAbout ? "حول Rentify" : "الإعدادات"}
      subtitle={
        isAbout
          ? "معلومات النظام والمطور ونسخة التطبيق"
          : "الصلاحيات والبيانات الأساسية للنظام"
      }
    >
      <div className="mb-5 flex gap-1 rounded-lg border border-border bg-card p-1">
        {tabs.map((tab) => {
          const active = pathname === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </AppLayout>
  );
}
