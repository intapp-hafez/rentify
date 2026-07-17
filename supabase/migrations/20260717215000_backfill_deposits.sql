-- Insert missing deposit records for existing contracts that have a deposit amount
INSERT INTO public.deposits (contract_id, tenant_id, amount, status, notes)
SELECT id, tenant_id, deposit, 'held', 'ترحيل من النظام القديم (تم إنشاؤه تلقائياً)'
FROM public.contracts
WHERE deposit > 0 
  AND id NOT IN (SELECT contract_id FROM public.deposits);
