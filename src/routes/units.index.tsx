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
import { getUnits, addUnit, updateUnit, deleteUnit } from "@/api/units";
import { getAllSettings } from "@/api/settings";
import { exportToExcel, importFromExcel, downloadTemplate } from "@/lib/excel";
import { egp } from "@/lib/mockData";
import type { Database } from "@/types/database.types";

type UnitRow = Database["public"]["Tables"]["units"]["Row"];

export const Route = createFileRoute("/units/")({
  head: () => ({ meta: [{ title: "الوحدات — Rentify" }] }),
  component: Units,
});

const unitStatuses = ["available", "rented", "maintenance"] as const;
const statusTranslations: Record<string, string> = {
  "available": "متاح",
  "rented": "مؤجر",
  "maintenance": "تحت الصيانة"
};

const ALL = "__all__";
const PAGE_SIZE = 5;

function Units() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch live settings for dropdowns
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getAllSettings,
  });

  // Fetch data
  const { data: units = [], isLoading } = useQuery({
    queryKey: ["units"],
    queryFn: getUnits,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: addUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("تم إضافة الوحدة بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: updateUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("تم تحديث الوحدة بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("تم حذف الوحدة بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const fields: CrudField[] = [
    { name: "number", label: "رقم الوحدة" },
    { name: "title", label: "اسم العقار / العنوان", colSpan: 2 },
    {
      name: "type",
      label: "النوع",
      type: "select",
      options: (settings?.property_types?.length
        ? settings.property_types
        : ["شقق سكنية", "فيلات", "مكاتب", "محلات تجارية", "مستودعات", "أراضي"]
      ),
    },
    {
      name: "city",
      label: "المدينة / المحافظة",
      type: "select",
      options: (settings?.governorates?.length
        ? settings.governorates
        : ["القاهرة", "الجيزة", "الإسكندرية"]
      ),
    },
    { name: "address", label: "العنوان التفصيلي" },
    { name: "floor", label: "الطابق", hidden: (v) => ["مستودعات", "أراضي"].includes(v.type) },
    { name: "area", label: "المساحة (م²)", type: "number" },
    { name: "rooms", label: "الغرف", type: "number", hidden: (v) => ["مستودعات", "أراضي", "محلات تجارية"].includes(v.type) },
    { name: "baths", label: "الحمامات", type: "number", hidden: (v) => ["مستودعات", "أراضي"].includes(v.type) },
    { name: "status", label: "الحالة", type: "select", options: ["available", "rented", "maintenance"] },
    { name: "rent_price", label: "الإيجار", type: "number" },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units
      .filter((u) => {
        if (statusFilter !== ALL && u.status !== statusFilter) return false;
        if (q && ![u.number, u.title, u.floor].some((v) => v?.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) =>
        sortDir === "asc" ? a.rent_price - b.rent_price : b.rent_price - a.rent_price,
      );
  }, [units, statusFilter, search, sortDir]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter(ALL);
    setSortDir("asc");
    setPage(1);
  };

  const handleExport = () => {
    const exportData = units.map(u => ({
      "رقم الوحدة": u.number,
      "اسم العقار / العنوان": u.title,
      "النوع": u.type,
      "المدينة / المحافظة": u.city,
      "العنوان التفصيلي": u.address,
      "الطابق": u.floor,
      "المساحة": u.area,
      "الغرف": u.rooms,
      "الحمامات": u.baths,
      "الحالة": u.status,
      "الإيجار": u.rent_price
    }));
    exportToExcel(exportData, "المنشآت_الوحدات");
  };

  const handleDownloadTemplate = () => {
    downloadTemplate([
      "number", "title", "type", "city", "address", "floor", "area", "rooms", "baths", "status", "rent_price"
    ], "Units_Template");
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
        // Map excel columns (which might be Arabic or English depending on the template they used)
        // Let's assume they used the english template headers we provided
        await addMutation.mutateAsync({
          number: row.number?.toString() || null,
          title: row.title || 'بدون اسم',
          type: row.type || 'apartment',
          city: row.city || null,
          address: row.address || null,
          floor: row.floor?.toString() || null,
          area: Number(row.area) || null,
          rooms: Number(row.rooms) || null,
          baths: Number(row.baths) || null,
          status: row.status || 'available',
          rent_price: Number(row.rent_price) || 0
        });
        successCount++;
      }
      
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success(`تم استيراد ${successCount} وحدة بنجاح`, { id: toastId });
    } catch (error: any) {
      toast.error(`فشل الاستيراد: ${error?.message || "تأكد من استخدام القالب الصحيح"}`, { id: toastId });
      console.error("Import Error:", error);
    } finally {
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const columns: Column<UnitRow>[] = [
    { key: "number", header: "رقم الوحدة", render: (r) => <Link to="/units/$id" params={{ id: r.id }} className="font-bold text-primary hover:underline">{r.number || "-"}</Link> },
    { key: "title", header: "العقار", render: (r) => r.title },
    { key: "city", header: "المدينة", render: (r) => (r as any).city || "-" },
    { key: "type", header: "النوع", render: (r) => r.type },
    { key: "floor", header: "الطابق", render: (r) => r.floor || "-" },
    { key: "area", header: "المساحة", render: (r) => r.area ? `${r.area} م²` : "-" },
    { key: "rooms", header: "الغرف", render: (r) => r.rooms || "-" },
    { key: "baths", header: "الحمامات", render: (r) => r.baths || "-" },
    { key: "rent_price", header: "الإيجار", render: (r) => egp(r.rent_price) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={statusTranslations[r.status] || r.status} /> },
    {
      key: "actions", header: "إجراءات", render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <CrudDialog<Omit<UnitRow, "id" | "created_at">> maxWidth="max-w-2xl" title="تعديل وحدة" fields={fields} initial={r} onSubmit={(v) => updateMutation.mutate({ id: r.id, ...v } as any)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>} />
          <ConfirmDelete description={`سيتم حذف الوحدة "${r.number || r.title}".`} onConfirm={() => deleteMutation.mutate(r.id)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>} />
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="الوحدات" subtitle="إدارة وحدات العقارات وحالتها">
      <div className="my-4 rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="بحث برقم الوحدة أو العقار" className="pr-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>كل الحالات</SelectItem>
              {unitStatuses.map((s) => <SelectItem key={s} value={s}>{statusTranslations[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-1" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
              <ArrowDownUp className="h-4 w-4" /> {sortDir === "asc" ? "الإيجار ↑" : "الإيجار ↓"}
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
        
        <CrudDialog<Omit<UnitRow, "id" | "created_at">> maxWidth="max-w-2xl" title="إضافة وحدة" fields={fields} onSubmit={(v) => addMutation.mutate({ ...v, title: v.title || 'بدون اسم', rent_price: v.rent_price || 0, type: v.type || 'شقق سكنية' } as any)}
          trigger={<Button className="gap-1"><Plus className="h-4 w-4" /> إضافة وحدة</Button>} />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div></div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          onRowClick={(r) => navigate({ to: "/units/$id", params: { id: r.id } })}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </AppLayout>
  );
}
