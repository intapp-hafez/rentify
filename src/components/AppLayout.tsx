import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Bell, Menu, X, Plus } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { GlobalSearch } from "./GlobalSearch";
import { SubscriptionBadge } from "./SubscriptionBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppNotifications } from "@/hooks/useAppNotifications";

const quickActions = [
  { label: "إضافة وحدة", to: "/units" },
  { label: "إنشاء عقد", to: "/contracts" },
  { label: "تسجيل دفعة", to: "/payments" },
  { label: "طلب صيانة", to: "/maintenance" },
];

export function AppLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { notifications, unreadCount: unread, markRead } = useAppNotifications();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="hidden border-l border-border lg:block">
        <AppSidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full">
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <GlobalSearch />

          <div className="mr-auto flex items-center gap-3">
            <SubscriptionBadge />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="gold" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> إجراء سريع
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>إجراءات سريعة</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {quickActions.map((a) => (
                  <DropdownMenuItem key={a.to} asChild>
                    <Link to={a.to}>{a.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unread}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.slice(0, 5).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className="flex-col items-start gap-0.5 whitespace-normal text-sm leading-relaxed"
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      {!n.read && <span className="h-2 w-2 rounded-full bg-destructive" />}
                      {n.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{n.body}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="justify-center font-semibold text-primary">
                  <Link to="/notifications">عرض كل الإشعارات</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}