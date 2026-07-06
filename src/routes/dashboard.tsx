import { createFileRoute } from "@tanstack/react-router";
import { Building2, KeyRound, FileText, Wallet, TrendingUp, AlertTriangle, Home, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { topAreas, monthlyRevenue, egp } from "@/lib/mockData";
import { getDashboardStats } from "@/api/dashboard";
import { format } from "date-fns";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "لوحة التحكم — Rentify" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  const maxRev = Math.max(...monthlyRevenue.map((m) => m.value));

  if (isLoading) {
    return (
      <AppLayout title="لوحة التحكم" subtitle="نظرة عامة على أداء محفظتك العقارية">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  const occupancyRate = stats?.units.total 
    ? Math.round((stats.units.rented / stats.units.total) * 100) 
    : 0;

  return (
    <AppLayout title="لوحة التحكم" subtitle="نظرة عامة على أداء محفظتك العقارية">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* We assume 1 property "Rentify" for now, or just leave it as total properties. Let's make it fixed 1 for now or 0 if no units */}
        <KpiCard label="إجمالي العقارات" value={stats?.units.total ? "1" : "0"} hint="العقارات المدارة" icon={Building2} tone="primary" />
        
        <KpiCard 
          label="إجمالي الوحدات" 
          value={stats?.units.total.toString() || "0"} 
          hint={`${stats?.units.available || 0} شاغرة • ${stats?.units.rented || 0} مؤجرة`} 
          icon={KeyRound} 
          tone="accent" 
        />
        
        <KpiCard 
          label="العقود النشطة" 
          value={stats?.contracts.active.toString() || "0"} 
          hint="إجمالي العقود السارية" 
          icon={FileText} 
          tone="success" 
        />
        
        <KpiCard 
          label="تحصيلات الشهر" 
          value={egp(0)} // Placeholder until payments API is built
          hint="قريباً" 
          icon={Wallet} 
          tone="gold" 
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="نسبة الإشغال" value={`${occupancyRate}%`} icon={Home} tone="success" />
        <KpiCard label="متوسط الإيجار" value={egp(0)} icon={TrendingUp} tone="accent" />
        <KpiCard label="الوحدات تحت الصيانة" value={stats?.units.maintenance.toString() || "0"} icon={WrenchIcon} tone="warning" />
        <KpiCard label="عقود تنتهي قريباً" value="0" icon={AlertTriangle} tone="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 opacity-60">
          <h3 className="mb-4 font-bold text-foreground">الإيرادات الشهرية (بيانات تجريبية)</h3>
          <div className="flex h-56 items-end gap-3">
            {monthlyRevenue.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-accent transition-all hover:bg-primary"
                    style={{ height: `${(m.value / maxRev) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{m.month}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 opacity-60">
          <h3 className="mb-4 font-bold text-foreground">أعلى المناطق إشغالاً (تجريبي)</h3>
          <div className="space-y-4">
            {topAreas.map((a) => (
              <div key={a.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-foreground">{a.name}</span>
                  <span className="text-muted-foreground">{a.value}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${a.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h3 className="mb-4 font-bold text-foreground">أحدث طلبات الصيانة الحقيقية</h3>
        <div className="space-y-3">
          {stats?.maintenance && stats.maintenance.length > 0 ? (
            stats.maintenance.map((m: any) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div>
                  <p className="font-semibold text-foreground">{m.description} — {(m.units as any)?.title || 'وحدة غير معروفة'}</p>
                  <p className="text-xs text-muted-foreground">وحدة رقم: {(m.units as any)?.number || '-'} • {format(new Date(m.created_at), 'yyyy/MM/dd')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={m.status} />
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              لا توجد طلبات صيانة حالية.
            </div>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}

// Temporary icon mapping for missing Wrench since it wasn't imported at top
function WrenchIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}