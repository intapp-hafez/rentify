import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, FileText, Wallet,
  Wrench, BarChart3, Settings, KeyRound, ChevronLeft, Bell, LogOut, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sections: { title?: string; items: NavItem[] }[] = [
  { items: [{ label: "لوحة التحكم", to: "/dashboard", icon: LayoutDashboard }] },
  {
    title: "العقارات والعملاء",
    items: [
      { label: "الوحدات", to: "/units", icon: KeyRound },
      { label: "العملاء", to: "/tenants", icon: Users },
    ],
  },
  {
    title: "العمليات",
    items: [
      { label: "العقود", to: "/contracts", icon: FileText },
      { label: "التحصيلات", to: "/payments", icon: Wallet },
      { label: "التأمينات", to: "/deposits", icon: Shield },
      { label: "الصيانة", to: "/maintenance", icon: Wrench },
      { label: "الإشعارات", to: "/notifications", icon: Bell },
    ],
  },
  {
    title: "النظام",
    items: [
      { label: "التقارير", to: "/reports", icon: BarChart3 },
      { label: "الإعدادات", to: "/settings", icon: Settings },
    ],
  },
];

  export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const { user } = useAuth();
  
    const handleSignOut = async () => {
      await supabase.auth.signOut();
    };

    return (
      <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <img src="/logo.png" alt="Rentify" className="h-10 w-10 rounded-xl" width={40} height={40} />
          <div>
            <p className="text-base font-extrabold leading-tight">Rentify</p>
            <p className="text-xs text-sidebar-foreground/60">إدارة العقارات</p>
          </div>
        </div>
  
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section, i) => (
            <div key={i} className="mb-5">
              {section.title && (
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/40">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronLeft className="h-4 w-4" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
  
        <div className="border-t border-sidebar-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Avatar" className="h-9 w-9 rounded-full bg-white p-1" />
            <div className="text-xs">
              <p className="font-semibold max-w-[120px] truncate">{user?.user_metadata?.full_name || "مدير النظام"}</p>
              <p className="text-sidebar-foreground/60 max-w-[120px] truncate" title={user?.email}>{user?.email || "غير مسجل"}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="text-sidebar-foreground/60 hover:text-destructive transition-colors p-2" title="تسجيل الخروج">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    );
  }