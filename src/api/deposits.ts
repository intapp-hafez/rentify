import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type DepositRow = Database['public']['Tables']['deposits']['Row'];
type DepositInsert = Database['public']['Tables']['deposits']['Insert'];
type DepositUpdate = Database['public']['Tables']['deposits']['Update'];

export type DepositWithRelations = DepositRow & {
  contracts?: { number: string | null; start_date: string; end_date: string } | null;
  tenants?: { full_name: string } | null;
};

export const getDeposits = async (): Promise<DepositWithRelations[]> => {
  const { data, error } = await supabase
    .from('deposits')
    .select(`
      *,
      contracts ( number, start_date, end_date ),
      tenants ( full_name )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data as DepositWithRelations[];
};

export const getDepositByContractId = async (contractId: string): Promise<DepositRow | null> => {
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .eq('contract_id', contractId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is not found
    throw new Error(error.message);
  }
  return data;
};

export const addDeposit = async (deposit: DepositInsert): Promise<DepositRow> => {
  const { data, error } = await supabase
    .from('deposits')
    .insert([deposit])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const updateDeposit = async ({ id, ...updateData }: DepositUpdate & { id: string }): Promise<DepositRow> => {
  const { data, error } = await supabase
    .from('deposits')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const deleteDeposit = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('deposits')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};
