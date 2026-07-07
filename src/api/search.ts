import { supabase } from '@/lib/supabase';

export interface GlobalSearchResult {
  units: { id: string; title: string; number: string | null; type: string }[];
  tenants: { id: string; full_name: string; phone: string | null }[];
  contracts: { id: string; number: string | null; units: { title: string } | null }[];
}

export const globalSearch = async (query: string): Promise<GlobalSearchResult> => {
  if (!query || query.trim() === '') {
    return { units: [], tenants: [], contracts: [] };
  }

  const searchTerm = `%${query.trim()}%`;

  const [unitsRes, tenantsRes, contractsRes] = await Promise.all([
    supabase
      .from('units')
      .select('id, title, number, type')
      .or(`title.ilike.${searchTerm},number.ilike.${searchTerm},city.ilike.${searchTerm}`)
      .limit(5),
    supabase
      .from('tenants')
      .select('id, full_name, phone')
      .or(`full_name.ilike.${searchTerm},phone.ilike.${searchTerm},civil_id.ilike.${searchTerm}`)
      .limit(5),
    supabase
      .from('contracts')
      .select('id, number, units(title)')
      .or(`number.ilike.${searchTerm}`)
      .limit(5),
  ]);

  if (unitsRes.error) console.error("Error searching units:", unitsRes.error);
  if (tenantsRes.error) console.error("Error searching tenants:", tenantsRes.error);
  if (contractsRes.error) console.error("Error searching contracts:", contractsRes.error);

  return {
    units: unitsRes.data || [],
    tenants: tenantsRes.data || [],
    // @ts-ignore
    contracts: contractsRes.data || [],
  };
};
