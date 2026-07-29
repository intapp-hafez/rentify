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
