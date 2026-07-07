import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { Plus, Wallet, AlertTriangle, CalendarCheck, TrendingUp, Pencil, Trash2, Search, ArrowDownUp, Download, Upload, FileSpreadsheet } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CrudDialog, type CrudField } from "@/components/CrudDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { getPayments, addPayment, updatePayment, deletePayment, type PaymentWithRelations } from "@/api/payments";
import { getContracts } from "@/api/contracts";
import { getUnits } from "@/api/units";
import { getTenants } from "@/api/tenants";
import { exportToExcel, importFromExcel, downloadTemplate } from "@/lib/excel";
import { egp, paymentMethods } from "@/lib/mockData";

export const Route = createFileRoute("/payments")({
  head: () => ({ meta: [{ title: "التحصيلات — Rentify" }] }),
  component: Payments,
});

const paymentStatuses = ["مدفوع", "متأخر", "مستحق"];
const ALL = "__all__";

type PaymentFormValues = Omit<PaymentWithRelations, "id" | "created_at" | "contracts" | "receipt_url"> & {
  notes?: string;
  bank_name?: string;
  account_number?: string;
  other_number?: string;
};

function Payments() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [contractFilter, setContractFilter] = useState(ALL);
  const [tenantFilter, setTenantFilter] = useState(ALL);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // Queries
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: getPayments,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: getContracts,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: getUnits,
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: getTenants,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: addPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("تم تسجيل الدفعة بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: updatePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("تم تحديث الدفعة بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("تم حذف الدفعة بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const fields: CrudField[] = [
    { name: "receipt_number", label: "رقم الإيصال" },
    { 
      name: "contract_id", 
      label: "العقد المربوط", 
      type: "select", 
      options: contracts.map((c) => ({ 
        value: c.id, 
        label: `${c.number || 'بدون رقم'} - ${c.tenants?.full_name}` 
      })) 
    },
    { name: "amount", label: "المبلغ", type: "number" },
    { name: "payment_method", label: "طريقة الدفع", type: "select", options: paymentMethods },
    { name: "bank_name", label: "اسم البنك", hidden: (v) => v.payment_method !== "تحويل بنكي" },
    { name: "account_number", label: "رقم الحساب", hidden: (v) => v.payment_method !== "تحويل بنكي" },
    { name: "other_number", label: "الرقم", hidden: (v) => !v.payment_method || v.payment_method === "نقدي" || v.payment_method === "تحويل بنكي" },
    { name: "payment_date", label: "التاريخ", type: "date" },
    { name: "status", label: "الحالة", type: "select", options: paymentStatuses },
    { name: "notes", label: "ملاحظات", type: "textarea", colSpan: 2 },
  ];

  const prepareSubmitData = (v: any) => {
    const payment_details: any = { notes: v.notes };
    if (v.payment_method === "تحويل بنكي") {
      payment_details.bank_name = v.bank_name;
      payment_details.account_number = v.account_number;
    } else if (v.payment_method && v.payment_method !== "نقدي") {
      payment_details.number = v.other_number;
    }
    const { notes, bank_name, account_number, other_number, ...rest } = v;
    return { ...rest, payment_details };
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Only show actually paid payments — due/overdue are tracked on the contract detail page
    return payments
      .filter((p) => p.status === "مدفوع")
      .filter((p) => {
        const c_num = p.contracts?.number || "";
        const t_name = p.contracts?.tenants?.full_name || "";
        const u_name = p.contracts?.units?.title || "";

        if (contractFilter !== ALL && c_num !== contractFilter) return false;
        if (tenantFilter !== ALL && t_name !== tenantFilter) return false;
        if (q && ![p.receipt_number || "", t_name, u_name].some((v) => v.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) =>
        sortDir === "desc" ? b.payment_date.localeCompare(a.payment_date) : a.payment_date.localeCompare(b.payment_date),
      );
  }, [payments, contractFilter, tenantFilter, search, sortDir]);

  const collected = filtered.filter((p) => p.status === "مدفوع").reduce((s, p) => s + p.amount, 0);
  const overdue = filtered.filter((p) => p.status === "متأخر").reduce((s, p) => s + p.amount, 0);
  const due = filtered.filter((p) => p.status === "مستحق").reduce((s, p) => s + p.amount, 0);

  const resetFilters = () => {
    setSearch("");
    setContractFilter(ALL);
    setTenantFilter(ALL);
  };

  const handleExport = () => {
    const exportData = payments.map(p => ({
      "رقم الإيصال": p.receipt_number,
      "اسم المستأجر": p.contracts?.tenants?.full_name || "غير محدد",
      "الوحدة": `${p.contracts?.units?.title} - ${p.contracts?.units?.number || ''}`,
      "المبلغ": p.amount,
      "طريقة الدفع": p.payment_method,
      "التاريخ": p.payment_date,
      "الحالة": p.status,
    }));
    exportToExcel(exportData, "المنشآت_التحصيلات");
  };

  const handleDownloadTemplate = () => {
    downloadTemplate([
      "receipt_number", "contract_id", "amount", "payment_method", "payment_date", "status"
    ], "Payments_Template");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("جاري تحليل الملف واستيراد البيانات...");

    try {
      const data = await importFromExcel(file);
      if (!data || data.length === 0) {
        toast.error("الملف فارغ أو لا يحتوي على بيانات صحيحة", { id: toastId });
        return;
      }

      let successCount = 0;
      for (const row of data) {
        if (!row.contract_id) continue;
        await addMutation.mutateAsync({
          receipt_number: row.receipt_number?.toString() || null,
          contract_id: row.contract_id,
          amount: Number(row.amount) || 0,
          payment_method: row.payment_method || 'نقدي',
          payment_date: row.payment_date || new Date().toISOString().split('T')[0],
          status: row.status || 'مدفوع',
          receipt_url: null
        });
        successCount++;
      }
      
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success(`تم استيراد ${successCount} دفعة بنجاح`, { id: toastId });
    } catch (error: any) {
      toast.error(`فشل الاستيراد: ${error?.message || "تأكد من استخدام القالب الصحيح"}`, { id: toastId });
      console.error("Import Error:", error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const columns: Column<PaymentWithRelations>[] = [
    { key: "receipt_number", header: "رقم الإيصال", render: (r) => <span className="font-bold">{r.receipt_number || "-"}</span> },
    { key: "tenant", header: "المستأجر", render: (r) => r.contracts?.tenants?.full_name || "-" },
    { key: "unit", header: "الوحدة", render: (r) => `${r.contracts?.units?.title} - ${r.contracts?.units?.number || ''}` },
    { key: "amount", header: "المبلغ", render: (r) => egp(r.amount) },
    { key: "payment_method", header: "طريقة الدفع", render: (r) => r.payment_method || "-" },
    { key: "payment_date", header: "التاريخ", render: (r) => r.payment_date },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status || "مدفوع"} /> },
    {
      key: "actions", header: "إجراءات", render: (r) => (
        <div className="flex gap-1">
          <CrudDialog<PaymentFormValues> 
            title="تعديل دفعة" 
            fields={fields} 
            initial={{
              ...r,
              notes: r.payment_details?.notes || "",
              bank_name: r.payment_details?.bank_name || "",
              account_number: r.payment_details?.account_number || "",
              other_number: r.payment_details?.number || "",
            }} 
            onSubmit={(v) => updateMutation.mutate({ id: r.id, ...prepareSubmitData(v) } as any)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>} />
          <ConfirmDelete description={`سيتم حذف الإيصال "${r.receipt_number || '-'}".`} onConfirm={() => deleteMutation.mutate(r.id)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>} />
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="التحصيلات المدفوعة" subtitle="سجل إيصالات الدفع المحصلة">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="مستحقة" value={egp(due)} icon={CalendarCheck} tone="accent" />
        <KpiCard label="متأخرات" value={egp(overdue)} icon={AlertTriangle} tone="warning" />
        <KpiCard label="تحصيلات" value={egp(collected)} icon={Wallet} tone="success" />
        <KpiCard label="عدد الإيصالات" value={String(filtered.length)} icon={TrendingUp} tone="gold" />
      </div>

      <div className="my-4 rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالإيصال أو المستأجر أو الوحدة" className="pr-9" />
          </div>
          <Select value={contractFilter} onValueChange={setContractFilter}>
            <SelectTrigger><SelectValue placeholder="العقد" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>كل العقود</SelectItem>
              {contracts.map((c) => <SelectItem key={c.id} value={c.number || ''}>{c.number} — {c.tenants?.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger><SelectValue placeholder="المستأجر" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>كل المستأجرين</SelectItem>
              {tenants.map((t) => <SelectItem key={t.id} value={t.full_name}>{t.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-1" onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}>
              <ArrowDownUp className="h-4 w-4" /> {sortDir === "desc" ? "الأحدث أولاً" : "الأقدم أولاً"}
            </Button>
            <Button variant="ghost" onClick={resetFilters}>مسح</Button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1 text-muted-foreground" onClick={handleExport}>
            <Download className="h-4 w-4" /> تصدير Excel
          </Button>
          <Button variant="outline" className="gap-1 text-muted-foreground" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="h-4 w-4" /> تحميل القالب
          </Button>
          <Button variant="outline" className="gap-1 text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> استيراد Excel
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
        </div>

        <CrudDialog<PaymentFormValues> 
          title="تسجيل دفعة" 
          fields={fields} 
          onSubmit={(v) => {
            const data = prepareSubmitData(v);
            addMutation.mutate({ ...data, status: data.status || 'مدفوع', payment_method: data.payment_method || 'نقدي' } as any);
          }}
          trigger={<Button className="gap-1"><Plus className="h-4 w-4" /> تسجيل دفعة</Button>} />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div></div>
      ) : (
        <DataTable columns={columns} rows={filtered} />
      )}
    </AppLayout>
  );
}
