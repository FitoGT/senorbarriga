import { useQuery } from '@tanstack/react-query';
import { SAVINGS_QUERY_KEYS } from '../../constants/query-keys';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Saving } from '../../interfaces';

export const useGetAllSavings = () => {
  return useQuery<Saving[]>({
    queryKey: [SAVINGS_QUERY_KEYS.SAVINGS],
    queryFn: () => supabaseService.getAllSavings(),
  });
};
