import { useState, type ReactNode } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export interface CrudField {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea";
  options?: string[] | { label: string; value: string }[];
  colSpan?: 1 | 2;
  hidden?: (values: Record<string, any>) => boolean;
}

export function CrudDialog<T extends Record<string, any>>({
  trigger, title, description, fields, initial, submitLabel = "حفظ", onSubmit, maxWidth = "max-w-lg",
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  maxWidth?: string;
  fields: CrudField[];
  initial?: Partial<T>;
  submitLabel?: string;
  onSubmit: (values: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, any>>(initial ?? {});

  function set(name: string, v: any) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function submit() {
    const out: Record<string, any> = {};
    for (const f of fields) {
      const raw = values[f.name];
      out[f.name] = f.type === "number" ? Number(raw) || 0 : raw ?? "";
    }
    onSubmit(out as T);
    setOpen(false);
  }

  function onOpenChange(v: boolean) {
    if (v) setValues(initial ?? {});
    setOpen(v);
  }

  const visibleFields = fields.filter((f) => !(f.hidden && f.hidden(values)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={maxWidth}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          {visibleFields.map((f) => (
            <div key={f.name} className={f.colSpan === 2 ? "col-span-2" : "col-span-2 sm:col-span-1"}>
              <Label className="mb-1.5 block text-sm">{f.label}</Label>
              {f.type === "select" ? (
                <Select value={values[f.name] ?? ""} onValueChange={(v) => set(f.name, v)}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => {
                      const val = typeof o === "string" ? o : o.value;
                      const lbl = typeof o === "string" ? o : o.label;
                      return <SelectItem key={val} value={val}>{lbl}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              ) : f.type === "textarea" ? (
                <Textarea
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  className="resize-none"
                />
              ) : (
                <Input
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={submit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
