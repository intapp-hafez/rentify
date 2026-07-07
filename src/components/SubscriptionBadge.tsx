import { useQuery } from "@tanstack/react-query";
import { differenceInDays, parseISO } from "date-fns";
import { getSubscription } from "@/api/subscriptions";
import { Crown, Calendar, Banknote } from "lucide-react";

export function SubscriptionBadge() {
  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading || !sub) return null;

  const remaining = differenceInDays(parseISO(sub.end_date), new Date());
  const isExpired = remaining < 0;
  const isUrgent = remaining <= 7 && !isExpired;

  const urgencyClasses = isExpired
    ? "bg-red-500/15 border-red-500/30 text-red-600"
    : isUrgent
      ? "bg-amber-500/15 border-amber-500/30 text-amber-700"
      : "bg-emerald-500/10 border-emerald-500/25 text-emerald-700";

  return (
    <div
      className={`hidden items-center gap-3 rounded-lg border px-3 py-1.5 text-xs font-medium lg:flex ${urgencyClasses}`}
      title={`من ${sub.start_date} إلى ${sub.end_date}`}
    >
      {/* Type */}
      <span className="flex items-center gap-1">
        <Crown className="h-3.5 w-3.5" />
        {sub.type}
      </span>

      <span className="h-3 w-px bg-current opacity-30" />

      {/* Value */}
      <span className="flex items-center gap-1">
        <Banknote className="h-3.5 w-3.5" />
        {Number(sub.value).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        EGP
      </span>

      <span className="h-3 w-px bg-current opacity-30" />

      {/* Countdown */}
      <span className="flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5" />
        {isExpired ? (
          <span className="font-bold">منتهي</span>
        ) : (
          <>
            <span className="font-bold tabular-nums">{remaining}</span>
            <span className="opacity-80">يوم متبقي</span>
          </>
        )}
      </span>
    </div>
  );
}
