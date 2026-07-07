import { useState } from "react";
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
import { addPayment } from "@/api/payments";
import { useQueryClient } from "@tanstack/react-query";
import { egp, paymentMethods } from "@/lib/mockData";
import { toast } from "sonner";

interface PayNowDialogProps {
  contractId: string;
  amount: number;
  dueDate: string;
  installment: number;
}

export function PayNowDialog({ contractId, amount, dueDate, installment }: PayNowDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [method, setMethod] = useState(paymentMethods[0]);
  const [notes, setNotes] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [otherNumber, setOtherNumber] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!receipt.trim()) {
      toast.error("يرجى إدخال رقم الإيصال");
      return;
    }
    setLoading(true);
    try {
      let payment_details: any = { notes };
      if (method === "تحويل بنكي") {
        payment_details.bank_name = bankName;
        payment_details.account_number = accountNumber;
      } else if (method !== "نقدي") {
        payment_details.number = otherNumber;
      }

      await addPayment({
        contract_id: contractId,
        amount,
        payment_date: dueDate,
        status: "مدفوع",
        receipt_number: receipt.trim(),
        payment_method: method,
        payment_details,
        receipt_url: null,
      });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success(`تم تسجيل القسط #${installment} كمدفوع`);
      setOpen(false);
      setReceipt("");
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء التسجيل");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { 
      setOpen(v); 
      if (v) {
        setReceipt("");
        setNotes("");
        setBankName("");
        setAccountNumber("");
        setOtherNumber("");
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 border-primary/40 text-primary hover:bg-primary/10 text-xs px-2">
          ادفع الآن
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تسجيل دفعة — قسط #{installment}</DialogTitle>
          <DialogDescription>أدخل رقم الإيصال وطريقة الدفع لتأكيد السداد.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/50 p-3">
            <div>
              <p className="text-xs text-muted-foreground">المبلغ المستحق</p>
              <p className="mt-1 text-lg font-bold text-foreground">{egp(amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">تاريخ الاستحقاق</p>
              <p className="mt-1 font-semibold text-foreground">{dueDate}</p>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">رقم الإيصال</Label>
            <Input
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              placeholder="مثال: RC-5001"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
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
          {method === "تحويل بنكي" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm">اسم البنك</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">رقم الحساب</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
              </div>
            </div>
          )}
          {method !== "نقدي" && method !== "تحويل بنكي" && (
            <div>
              <Label className="mb-1.5 block text-sm">الرقم</Label>
              <Input value={otherNumber} onChange={(e) => setOtherNumber(e.target.value)} />
            </div>
          )}
          <div>
            <Label className="mb-1.5 block text-sm">ملاحظات</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "جاري الحفظ..." : "تأكيد الدفع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}