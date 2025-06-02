import { useMutation } from '@tanstack/react-query';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { useNotifications } from '../../context';
import { unparse } from 'papaparse';

const exportToCSV = (data: any[], filename: string) => {
  if (!data.length) return;

  const csv = unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  
  const date = new Date(data[0]?.date || Date.now());
  const month = date.toLocaleString('en-US', { month: 'long' }).toLowerCase();
  const year = date.getFullYear();

  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `db-${month}-${year}-${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const exportDatabase = async () => {
  const [expenses, income, debts, totals] = await Promise.all([
    supabaseService.getAllExpenses(),
    supabaseService.getLatestIncome().then((i) => (i ? [i] : [])),
    supabaseService.getClient().from('debt').select('*').then((res) => res.data || []),
    supabaseService.getClient().from('total_expenses').select('*').then((res) => res.data || []),
  ]);

  exportToCSV(expenses, 'expenses');
  exportToCSV(income, 'income');
  exportToCSV(debts, 'debt');
  exportToCSV(totals, 'total_expenses');
};

export const useExportDatabaseMutation = () => {
  const { showNotification } = useNotifications();

  return useMutation({
    mutationFn: exportDatabase,
    onSuccess: () => {
      showNotification('CSV files downloaded', 'success');
    },
    onError: (err) => {
      console.error('CSV export error:', err);
      showNotification('Failed to export CSV', 'error');
    },
  });
};