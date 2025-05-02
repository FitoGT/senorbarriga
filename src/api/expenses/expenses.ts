import { EXPENSES_QUERY_KEYS } from '../../constants/query-keys';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Expense } from '../../interfaces';
import { useNotifications } from '../../context';

export const useGetAllExpenses = () => {
    return useQuery({
        queryKey: [EXPENSES_QUERY_KEYS.EXPENSES],
        queryFn:() => supabaseService.getAllExpenses(),
    })
}

export const useGetExpenseById = (expenseId: number) => {
    return useQuery({
      queryKey: [EXPENSES_QUERY_KEYS.EXPENSE, expenseId],
      queryFn: () => supabaseService.getExpenseById(expenseId),
      enabled: Number.isFinite(expenseId),
    });
  };

export const useInsertEpenseMutation = () => {
    const queryClient = useQueryClient();
    const { showNotification } = useNotifications();
    
    return useMutation({
        mutationFn: async (expense: Omit<Expense, 'id' | 'created_at'>) => {
            return await supabaseService.insertExpense(expense)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEYS.EXPENSES] });
            showNotification('Expense added', 'success');
        },
    })
}

export const useUpdateExpenseMutation = () => {
    const queryClient = useQueryClient();
    const { showNotification } = useNotifications();

    return useMutation({
        mutationFn: async ({ expenseId, updates }: { expenseId: number; updates: Partial<Omit<Expense, 'id' | 'created_at'>> }) => {
            return await supabaseService.updateExpense(expenseId, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEYS.EXPENSES] });
            showNotification('Expense updated', 'success');
        },
    })
}

export const useDeleteExpenseMutation = () => {
    const queryClient = useQueryClient();
    const { showNotification } = useNotifications();

    return useMutation({
        mutationFn: async(expenseId: number) => {
            return await supabaseService.deleteExpense(expenseId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEYS.EXPENSES] });
            showNotification('Expense deleted', 'success');
        } 
    })
}