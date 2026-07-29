import { useQuery } from "@tanstack/react-query";
import { differenceInDays, parseISO } from "date-fns";
import { getSubscription } from "@/api/subscriptions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Phone, Globe, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubscriptionAlertModal() {
  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading || !sub || !sub.end_date) return null;

  const remainingDays = differenceInDays(parseISO(sub.end_date), new Date());
  const showAlert = remainingDays <= 5;

  if (!showAlert) return null;

  return (
    <Dialog open={true}>
      <DialogContent
        className="max-w-md border-amber-500/40 bg-card p-6 shadow-2xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 ring-8 ring-amber-500/10">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground">
            تنبيه: انقضاء فترة الاشتراك
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4 text-center">
          <p className="text-sm font-medium leading-relaxed text-muted-foreground">
            اشتراكك الحالي يوشك على الانتهاء خلال{" "}
            <span className="font-bold text-amber-600">
              {remainingDays <= 0 ? "اليوم" : `${remainingDays} أيام`}
            </span>
            . ولن تتمكن من استخدام النظام بعد ذلك. يرجى التواصل فوراً مع الدعم الفني للتجديد وضمان استمرار الخدمة.
          </p>

          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">للتواصل والدعم الفني:</p>

            <div className="flex flex-col gap-2">
              <a
                href="https://wa.me/2001007419344"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition-hover hover:bg-emerald-700 shadow-sm"
              >
                <MessageSquare className="h-4 w-4" />
                <span>تواصل عبر واتساب</span>
                <span dir="ltr" className="inline-block font-mono">(+2001007419344)</span>
              </a>

              <a
                href="tel:+2001007419344"
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-hover hover:bg-accent"
              >
                <Phone className="h-4 w-4 text-primary" />
                <span>اتصال هاتفي</span>
                <span dir="ltr" className="inline-block font-mono">(+2001007419344)</span>
              </a>

              <a
                href="https://odooteams.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-primary transition-hover hover:bg-primary/5"
              >
                <Globe className="h-4 w-4" />
                الموقع الإلكتروني (odooteams.com)
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
