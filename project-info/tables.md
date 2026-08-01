# Rentify — جميع الجداول (مرجع)

كل الجداول في مخطط `public`، وكل الوصول للمستخدمين المسجَّلين فقط (لا يوجد وصول `anon`).

## profiles
| العمود | النوع | ملاحظات |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| full_name | text | |
| role | text | admin / manager / tenant (وصفي فقط — الصلاحيات في `user_roles`) |
| created_at | timestamptz | |

## user_roles
| العمود | النوع | ملاحظات |
|---|---|---|
| id | uuid PK | |
| user_id | uuid → auth.users | |
| role | app_role | admin / manager / tenant، فريد لكل (user, role) |

## units — الوحدات
| العمود | النوع | ملاحظات |
|---|---|---|
| id | uuid PK | |
| number | text | رقم الوحدة (مثال 101، G-12) |
| title | text | اسم العقار/الوحدة |
| address / city | text | العنوان والمحافظة |
| type | text | apartment, villa, duplex, shop, office, warehouse, factory, land |
| floor | text | الدور |
| area / rooms / baths | numeric / int / int | المساحة والغرف والحمامات |
| rent_price | numeric | الإيجار الشهري |
| status | text | available / rented / reserved / maintenance |

## tenants — المستأجرون
| العمود | النوع | ملاحظات |
|---|---|---|
| id | uuid PK | |
| user_id | uuid → profiles | يربط المستأجر بحساب دخول (اختياري) |
| full_name, phone, email, job | text | |
| civil_id | text | الرقم القومي |
| status | text | active / late / inactive |

## contracts — العقود
| العمود | النوع | ملاحظات |
|---|---|---|
| id | uuid PK | |
| number | text unique | CT-1001 … |
| unit_id | uuid → units | حذف متتالي |
| tenant_id | uuid → tenants | منع الحذف مع وجود عقد |
| start_date / end_date | date | `end_date > start_date` |
| rent_amount | numeric | الإيجار **الشهري** |
| deposit | numeric | التأمين |
| payment_frequency | text | monthly / quarterly / semiannual / yearly |
| status | text | active / expired / terminated |
| attachment_url | text | صورة/PDF العقد |

## payments — التحصيلات
| العمود | النوع | ملاحظات |
|---|---|---|
| id | uuid PK | |
| contract_id | uuid → contracts | |
| amount | numeric | مبلغ الدفعة (يساوي القسط المحسوب) |
| payment_date | date | |
| status | text | pending / completed / late |
| receipt_number | text unique | رقم الإيصال (فريد — يمنع التكرار) |
| receipt_url | text | |
| payment_method | text | cash, bank_transfer, instapay, vodafone_cash, credit_card |

## deposits — التأمينات
| العمود | النوع | ملاحظات |
|---|---|---|
| id | uuid PK | |
| contract_id / tenant_id | uuid | |
| amount | numeric | |
| status | text | held / returned / deducted / transferred |
| notes | text | |

## maintenance — الصيانة
| العمود | النوع | ملاحظات |
|---|---|---|
| id | uuid PK | |
| number | text | MN-301 … |
| unit_id / tenant_id | uuid | |
| description | text | |
| type | text | تكييف / سباكة / كهرباء / مصاعد / دهانات |
| priority | text | low / medium / high / urgent |
| status | text | new / in_progress / completed / cancelled |
| cost | numeric | |
| maintenance_date | date | |

## settings
| العمود | النوع | ملاحظات |
|---|---|---|
| key | text unique | مثل `property_types`, `payment_methods` |
| value | text[] | القيم القابلة للتعديل من الإعدادات |

## subscriptions
| العمود | النوع | ملاحظات |
|---|---|---|
| type | text | trial / monthly / yearly |
| value | numeric | |
| start_date / end_date | date | يحدد صلاحية الاستخدام والتنبيه |

## العلاقات
```text
auth.users ─1:1─ profiles ─1:N─ user_roles
profiles ─1:N─ tenants
units ─1:N─ contracts ─1:N─ payments
                    └─1:N─ deposits
units ─1:N─ maintenance ─N:1─ tenants
```