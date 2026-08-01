# Rentify — منطق العمل (Business Logic)

## 1. دورية الدفع والأقساط
`contracts.payment_frequency` تحدد عدد الشهور لكل قسط:

| الدورية | عدد الشهور | مبلغ القسط |
|---|---|---|
| monthly (شهري) | 1 | `rent_amount × 1` |
| quarterly (كل 3 شهور) | 3 | `rent_amount × 3` |
| semiannual (كل 6 شهور) | 6 | `rent_amount × 6` |
| yearly (سنوي) | 12 | `rent_amount × 12` |

توليد الجدول:
```text
periodStart[0] = start_date
periodEnd[i]   = periodStart[i] + months - 1 يوم واحد قبل بداية الفترة التالية
periodStart[i+1] = periodStart[i] + months
يتوقف التوليد عند تجاوز end_date
amount[i] = rent_amount × months
```
مثال: إيجار 2000، دورية 3 شهور، بداية 01/01/2026 → قسط واحد
من 01/01/2026 إلى 31/03/2026 بمبلغ 6000.

## 2. تحديد القسط المدفوع
القسط يُعد مدفوعًا إذا وُجد `payment` على نفس العقد بحالة `completed`
وتاريخ `payment_date` يقع داخل فترة القسط. الأقساط غير المطابقة تظهر
في "المستحقات غير المدفوعة" بحالة **غير مدفوع**.

## 3. التحصيل (Pay Now)
- `receipt_number` فريد على مستوى قاعدة البيانات — أي تكرار يُرفض.
- إدخال دفعة بحالة `completed` يُسقط القسط تلقائيًا من قائمة المستحقات.
- `payment_method` من قائمة الإعدادات (نقدي / تحويل بنكي / إنستاباي / فودافون كاش / بطاقة).

## 4. التأمين (Deposits)
عند إنشاء عقد بمبلغ `deposit > 0` يُنشأ سجل في `deposits` بحالة `held`،
ثم يتحول لاحقًا إلى `returned` أو `deducted` أو `transferred`.

## 5. حالة الوحدة
`units.status` تُزامَن تلقائيًا عبر trigger:
عقد `active` → الوحدة `rented`؛ إنهاء/انتهاء/حذف العقد → `available`.
الحالة `maintenance` و`reserved` تُحدَّدان يدويًا.

## 6. حالة العقد
- `active`: التاريخ الحالي بين `start_date` و`end_date`.
- `expired`: `end_date` مضى.
- `terminated`: إنهاء مبكر يدوي.

## 7. التنبيهات
مركز الإشعارات يجمّع:
- عقود تنتهي خلال 30 يومًا،
- أقساط متأخرة (تاريخ الاستحقاق مضى وغير مدفوعة),
- طلبات صيانة `new` أو `urgent`,
- اقتراب انتهاء الاشتراك (`subscriptions.end_date`).

## 8. المؤشرات (KPIs)
```text
نسبة الإشغال = عدد الوحدات rented ÷ إجمالي الوحدات × 100
التحصيل الشهري = مجموع payments.amount حيث status='completed' خلال الشهر
المتأخرات = مجموع الأقساط المستحقة غير المدفوعة
صافي الإيراد = التحصيلات − تكاليف الصيانة (maintenance.cost)
```

## 9. الأمان والوصول
- الأدوار في `user_roles` فقط (ليست في `profiles`) لمنع تصعيد الصلاحيات.
- `admin`/`manager`: وصول كامل للبيانات التشغيلية.
- `tenant`: قراءة عقوده ودفعاته وتأميناته ووحدته + إنشاء طلب صيانة خاص به.
- لا يوجد أي وصول `anon`.

## 10. Guard الواجهة
`src/lib/supabase.ts` يصدّر `isSupabaseConfigured`؛ عند غياب
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` يُستبدل العميل بـ Proxy
يلغي أي استدعاء ويعيد خطأً ناعمًا بدل تعطيل الواجهة.