import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type ContractRow = Database['public']['Tables']['contracts']['Row'] & { attachment_url?: string | null };
type ContractInsert = Database['public']['Tables']['contracts']['Insert'] & { attachment_url?: string | null };
type ContractUpdate = Database['public']['Tables']['contracts']['Update'] & { attachment_url?: string | null };

// Extended type for joined queries
export type ContractWithRelations = ContractRow & {
  attachment_url?: string | null;
  units: { title: string; number: string | null } | null;
  tenants: { full_name: string } | null;
};

export interface ConflictCheckParams {
  unitId: string;
  startDate: string;
  endDate: string;
  excludeContractId?: string;
}

export interface MinimalContractInfo {
  id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  status?: string | null;
  number?: string | null;
}

export const normalizeDate = (d: string | null | undefined): string => {
  if (!d) return '';
  return d.split('T')[0].trim();
};

export const findConflictingContract = <T extends MinimalContractInfo>(
  contracts: T[],
  params: ConflictCheckParams
): T | null => {
  const { unitId, startDate, endDate, excludeContractId } = params;
  if (!unitId || !startDate || !endDate) return null;

  const normStart = normalizeDate(startDate);
  const normEnd = normalizeDate(endDate);
  if (!normStart || !normEnd) return null;

  const inactiveStatuses = ['terminated', 'cancelled', 'canceled', 'ملغي', 'مفسوخ', 'عقد ملغي'];

  return (
    contracts.find((c) => {
      if (excludeContractId && c.id === excludeContractId) return false;
      if (c.unit_id !== unitId) return false;

      const status = (c.status || '').trim().toLowerCase();
      if (inactiveStatuses.includes(status)) return false;

      const cStart = normalizeDate(c.start_date);
      const cEnd = normalizeDate(c.end_date);
      if (!cStart || !cEnd) return false;

      // Overlap condition:
      // [normStart, normEnd] overlaps with [cStart, cEnd] iff normStart <= cEnd && normEnd >= cStart
      return normStart <= cEnd && normEnd >= cStart;
    }) || null
  );
};

export const getContracts = async (): Promise<ContractWithRelations[]> => {
  const { data, error } = await supabase
    .from('contracts')
    .select('*, units(title, number), tenants(full_name)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as ContractWithRelations[];
};

export const addContract = async (contract: ContractInsert): Promise<ContractRow> => {
  if (contract.start_date && contract.end_date && normalizeDate(contract.start_date) > normalizeDate(contract.end_date)) {
    throw new Error('تاريخ بداية العقد لا يمكن أن يكون بعد تاريخ النهاية');
  }

  if (contract.unit_id && contract.start_date && contract.end_date) {
    const { data: existingContracts } = await supabase
      .from('contracts')
      .select('id, number, unit_id, start_date, end_date, status')
      .eq('unit_id', contract.unit_id);

    if (existingContracts && existingContracts.length > 0) {
      const conflict = findConflictingContract(existingContracts, {
        unitId: contract.unit_id,
        startDate: contract.start_date,
        endDate: contract.end_date,
      });

      if (conflict) {
        const contractNum = conflict.number ? `رقم "${conflict.number}"` : 'نشط';
        throw new Error(
          `لا يمكن إنشاء العقد: يوجد عقد ${contractNum} مسجل بالفعل لهذه الوحدة في نفس الفترة (من ${conflict.start_date} إلى ${conflict.end_date})`
        );
      }
    }
  }

  const { data, error } = await supabase
    .from('contracts')
    .insert([contract as any])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (data.deposit && data.deposit > 0) {
    await supabase.from('deposits').insert([{
      contract_id: data.id,
      tenant_id: data.tenant_id,
      amount: data.deposit,
      status: 'held',
      notes: 'تأمين العقد'
    }]);
  }

  return data;
};

export const updateContract = async ({ id, ...updateData }: ContractUpdate & { id: string }): Promise<ContractRow> => {
  if (updateData.start_date && updateData.end_date && normalizeDate(updateData.start_date) > normalizeDate(updateData.end_date)) {
    throw new Error('تاريخ بداية العقد لا يمكن أن يكون بعد تاريخ النهاية');
  }

  let targetUnitId = updateData.unit_id;
  let targetStart = updateData.start_date;
  let targetEnd = updateData.end_date;

  if (!targetUnitId || !targetStart || !targetEnd) {
    const { data: current } = await supabase
      .from('contracts')
      .select('unit_id, start_date, end_date')
      .eq('id', id)
      .single();

    if (current) {
      targetUnitId = targetUnitId || current.unit_id;
      targetStart = targetStart || current.start_date;
      targetEnd = targetEnd || current.end_date;
    }
  }

  if (targetUnitId && targetStart && targetEnd) {
    const { data: existingContracts } = await supabase
      .from('contracts')
      .select('id, number, unit_id, start_date, end_date, status')
      .eq('unit_id', targetUnitId);

    if (existingContracts && existingContracts.length > 0) {
      const conflict = findConflictingContract(existingContracts, {
        unitId: targetUnitId,
        startDate: targetStart,
        endDate: targetEnd,
        excludeContractId: id,
      });

      if (conflict) {
        const contractNum = conflict.number ? `رقم "${conflict.number}"` : 'نشط';
        throw new Error(
          `لا يمكن تحديث العقد: هناك تعارض مع عقد ${contractNum} لنفس الوحدة خلال الفترة (من ${conflict.start_date} إلى ${conflict.end_date})`
        );
      }
    }
  }

  const { data, error } = await supabase
    .from('contracts')
    .update(updateData as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const deleteContract = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};
