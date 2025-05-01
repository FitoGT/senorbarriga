import { EXPENSES_QUERY_KEYS } from '../../constants/query-keys';
import { useQuery } from '@tanstack/react-query';
import { supabaseService } from '../../services/Supabase/SupabaseService';

export const useGetAllExpenses = () => {
    return useQuery({
        queryKey: [EXPENSES_QUERY_KEYS.EXPENSES],
        queryFn:() => supabaseService.getAllExpenses(),
    })
}