import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SAVINGS_QUERY_KEYS } from '../../constants/query-keys';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Saving, SavingInsert } from '../../interfaces';
import { useNotifications } from '../../context';

type SavingsMutationArgs = {
  entries: SavingInsert[];
  originalDate?: string;
};

export const useGetAllSavings = () => {
  return useQuery<Saving[]>({
    queryKey: [SAVINGS_QUERY_KEYS.SAVINGS],
    queryFn: () => supabaseService.getAllSavings(),
  });
};

export const useInsertSavingsMutation = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotifications();

  return useMutation({
    mutationFn: async ({ entries, originalDate }: SavingsMutationArgs) => {
      if (originalDate) {
        return await supabaseService.replaceSavingsGroup(originalDate, entries);
      }

      return await supabaseService.insertSavingsBatch(entries);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [SAVINGS_QUERY_KEYS.SAVINGS] });
      const message = variables.originalDate ? 'Savings snapshot updated' : 'Savings snapshot saved';
      showNotification(message, 'success');
    },
  });
};

export const useDeleteSavingsGroupMutation = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotifications();

  return useMutation({
    mutationFn: async (dateKey: string) => {
      return await supabaseService.deleteSavingsByDate(dateKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SAVINGS_QUERY_KEYS.SAVINGS] });
      showNotification('Savings snapshot deleted', 'success');
    },
  });
};
