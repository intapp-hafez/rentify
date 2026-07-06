import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, ShieldCheck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "نظام Rentify لإدارة العقارات" },
      { name: "description", content: "إدارة العقارات والإيجارات والعقود والتحصيلات بسهولة واحترافية للسوق المصري." },
      { property: "og:title", content: "نظام Rentify لإدارة العقارات" },
      { property: "og:description", content: "إدارة العقارات والإيجارات بسهولة واحترافية" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand side */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-10 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src="/logo.png" alt="Rentify" className="h-12 w-12 rounded-xl bg-white p-1" width={48} height={48} />
          <span className="text-2xl font-extrabold">Rentify</span>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight">
            نظام Rentify لإدارة العقارات
          </h1>
          <p className="max-w-md text-lg text-primary-foreground/80">
            إدارة العقارات والإيجارات بسهولة واحترافية — عقود، تحصيلات، صيانة وتقارير ذكية في منصة واحدة.
          </p>
          <div className="grid max-w-md grid-cols-3 gap-4 pt-4">
            {[
              { icon: Building2, t: "العقارات" },
              { icon: ShieldCheck, t: "العقود" },
              { icon: BarChart3, t: "التقارير" },
            ].map((f) => (
              <div key={f.t} className="rounded-xl bg-white/10 p-4 text-center backdrop-blur">
                <f.icon className="mx-auto mb-2 h-6 w-6 text-gold" />
                <span className="text-sm font-semibold">{f.t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-primary-foreground/60">© 2026 Rentify — جميع الحقوق محفوظة</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-background p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/dashboard" });
          }}
          className="w-full max-w-sm space-y-5"
        >
          <div className="mb-2 flex items-center gap-3 lg:hidden">
            <img src="/logo.png" alt="Rentify" className="h-10 w-10 rounded-xl" width={40} height={40} />
            <span className="text-xl font-extrabold">Rentify</span>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-foreground">تسجيل الدخول</h2>
            <p className="mt-1 text-sm text-muted-foreground">مرحباً بعودتك، أدخل بياناتك للمتابعة</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">البريد الإلكتروني</label>
            <input
            type="email"
              defaultValue="admin@rentify.app"
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">كلمة المرور</label>
            <input
              type="password"
              defaultValue="123456"
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <Button type="submit" className="h-11 w-full text-base">تسجيل الدخول</Button>
          <button type="button" className="block w-full text-center text-sm text-accent hover:underline">
            نسيت كلمة المرور؟
          </button>
        </form>
      </div>
    </div>
  );
}
