import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { egp, paymentMethods, type DuePayment } from "@/lib/mockData";
import { toast } from "sonner";
import { z } from "zod";

const receiptSchema = z
  .string()
  .trim()
  .nonempty({ message: "يرجى إدخال رقم الإيصال" })
  .max(50, { message: "رقم الإيصال طويل جدًا" })
  .regex(/^[A-Za-z0-9-]+$/, { message: "أحرف وأرقام وشرطة فقط" });

export function PayNowDialog({ due }: { due: DuePayment }) {
  const { addPayment, payments } = useStore();
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [method, setMethod] = useState(paymentMethods[0]);

  function submit() {
    const parsed = receiptSchema.safeParse(receipt);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const value = parsed.data;
    const exists = payments.some(
      (p) => p.receipt.trim().toLowerCase() === value.toLowerCase(),
    );
    if (exists) {
      toast.error("رقم الإيصال مستخدم بالفعل، أدخل رقمًا فريدًا");
      return;
    }
    addPayment({
      receipt: value,
      tenant: due.tenant,
      unit: due.unit,
      amount: due.amount,
      method,
      date: due.dueDate,
      status: "مدفوع",
    });
    toast.success(`تم تسجيل دفعة ${due.month} كمدفوعة`);
    setOpen(false);
    setReceipt("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setReceipt(""); }}>
      <DialogTrigger asChild>
        <Button size="sm">ادفع الآن</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تسجيل دفعة — {due.month}</DialogTitle>
          <DialogDescription>أدخل رقم إيصال جديد لتأكيد السداد.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">المبلغ المستحق</p>
              <p className="mt-1 font-semibold text-foreground">{egp(due.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">تاريخ الاستحقاق</p>
              <p className="mt-1 font-semibold text-foreground">{due.dueDate}</p>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">رقم الإيصال الجديد</Label>
            <Input value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="مثال: RC-5006" />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">طريقة الدفع</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}>تأكيد الدفع</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}