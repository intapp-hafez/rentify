import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { DetailGrid, SectionTitle, EmptyState } from "@/components/DetailField";
import { egp } from "@/lib/mockData";
import { useQuery } from "@tanstack/react-query";
import { getUnits } from "@/api/units";
import { getContracts } from "@/api/contracts";
import { getPayments, type PaymentWithRelations } from "@/api/payments";

export const Route = createFileRoute("/units/$id")({
  head: () => ({ meta: [{ title: "تفاصيل الوحدة — Rentify" }] }),
  component: UnitDetail,
});

function UnitDetail() {
  const { id } = Route.useParams();
  const router = useRouter();

  const { data: units = [], isLoading: loadingUnits } = useQuery({ queryKey: ["units"], queryFn: getUnits });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: getContracts });
  const { data: payments = [] } = useQuery({ queryKey: ["payments"], queryFn: getPayments });

  if (loadingUnits) {
    return <AppLayout title="جاري التحميل..."><div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div></div></AppLayout>;
  }

  const unit = units.find((u) => u.id === id);

  if (!unit) {
    return (
      <AppLayout title="الوحدة غير موجودة">
        <EmptyState>لم يتم العثور على هذه الوحدة. <Button variant="link" onClick={() => router.navigate({ to: "/units" })}>العودة للوحدات</Button></EmptyState>
      </AppLayout>
    );
  }

  const contract = contracts.find((c) => c.unit_id === unit.id && c.status !== 'terminated');
  const unitPayments = payments.filter((p) => p.contracts?.unit_id === unit.id);

  const payColumns: Column<PaymentWithRelations>[] = [
    { key: "receipt_number", header: "الإيصال", render: (r) => r.receipt_number || "-" },
    { key: "amount", header: "المبلغ", render: (r) => egp(r.amount) },
    { key: "payment_method", header: "طريقة الدفع", render: (r) => r.payment_method || "-" },
    { key: "payment_date", header: "التاريخ", render: (r) => r.payment_date },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status || "مدفوع"} /> },
  ];

  return (
    <AppLayout title={`وحدة ${unit.number || 'بدون رقم'}`} subtitle={unit.title}>
      <Button asChild variant="outline" size="sm" className="mb-4 gap-1">
        <Link to="/units"><ArrowRight className="h-4 w-4" /> الوحدات</Link>
      </Button>
      <DetailGrid items={[
        { label: "العقار", value: unit.title },
        { label: "النوع", value: unit.type },
        { label: "المدينة", value: unit.city || "-" },
        { label: "العنوان التفصيلي", value: unit.address || "-" },
        { label: "الطابق", value: unit.floor || "-" },
        { label: "المساحة", value: unit.area ? `${unit.area} م²` : "-" },
        { label: "الغرف", value: unit.rooms || "-" },
        { label: "الحمامات", value: unit.baths || "-" },
        { label: "الإيجار", value: egp(unit.rent_price) },
        { label: "الحالة", value: <StatusBadge status={unit.status || "متاح"} /> },
        { label: "العقد الحالي", value: contract ? <Link to="/contracts/$id" params={{ id: contract.id }} className="text-primary hover:underline">{contract.number || 'عرض العقد'}</Link> : "—" },
        { label: "المستأجر", value: contract?.tenants?.full_name ?? "—" },
      ]} />
      <SectionTitle>سجل الدفعات</SectionTitle>
      {unitPayments.length ? <DataTable columns={payColumns} rows={unitPayments} /> : <EmptyState>لا توجد دفعات مسجلة لهذه الوحدة.</EmptyState>}
    </AppLayout>
  );
}
