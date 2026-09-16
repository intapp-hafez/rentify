import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "نظام Rentify لإدارة العقارات" },
      { name: "description", content: "إدارة العقارات والإيجارات والعقود والتحصيلات بسهولة واحترافية للسوق المصري." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        navigate({ to: "/login", replace: true });
      }
    }
  }, [session, isLoading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm font-medium text-muted-foreground">جاري التحويل...</span>
      </div>
    </div>
  );
}
