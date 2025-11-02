/* eslint-disable camelcase */
import { createClient, SupabaseClient, AuthResponse, User } from '@supabase/supabase-js';
import { addMonths, parseISO, format } from 'date-fns';
import {
  ExpenseCategory,
  ExpenseType,
  Expense,
  Income,
  TotalExpenses,
  Debt,
  RequestDebtDto,
  TotalDebt,
  Saving,
  SavingUser,
  SavingType,
  Currencies,
} from '../../interfaces';
import { roundToDecimals } from '../../utils/number';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';

class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const { data }: AuthResponse = await this.client.auth.signInWithPassword({ email, password });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return data.user!;
    } catch (error) {
      throw new Error(`Sign-in failed: ${error}`);
    }
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
      const { data } = await this.client
        .from('income')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return data;
    } catch (error) {
      throw new Error(`Fetching latest income failed: ${error}`);
    }
  }

  async updateIncome(person: 'kari' | 'adolfo', newIncome: number): Promise<void> {
    try {
      const latestIncome = await this.getLatestIncome();
      if (!latestIncome) throw new Error('No income record found.');

      let updatedData: Partial<Income> = {};

      if (person === 'kari') {
        const totalIncome = newIncome + latestIncome.adolfo_income;
        updatedData = {
          kari_income: newIncome,
          total_income: totalIncome,
          kari_percentage: (newIncome / totalIncome) * 100,
          adolfo_percentage: 100 - (newIncome / totalIncome) * 100,
        };
      } else if (person === 'adolfo') {
        const totalIncome = newIncome + latestIncome.kari_income;
        updatedData = {
          adolfo_income: newIncome,
          total_income: totalIncome,
          adolfo_percentage: (newIncome / totalIncome) * 100,
          kari_percentage: 100 - (newIncome / totalIncome) * 100,
        };
      } else {
        throw new Error('Invalid person type. Use "kari" or "adolfo".');
      }

      await this.client.from('income').update(updatedData).eq('id', latestIncome.id);
      await this.syncBalance();
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

  async insertExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<void> {
    try {
      await this.client.from('expenses').insert([expense]);
      const date = new Date(expense.date);
      await this.syncBalance(date);
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
      const date = new Date(originalExpense.date);
      await this.syncBalance(date);
    } catch (error) {
      throw new Error(`Updating expense failed: ${error}`);
    }
  }

  async deleteExpense(expenseId: number): Promise<void> {
    try {
      const originalExpense = await this.getExpenseById(expenseId);
      if (!originalExpense) throw new Error('Expense not found');

      await this.client.from('expenses').delete().eq('id', expenseId);
      const date = new Date(originalExpense.date);
      await this.syncBalance(date);
    } catch (error) {
      throw new Error(`Deleting expense failed: ${error}`);
    }
  }

  async getTotalExpenses(): Promise<TotalExpenses> {
    try {
      const { data: incomeData, error: incomeError } = await this.client
        .from('income')
        .select('adolfo_percentage, kari_percentage')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (incomeError || !incomeData) {
        throw new Error(`Fetching latest income failed: ${incomeError?.message}`);
      }

      const { data: expensesData, error: expensesError } = await this.client.from('expenses').select('amount, type');

      if (expensesError || !expensesData) {
        throw new Error(`Fetching expenses failed: ${expensesError?.message}`);
      }

      let totalExpenses = 0;
      let percentageExpenses = 0;
      let sharedExpenses = 0;
      let kariExpenses = 0;

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
          default:
            break;
        }
      }

      const adolfoTotal = percentageExpenses * (incomeData.adolfo_percentage / 100) + sharedExpenses / 2;

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

  async upsertTotalExpenses(expenses: TotalExpenses): Promise<void> {
    try {
      await this.client.from('total_expenses').delete().neq('id', 0);
      await this.client.from('total_expenses').insert([
        {
          total: expenses.total,
          adolfo_total: expenses.adolfo,
          kari_total: expenses.kari,
        },
      ]);
    } catch (error) {
      throw new Error(`Upsert total expense failed: ${error}`);
    }
  }

  async getKariBalance(): Promise<number> {
    try {
      const { data: kariExpenseData, error: kariExpenseError } = await this.client
        .from('total_expenses')
        .select('kari_total')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (kariExpenseError || !kariExpenseData) {
        throw new Error(`Fetching kari_total failed: ${kariExpenseError?.message}`);
      }

      const kariTotal = kariExpenseData.kari_total || 0;

      const { data: paidByKariData, error: paidByKariError } = await this.client
        .from('expenses')
        .select('amount')
        .eq('isPaidByKari', true);

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

  async syncBalance(expenseDate?: Date): Promise<void> {
    const expenses = await this.getTotalExpenses();
    await this.upsertTotalExpenses(expenses);
    const kariBalance = await this.getKariBalance();

    const dateToUse = expenseDate ?? new Date();
    const month = dateToUse.toLocaleString('en-US', { month: 'long' });

    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

    const debtByMonth = await this.getDebtByMonth(month);
    if (debtByMonth?.length) {
      await this.updateDebt(debtByMonth[0], kariBalance);
    } else if (month === currentMonth) {
      await this.insertDebt(kariBalance, month);
    }
  }

  async getTotalDebt(): Promise<TotalDebt> {
    try {
      const { data } = await this.client.from('debt').select('adolfo_debt, kari_debt');

      const totals = (data || []).reduce(
        (acc, debt) => ({
          adolfo: acc.adolfo + (debt.adolfo_debt || 0),
          kari: acc.kari + (debt.kari_debt || 0),
        }),
        { adolfo: 0, kari: 0 },
      );

      // Compensate debts between Adolfo and Kari: the smaller debt is
      // subtracted from the larger so one party always ends at 0.
      let adolfoTotal = Number(totals.adolfo || 0);
      let kariTotal = Number(totals.kari || 0);

      if (adolfoTotal > kariTotal) {
        adolfoTotal = roundToDecimals(adolfoTotal - kariTotal);
        kariTotal = 0;
      } else if (kariTotal > adolfoTotal) {
        kariTotal = roundToDecimals(kariTotal - adolfoTotal);
        adolfoTotal = 0;
      } else {
        // equal or both zero
        adolfoTotal = 0;
        kariTotal = 0;
      }

      return { adolfo: adolfoTotal, kari: kariTotal };
    } catch (error) {
      throw new Error(`Fetching all debt failed: ${error}`);
    }
  }

  async resetMonth(): Promise<void> {
    try {
      const { data: expenses } = await this.client.from('expenses').select('*');

      if (!expenses) {
        return;
      }

      const defaultExpenses = expenses.filter((expense) => expense.is_default);
      const nonDefaultExpenses = expenses.filter((expense) => !expense.is_default);

      if (nonDefaultExpenses.length > 0) {
        const idsToDelete = nonDefaultExpenses.map((expense) => expense.id);

        await this.client.from('expenses').delete().in('id', idsToDelete);
      }

      if (defaultExpenses.length > 0) {
        for (const expense of defaultExpenses) {
          const originalDate = parseISO(expense.date);
          const newDate = addMonths(originalDate, 1);
          const formattedDate = format(newDate, 'yyyy-MM-dd');

          await this.client.from('expenses').update({ date: formattedDate }).eq('id', expense.id);
        }
      }
      this.syncBalance();
    } catch (error) {
      throw new Error(`Reset month failed: ${error}`);
    }
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
}

export const supabaseService = new SupabaseService();
