/* eslint-disable camelcase */
import { createClient, SupabaseClient, AuthResponse, User } from '@supabase/supabase-js';
import {
  ExpenseCategory,
  ExpenseType,
  Expense,
  Income,
  TotalExpenses,
  Debt,
  RequestDebtDto,
  TotalDebt,
  DebtPayment,
  Saving,
  SavingUser,
  SavingType,
  Currencies,
  SavingInsert,
} from '../../interfaces';
import { roundToDecimals } from '../../utils/number';
import { currentMonth, getMonthRange, monthFromDate } from '../../utils/date';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';

class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  private getDateRange(date: string): { start: string; end: string } {
    const start = new Date(`${date}T00:00:00Z`);
    const end = new Date(start.getTime());
    end.setUTCDate(end.getUTCDate() + 1);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    const { data, error }: AuthResponse = await this.client.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Unable to sign in. Please check your credentials.');
    }

    return data.user;
  }

  async signOut(): Promise<void> {
    try {
      await this.client.auth.signOut();
    } catch (error) {
      throw new Error(`Sign-out failed: ${error}`);
    }
  }

  async getSession(): Promise<User | null> {
    try {
      const { data } = await this.client.auth.getSession();
      return data.session?.user || null;
    } catch (error) {
      throw new Error(`Session retrieval failed: ${error}`);
    }
  }

  async getLatestIncome(): Promise<Income | null> {
    try {
      const { data, error } = await this.client
        .from('income')
        .select('*')
        .order('month_key', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return data;
    } catch (error) {
      throw new Error(`Fetching latest income failed: ${error}`);
    }
  }

  async getIncomeForMonth(month: string): Promise<Income | null> {
    await this.ensureMonthlyIncome(month);
    const { data, error } = await this.client
      .from('income')
      .select('*')
      .lte('month_key', month)
      .order('month_key', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Fetching income for ${month} failed: ${error.message}`);
    return data;
  }

  private async ensureMonthlyIncome(month: string): Promise<void> {
    const { error } = await this.client.rpc('ensure_monthly_income', { target_month: month });
    if (error) throw new Error(`Creating income snapshot for ${month} failed: ${error.message}`);
  }

  async updateIncome(person: 'kari' | 'adolfo', newIncome: number): Promise<void> {
    try {
      const month = currentMonth();
      const baseIncome = await this.getIncomeForMonth(month);
      if (!baseIncome) throw new Error('No income record found.');

      let kariIncome = baseIncome.kari_income;
      let adolfoIncome = baseIncome.adolfo_income;

      if (person === 'kari') {
        kariIncome = newIncome;
      } else if (person === 'adolfo') {
        adolfoIncome = newIncome;
      } else {
        throw new Error('Invalid person type. Use "kari" or "adolfo".');
      }

      const totalIncome = kariIncome + adolfoIncome;
      if (totalIncome <= 0) throw new Error('Total income must be greater than zero.');
      const snapshot = {
        month_key: month,
        kari_income: kariIncome,
        adolfo_income: adolfoIncome,
        total_income: totalIncome,
        kari_percentage: (kariIncome / totalIncome) * 100,
        adolfo_percentage: (adolfoIncome / totalIncome) * 100,
        total_percentage: 100,
      };
      const { error } = await this.client.from('income').upsert([snapshot], { onConflict: 'month_key' });
      if (error) throw error;
      await this.syncBalance(month);
    } catch (error) {
      throw new Error(`Updating income failed: ${error}`);
    }
  }

  async getAllExpenses(): Promise<Expense[]> {
    try {
      const { data } = await this.client
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      return (data || []).map((expense) => ({
        ...expense,
        category: expense.category as ExpenseCategory,
        type: expense.type as ExpenseType,
      }));
    } catch (error) {
      throw new Error(`Fetching all expenses failed: ${error}`);
    }
  }

  async getExpensesByMonth(month: string): Promise<Expense[]> {
    await this.ensureMonthlyExpenses(month);
    const { start, end } = getMonthRange(month);
    const { data, error } = await this.client
      .from('expenses')
      .select('*')
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Fetching expenses for ${month} failed: ${error.message}`);
    return (data || []).map((expense) => ({
      ...expense,
      category: expense.category as ExpenseCategory,
      type: expense.type as ExpenseType,
    }));
  }

  private async ensureMonthlyExpenses(month: string): Promise<void> {
    const { error } = await this.client.rpc('ensure_monthly_expenses', { target_month: month });
    if (error) throw new Error(`Creating recurring expenses for ${month} failed: ${error.message}`);
  }

  async insertExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<void> {
    try {
      await this.client.from('expenses').insert([expense]);
      await this.syncBalance(monthFromDate(expense.date));
    } catch (error) {
      throw new Error(`Inserting expense failed: ${error}`);
    }
  }

  async getExpenseById(expenseId: number): Promise<Expense | null> {
    try {
      const { data } = await this.client.from('expenses').select('*').eq('id', expenseId).single();

      return data
        ? {
            ...data,
            category: data.category as ExpenseCategory,
            type: data.type as ExpenseType,
          }
        : null;
    } catch (error) {
      throw new Error(`Fetching expense by ID failed: ${error}`);
    }
  }

  async updateExpense(expenseId: number, updates: Partial<Omit<Expense, 'id' | 'created_at'>>): Promise<void> {
    try {
      const originalExpense = await this.getExpenseById(expenseId);
      if (!originalExpense) throw new Error('Expense not found');

      await this.client.from('expenses').update(updates).eq('id', expenseId);
      const oldMonth = monthFromDate(originalExpense.date);
      const newMonth = updates.date ? monthFromDate(updates.date) : oldMonth;
      await this.syncBalance(oldMonth);
      if (newMonth !== oldMonth) await this.syncBalance(newMonth);
    } catch (error) {
      throw new Error(`Updating expense failed: ${error}`);
    }
  }

  async deleteExpense(expenseId: number): Promise<void> {
    try {
      const originalExpense = await this.getExpenseById(expenseId);
      if (!originalExpense) throw new Error('Expense not found');

      await this.client.from('expenses').delete().eq('id', expenseId);
      await this.syncBalance(monthFromDate(originalExpense.date));
    } catch (error) {
      throw new Error(`Deleting expense failed: ${error}`);
    }
  }

  async getTotalExpenses(month: string = currentMonth()): Promise<TotalExpenses> {
    try {
      await this.ensureMonthlyExpenses(month);
      await this.ensureMonthlyIncome(month);
      const { data: incomeData, error: incomeError } = await this.client
        .from('income')
        .select('adolfo_percentage, kari_percentage')
        .lte('month_key', month)
        .order('month_key', { ascending: false })
        .limit(1)
        .single();

      if (incomeError || !incomeData) {
        throw new Error(`Fetching latest income failed: ${incomeError?.message}`);
      }

      const { start, end } = getMonthRange(month);
      const { data: expensesData, error: expensesError } = await this.client
        .from('expenses').select('amount, type').gte('date', start).lt('date', end);

      if (expensesError || !expensesData) {
        throw new Error(`Fetching expenses failed: ${expensesError?.message}`);
      }

      let totalExpenses = 0;
      let percentageExpenses = 0;
      let sharedExpenses = 0;
      let kariExpenses = 0;
      let adolfoExpenses = 0;

      for (const expense of expensesData) {
        totalExpenses += expense.amount || 0;

        switch (expense.type) {
          case 'percentage':
            percentageExpenses += expense.amount || 0;
            break;
          case 'shared':
            sharedExpenses += expense.amount || 0;
            break;
          case 'kari':
            kariExpenses += expense.amount || 0;
            break;
          case 'adolfo':
            adolfoExpenses += expense.amount || 0;
            break;
          default:
            break;
        }
      }

      const adolfoTotal =
        percentageExpenses * (incomeData.adolfo_percentage / 100) + sharedExpenses / 2 + adolfoExpenses;

      const kariTotal = percentageExpenses * (incomeData.kari_percentage / 100) + sharedExpenses / 2 + kariExpenses;

      return {
        total: roundToDecimals(totalExpenses),
        adolfo: roundToDecimals(adolfoTotal),
        kari: roundToDecimals(kariTotal),
      };
    } catch (error) {
      throw new Error(`Fetching total expenses failed: ${error}`);
    }
  }

  async upsertTotalExpenses(month: string, expenses: TotalExpenses): Promise<void> {
    try {
      const { error } = await this.client.from('total_expenses').upsert([
        {
          month_key: month,
          total: expenses.total,
          adolfo_total: expenses.adolfo,
          kari_total: expenses.kari,
        },
      ], { onConflict: 'month_key' });
      if (error) throw error;
    } catch (error) {
      throw new Error(`Upsert total expense failed: ${error}`);
    }
  }

  async getKariBalance(month: string): Promise<number> {
    try {
      const { data: kariExpenseData, error: kariExpenseError } = await this.client
        .from('total_expenses')
        .select('kari_total')
        .eq('month_key', month)
        .limit(1)
        .single();

      if (kariExpenseError || !kariExpenseData) {
        throw new Error(`Fetching kari_total failed: ${kariExpenseError?.message}`);
      }

      const kariTotal = kariExpenseData.kari_total || 0;

      const { start, end } = getMonthRange(month);
      const { data: paidByKariData, error: paidByKariError } = await this.client
        .from('expenses')
        .select('amount')
        .eq('isPaidByKari', true)
        .gte('date', start)
        .lt('date', end);

      if (paidByKariError || !paidByKariData) {
        throw new Error(`Fetching paid by Kari expenses failed: ${paidByKariError?.message}`);
      }

      const totalPaidByKari = paidByKariData.reduce((sum, expense) => sum + (expense.amount || 0), 0);

      const kariBalance = roundToDecimals(kariTotal - totalPaidByKari);

      return kariBalance;
    } catch (error) {
      throw new Error(`Fetching Kari balance failed: ${error}`);
    }
  }

  async insertDebt(balance: number, month: string): Promise<void> {
    const debt: RequestDebtDto = {
      month,
      adolfo_debt: 0,
      kari_debt: 0,
    };

    if (Math.sign(balance) === 1) {
      debt.kari_debt = balance;
    } else {
      debt.adolfo_debt = Math.abs(balance);
    }

    try {
      await this.client.from('debt').insert([debt]);
    } catch (error) {
      throw new Error(`Insert debt failed: ${error}`);
    }
  }

  async updateDebt(debt: Debt, balance: number): Promise<void> {
    if (Math.sign(balance) === 1) {
      debt.kari_debt = balance;
      debt.adolfo_debt = 0;
    } else {
      debt.adolfo_debt = Math.abs(balance);
      debt.kari_debt = 0;
    }

    try {
      await this.client.from('debt').update(debt).eq('id', debt.id);
    } catch (error) {
      throw new Error(`Insert debt failed: ${error}`);
    }
  }

  async getDebtByMonth(month: string): Promise<Debt[] | null> {
    try {
      const { data } = await this.client.from('debt').select('*').eq('month', month);
      return data;
    } catch (error) {
      throw new Error(`Get total expense failed: ${error}`);
    }
  }

  async syncBalance(month: string = currentMonth()): Promise<void> {
    const expenses = await this.getTotalExpenses(month);
    await this.upsertTotalExpenses(month, expenses);
    const kariBalance = await this.getKariBalance(month);
    const debt = {
      month,
      month_key: month,
      adolfo_debt: kariBalance < 0 ? Math.abs(kariBalance) : 0,
      kari_debt: kariBalance > 0 ? kariBalance : 0,
    };
    const { error } = await this.client.from('debt').upsert([debt], { onConflict: 'month_key' });
    if (error) throw new Error(`Syncing debt for ${month} failed: ${error.message}`);
  }

  async getTotalDebt(): Promise<TotalDebt> {
    try {
      const { data, error } = await this.client.rpc('get_net_debt');
      if (error) throw error;
      const net = roundToDecimals(Number(data || 0));
      return { adolfo: net > 0 ? net : 0, kari: net < 0 ? Math.abs(net) : 0 };
    } catch (error) {
      throw new Error(`Fetching all debt failed: ${error}`);
    }
  }

  async getAllDebts(): Promise<Debt[]> {
    const { data, error } = await this.client.from('debt').select('*').order('month_key', { ascending: false });
    if (error) throw new Error(`Fetching monthly debts failed: ${error.message}`);
    return (data || []) as Debt[];
  }

  async getDebtPayments(): Promise<DebtPayment[]> {
    const { data, error } = await this.client.from('debt_payments').select('*').order('paid_at', { ascending: false });
    if (error) throw new Error(`Fetching debt payments failed: ${error.message}`);
    return (data || []) as DebtPayment[];
  }

  async recordDebtPayment(amount: number, note?: string): Promise<void> {
    const { error } = await this.client.rpc('record_debt_payment', {
      payment_amount: amount,
      payment_note: note || null,
    });
    if (error) throw new Error(`Recording debt payment failed: ${error.message}`);
  }

  async getIncomeSnapshots(): Promise<Income[]> {
    await this.ensureMonthlyIncome(currentMonth());
    const { data, error } = await this.client.from('income').select('*').order('month_key', { ascending: false });
    if (error) throw new Error(`Fetching income snapshots failed: ${error.message}`);
    return (data || []) as Income[];
  }

  async upsertIncomeSnapshot(month: string, kariIncome: number, adolfoIncome: number): Promise<void> {
    const totalIncome = kariIncome + adolfoIncome;
    if (kariIncome < 0 || adolfoIncome < 0 || totalIncome <= 0) throw new Error('Income values must be valid.');
    const { error } = await this.client.from('income').upsert([{
      month_key: month,
      kari_income: kariIncome,
      adolfo_income: adolfoIncome,
      total_income: totalIncome,
      kari_percentage: (kariIncome / totalIncome) * 100,
      adolfo_percentage: (adolfoIncome / totalIncome) * 100,
      total_percentage: 100,
    }], { onConflict: 'month_key' });
    if (error) throw new Error(`Saving income snapshot failed: ${error.message}`);
    await this.syncBalance(month);
  }

  async deleteIncomeSnapshot(month: string): Promise<void> {
    const { error } = await this.client.rpc('delete_income_snapshot', { target_month: month });
    if (error) throw new Error(`Deleting income snapshot failed: ${error.message}`);
  }

  async deleteDebtPayment(paymentId: number): Promise<void> {
    const { error } = await this.client.from('debt_payments').delete().eq('id', paymentId);
    if (error) throw new Error(`Deleting debt payment failed: ${error.message}`);
  }

  async getAllSavings(): Promise<Saving[]> {
    try {
      const { data } = await this.client.from('savings').select('*').order('created_at', { ascending: false });

      return (data ?? []).map((saving) => {
        return {
          id: saving.id,
          created_at: saving.created_at,
          user: saving.user as SavingUser,
          type: saving.type as SavingType,
          amount: typeof saving.amount === 'number' ? saving.amount : Number(saving.amount ?? 0),
          currency: saving.currency as Currencies,
        } satisfies Saving;
      });
    } catch (error) {
      throw new Error(`Fetching all savings failed: ${error}`);
    }
  }

  async insertSavingsBatch(savings: SavingInsert[]): Promise<void> {
    try {
      if (!savings.length) {
        throw new Error('Savings payload must include at least one entry.');
      }

      await this.client.from('savings').insert(savings);
    } catch (error) {
      throw new Error(`Inserting savings failed: ${error}`);
    }
  }

  async deleteSavingsByDate(date: string): Promise<void> {
    try {
      const { start, end } = this.getDateRange(date);
      await this.client.from('savings').delete().gte('created_at', start).lt('created_at', end);
    } catch (error) {
      throw new Error(`Deleting savings snapshot failed: ${error}`);
    }
  }
}

export const supabaseService = new SupabaseService();
