import { createFileRoute } from "@tanstack/react-router";
import { Building2, Code2, Tag, User } from "lucide-react";
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
    value: "Mr. Hafez Rahim",
  },
  {
    icon: Tag,
    label: "نسخة التطبيق",
    value: "v1.0.0",
  },
  {
    icon: Code2,
    label: "التقنية",
    value: "React + TanStack + Tailwind CSS",
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
          والتقارير في منصة واحدة.
        </p>
      </Card>
    </div>
  );
}
