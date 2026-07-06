import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { Plus, Pencil, Trash2, Search, ArrowDownUp, Download, Upload, FileSpreadsheet } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CrudDialog, type CrudField } from "@/components/CrudDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { getTenants, addTenant, updateTenant, deleteTenant } from "@/api/tenants";
import { exportToExcel, importFromExcel, downloadTemplate } from "@/lib/excel";
import type { Database } from "@/types/database.types";

type TenantRow = Database["public"]["Tables"]["tenants"]["Row"];

export const Route = createFileRoute("/tenants/")({
  head: () => ({ meta: [{ title: "العملاء — Rentify" }] }),
  component: Tenants,
});

const tenantStatuses = ["نشط", "متأخر بالسداد"] as const;
const ALL = "__all__";
const PAGE_SIZE = 5;

function Tenants() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch data
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: getTenants,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: addTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("تم إضافة المستأجر بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: updateTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("تم تحديث بيانات المستأجر بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("تم حذف المستأجر بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const fields: CrudField[] = [
    { name: "full_name", label: "الاسم", colSpan: 2 },
    { name: "civil_id", label: "الرقم القومي / المدني" },
    { name: "phone", label: "الهاتف" },
    { name: "email", label: "البريد الإلكتروني" },
    { name: "job", label: "جهة العمل" },
    { name: "status", label: "الحالة", type: "select", options: ["نشط", "متأخر بالسداد"] },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants
      .filter((t) => {
        if (statusFilter !== ALL && t.status !== statusFilter) return false;
        if (q && ![t.full_name, t.civil_id, t.phone, t.job, t.email].some((v) => v?.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) =>
        sortDir === "asc" ? a.full_name.localeCompare(b.full_name) : b.full_name.localeCompare(a.full_name),
      );
  }, [tenants, statusFilter, search, sortDir]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter(ALL);
    setSortDir("asc");
    setPage(1);
  };

  const handleExport = () => {
    const exportData = tenants.map(t => ({
      "الاسم": t.full_name,
      "الرقم القومي": t.civil_id,
      "الهاتف": t.phone,
      "البريد الإلكتروني": t.email,
      "جهة العمل": t.job,
      "الحالة": t.status,
    }));
    exportToExcel(exportData, "المنشآت_العملاء");
  };

  const handleDownloadTemplate = () => {
    downloadTemplate([
      "full_name", "civil_id", "phone", "email", "job", "status"
    ], "Tenants_Template");
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
        await addMutation.mutateAsync({
          full_name: row.full_name || 'بدون اسم',
          civil_id: row.civil_id?.toString() || null,
          phone: row.phone?.toString() || null,
          email: row.email || null,
          job: row.job || null,
          status: row.status || 'نشط'
        });
        successCount++;
      }
      
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(`تم استيراد ${successCount} عميل بنجاح`, { id: toastId });
    } catch (error: any) {
      toast.error(`فشل الاستيراد: ${error?.message || "تأكد من استخدام القالب الصحيح"}`, { id: toastId });
      console.error("Import Error:", error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const columns: Column<TenantRow>[] = [
    { key: "full_name", header: "الاسم", render: (r) => <Link to="/tenants/$id" params={{ id: r.id }} className="font-bold text-primary hover:underline">{r.full_name}</Link> },
    { key: "civil_id", header: "الرقم القومي", render: (r) => r.civil_id || "-" },
    { key: "phone", header: "الهاتف", render: (r) => <span dir="ltr" className="inline-block">{r.phone || "-"}</span> },
    { key: "job", header: "جهة العمل", render: (r) => r.job || "-" },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status || "نشط"} /> },
    {
      key: "actions", header: "إجراءات", render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <CrudDialog<Omit<TenantRow, "id" | "user_id" | "created_at">> title="تعديل مستأجر" fields={fields} initial={r} onSubmit={(v) => updateMutation.mutate({ id: r.id, ...v } as any)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>} />
          <ConfirmDelete description={`سيتم حذف المستأجر "${r.full_name}".`} onConfirm={() => deleteMutation.mutate(r.id)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>} />
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="العملاء والمستأجرون" subtitle="بيانات المستأجرين والملاك والوسطاء">
      <div className="my-4 rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="بحث بالاسم أو الرقم القومي أو الهاتف" className="pr-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>كل الحالات</SelectItem>
              {tenantStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2 md:col-span-2 xl:col-span-2">
            <Button variant="outline" className="flex-1 gap-1" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
              <ArrowDownUp className="h-4 w-4" /> {sortDir === "asc" ? "أ-ي" : "ي-أ"}
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
        
        <CrudDialog<Omit<TenantRow, "id" | "user_id" | "created_at">> title="إضافة مستأجر" fields={fields} onSubmit={(v) => addMutation.mutate({ ...v, full_name: v.full_name || 'بدون اسم' } as any)}
          trigger={<Button className="gap-1"><Plus className="h-4 w-4" /> إضافة مستأجر</Button>} />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div></div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          onRowClick={(r) => navigate({ to: "/tenants/$id", params: { id: r.id } })}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </AppLayout>
  );
}
