import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Save, LogOut, Plus, X, Pencil, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllSettings, updateSetting, type SettingKey } from "@/api/settings";

export const Route = createFileRoute("/settings/")({
  head: () => ({ meta: [{ title: "الإعدادات — Rentify" }] }),
  component: SettingsIndex,
});

// ─── Editable List Component ──────────────────────────────────────────
function EditableList({
  title,
  settingKey,
  items,
  onSave,
  saving,
}: {
  title: string;
  settingKey: SettingKey;
  items: string[];
  onSave: (key: SettingKey, items: string[]) => void;
  saving: boolean;
}) {
  const [list, setList] = useState<string[]>(items);
  const [newItem, setNewItem] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  const isDirty = JSON.stringify(list) !== JSON.stringify(items);

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed || list.includes(trimmed)) return;
    setList([...list, trimmed]);
    setNewItem("");
  };

  const removeItem = (idx: number) => setList(list.filter((_, i) => i !== idx));

  const startEdit = (idx: number) => {
    setEditIdx(idx);
    setEditVal(list[idx]);
  };

  const confirmEdit = () => {
    if (editIdx === null) return;
    const trimmed = editVal.trim();
    if (!trimmed) return;
    const updated = [...list];
    updated[editIdx] = trimmed;
    setList(updated);
    setEditIdx(null);
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-foreground">
          {title} <span className="text-sm font-normal text-muted-foreground">({list.length})</span>
        </h3>
        {isDirty && (
          <Button size="sm" className="gap-1" onClick={() => onSave(settingKey, list)} disabled={saving}>
            <Save className="h-3.5 w-3.5" /> {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        )}
      </div>

      {/* Items */}
      <div className="mb-3 flex flex-wrap gap-2">
        {list.map((item, idx) => (
          <div
            key={idx}
            className="group flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
          >
            {editIdx === idx ? (
              <>
                <input
                  className="w-20 bg-transparent text-xs outline-none"
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmEdit()}
                  autoFocus
                />
                <button onClick={confirmEdit} className="text-success hover:text-success/80">
                  <Check className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <span>{item}</span>
                <button onClick={() => startEdit(idx)} className="hidden text-muted-foreground hover:text-foreground group-hover:inline-flex">
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={() => removeItem(idx)} className="hidden text-destructive hover:text-destructive/80 group-hover:inline-flex">
                  <X className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder={`إضافة ${title.split(" ")[0]}...`}
          className="h-8 text-sm"
        />
        <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={addItem}>
          <Plus className="h-3.5 w-3.5" /> إضافة
        </Button>
      </div>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────────────────────
function SettingsIndex() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [profileSaving, setProfileSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getAllSettings,
  });

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: SettingKey; value: string[] }) => updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("تم حفظ الإعداد بنجاح");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, phone },
    });
    setProfileSaving(false);
    if (error) toast.error(error.message);
    else toast.success("تم حفظ بيانات الحساب بنجاح");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* ─── بيانات الحساب ─── */}
      <Card className="p-5">
        <h3 className="mb-4 font-bold text-foreground">بيانات الحساب</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-sm">الاسم الكامل</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="اسمك الكامل" />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">رقم الهاتف</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم هاتفك" />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">البريد الإلكتروني</Label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{user?.email || "غير مسجل"}</span>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">معرف المستخدم</Label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground font-mono truncate">
              {user?.id || "-"}
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button className="gap-1" onClick={handleSaveProfile} disabled={profileSaving}>
            <Save className="h-4 w-4" /> {profileSaving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
          <Button variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </Button>
        </div>
      </Card>

      {/* ─── Editable Lists ─── */}
      {isLoading ? (
        <div className="mt-5 flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <EditableList
            title="المحافظات"
            settingKey="governorates"
            items={settings?.governorates || []}
            onSave={(key, value) => saveMutation.mutate({ key, value })}
            saving={saveMutation.isPending}
          />

          <EditableList
            title="أنواع العقارات"
            settingKey="property_types"
            items={settings?.property_types || []}
            onSave={(key, value) => saveMutation.mutate({ key, value })}
            saving={saveMutation.isPending}
          />

          {/* Unit Statuses — display only with colored badges */}
          <Card className="p-5">
            <h3 className="mb-4 font-bold text-foreground">حالات الوحدات</h3>
            <div className="mb-4 flex flex-wrap gap-3">
              {(settings?.unit_statuses || ["متاح", "مؤجر", "محجوز", "تحت الصيانة", "متأخر بالسداد", "عقد منتهي"]).map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">حالات الوحدات محددة مسبقاً وتُستخدم في جميع أنحاء النظام لضمان التوافق.</p>
          </Card>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Developer: Mr. Hafez Rahim +201007419344 — Rentify v1.0.0
      </p>
    </>
  );
}
