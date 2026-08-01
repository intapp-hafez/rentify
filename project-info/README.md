# Rentify — معلومات المشروع

نظام إدارة إيجارات عقارية (عربي RTL، السوق المصري) — تطوير: Mr. Hafez Rahim.

## الملفات
| الملف | المحتوى |
|---|---|
| `schema.sql` | مخطط قاعدة البيانات الكامل (جداول + صلاحيات GRANT + فهارس + triggers) |
| `policies.sql` | الأدوار (`user_roles`, `has_role`) وسياسات RLS لكل جدول |
| `tables.md` | مرجع لكل الجداول والأعمدة والعلاقات |
| `logic.md` | منطق العمل: الأقساط، الدورية، التحصيل، التأمينات، المؤشرات، الأمان |

## ترتيب التنفيذ
1. `schema.sql`
2. `policies.sql`

> ملاحظة: كل جدول جديد يجب أن يتبع الترتيب
> `CREATE TABLE → GRANT → ENABLE RLS → POLICY`، وبدون أي منح لدور `anon`.

## متغيرات البيئة
- الواجهة: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- عند غيابهما تعمل الواجهة في وضع بيانات تجريبية بفضل Guard في `src/lib/supabase.ts`.
## الترحيل التلقائي (Migration)

الترتيب الإلزامي للتنفيذ:

1. `schema.sql` — الجداول والفهارس وGRANT والـ triggers الأساسية
2. `policies.sql` — الأدوار (`user_roles` + `has_role`) وسياسات RLS
3. `logic.sql` — تطبيق SQL لمنطق `logic.md` (الأقساط، الدورية، التأمين، رقم الإيصال الفريد، المؤشرات)

```bash
export DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
./project-info/migrate.sh --dry-run   # عرض الترتيب فقط
./project-info/migrate.sh             # التنفيذ داخل transaction واحدة
```

الملفات كلها idempotent (`if not exists` / `create or replace`) لذا يمكن إعادة التشغيل بأمان.
البديل عبر Supabase CLI: `supabase db push` بعد نسخ الملفات الثلاثة بنفس هذا الترتيب إلى `supabase/migrations/`.
