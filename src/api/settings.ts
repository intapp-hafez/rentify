import { supabase } from '@/lib/supabase';

export type SettingKey = 'governorates' | 'property_types' | 'unit_statuses';

export const getSetting = async (key: SettingKey): Promise<string[]> => {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error || !data) return [];
  return data.value as string[];
};

export const getAllSettings = async (): Promise<Record<SettingKey, string[]>> => {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['governorates', 'property_types', 'unit_statuses']);

  if (error || !data) {
    return { governorates: [], property_types: [], unit_statuses: [] };
  }

  const result: Record<string, string[]> = {};
  for (const row of data) {
    result[row.key] = row.value as string[];
  }

  return {
    governorates: result['governorates'] || [],
    property_types: result['property_types'] || [],
    unit_statuses: result['unit_statuses'] || [],
  };
};

export const updateSetting = async (key: SettingKey, value: string[]): Promise<void> => {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) throw new Error(error.message);
};
