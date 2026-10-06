import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SAVINGS_QUERY_KEYS } from '../../constants/query-keys';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Saving, SavingInsert } from '../../interfaces';
import { useNotifications } from '../../context';

type SavingsMutationArgs = {
  entries: SavingInsert[];
};

export const useGetAllSavings = () => {
  return useQuery<Saving[]>({
    queryKey: [SAVINGS_QUERY_KEYS.SAVINGS],
    queryFn: () => supabaseService.getAllSavings(),
  });
};

export const useSaveSavingsMutation = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotifications();

  return useMutation({
    mutationFn: async ({ entries }: SavingsMutationArgs) => {
      return await supabaseService.saveSavingsSnapshot(entries);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SAVINGS_QUERY_KEYS.SAVINGS] });
      showNotification('Savings snapshot saved', 'success');
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SAVINGS_QUERY_KEYS.SAVINGS] });
      showNotification('Savings snapshot deleted', 'success');
    },
  });
};
