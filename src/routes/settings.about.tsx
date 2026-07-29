import { createFileRoute } from "@tanstack/react-router";
import { Building2, Tag, User, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/settings/about")({
  head: () => ({ meta: [{ title: "حول Rentify" }] }),
  component: AboutPage,
});

const appInfo = [
  {
    icon: Building2,
    label: "اسم النظام",
    value: "Rentify — نظام إدارة العقارات والإيجارات",
  },
  {
    icon: User,
    label: "المطور",
    value: "Mr. Hafez Rahim +201007419344",
  },
  {
    icon: Tag,
    label: "نسخة التطبيق",
    value: "v1.0.0",
  },
];

function AboutPage() {
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <img
            src="/logo.png"
            alt="Rentify Logo"
            className="h-20 w-20"
            width={80}
            height={80}
          />
          <div>
            <h2 className="text-2xl font-extrabold text-foreground">Rentify</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              نظام متكامل لإدارة العقارات والإيجارات والعقود والتحصيلات
            </p>
          </div>
        </div>
      </Card>

      {/* Declaration Card */}
      <Card className="border-amber-500/40 bg-amber-500/5 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-amber-700 dark:text-amber-500">
              إقرار وتنويه الخدمة / Declaration
            </h3>
            <p className="text-sm font-semibold leading-relaxed text-foreground">
              عزيزي العميل، اشتراكك الحالي لا يشمل: النسخ الاحتياطي، الاستعادة، والحماية المتقدمة. لذا يرجى التأكد من أخذ نسخ احتياطية بشكل دوري.
            </p>
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
              Dear client your current subscription does not include Backup, Restore, and Advanced Security, so kindly make sure of taking backups regularly.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 text-lg font-bold text-foreground">معلومات النظام</h3>
        <div className="space-y-4">
          {appInfo.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-lg border border-border p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="font-semibold text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-lg font-bold text-foreground">حقوق النشر</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          © 2026 Rentify. جميع الحقوق محفوظة. تم تطوير هذا النظام لتبسيط إدارة العقارات
          والإيجارات للسوق المصري، ويوفر أدوات متكاملة لمتابعة العقود والدفعات والصيانة
          والتقارير في نظام واحد.
        </p>
      </Card>
    </div>
  );
}
