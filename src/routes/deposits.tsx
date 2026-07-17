import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CrudDialog, type CrudField } from "@/components/CrudDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { getDeposits, updateDeposit, deleteDeposit, type DepositWithRelations } from "@/api/deposits";
import { egp } from "@/lib/mockData";

export const Route = createFileRoute("/deposits")({
  head: () => ({ meta: [{ title: "التأمينات — Rentify" }] }),
  component: Deposits,
});

const depositStatuses = [
  { value: "held", label: "محتجز" },
  { value: "returned", label: "مسترد" },
  { value: "deducted", label: "مخصوم" },
  { value: "transferred", label: "مُرحّل" },
];

function getStatusLabel(status: string) {
  return depositStatuses.find((s) => s.value === status)?.label || status;
}

function Deposits() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data: deposits = [], isLoading, isError, error } = useQuery({
    queryKey: ["deposits"],
    queryFn: getDeposits,
    throwOnError: false,
  });

  const updateMutation = useMutation({
    mutationFn: updateDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      toast.success("تم تحديث التأمين بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      toast.success("تم حذف التأمين بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const fields: CrudField[] = [
    { name: "amount", label: "المبلغ", type: "number" },
    {
      name: "status",
      label: "الحالة",
      type: "select",
      options: depositStatuses,
    },
    { name: "notes", label: "ملاحظات", type: "textarea", colSpan: 2 },
  ];

  const columns: Column<DepositWithRelations>[] = [
    { key: "tenant_id", header: "المستأجر", render: (r) => r.tenants?.full_name || "-" },
    { key: "contract_id", header: "رقم العقد", render: (r) => <Link to="/contracts/$id" params={{ id: r.contract_id }} className="text-primary hover:underline">{r.contracts?.number || "عرض العقد"}</Link> },
    { key: "amount", header: "المبلغ", render: (r) => egp(r.amount) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={getStatusLabel(r.status)} /> },
    { key: "notes", header: "ملاحظات", render: (r) => r.notes || "-" },
    {
      key: "actions", header: "إجراءات", render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <CrudDialog<Omit<DepositWithRelations, "id" | "created_at" | "contracts" | "tenants">> 
            title="تعديل حالة التأمين" 
            fields={fields} 
            initial={r} 
            onSubmit={(v) => updateMutation.mutate({ id: r.id, ...v } as any)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>} />
          <ConfirmDelete description={`سيتم حذف تأمين العقد نهائياً.`} onConfirm={() => deleteMutation.mutate(r.id)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>} />
        </div>
      ),
    },
  ];

  if (isError) {
    return (
      <AppLayout title="التأمينات">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <h2 className="text-lg font-bold mb-2">خطأ في تحميل البيانات</h2>
          <p>{error?.message}</p>
          <p className="mt-4 text-sm font-semibold">
            Did you run the SQL migration `create_deposits_table.sql` in Supabase?
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="التأمينات"
      subtitle="إدارة تأمينات العقود السارية والمنتهية"
    >
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={deposits}
            page={page}
            defaultPageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </div>
    </AppLayout>
  );
}
