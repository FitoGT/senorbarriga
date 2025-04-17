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
} from '../../interfaces';

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
      console.log(email, password);
      const { data }: AuthResponse = await this.client.auth.signInWithPassword({ email, password });
      console.log(data);
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
      this.syncBalance();
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
      await this.client.from('expenses').update(updates).eq('id', expenseId);
      this.syncBalance();
    } catch (error) {
      throw new Error(`Updating expense failed: ${error}`);
    }
  }

  async deleteExpense(expenseId: number): Promise<void> {
    try {
      await this.client.from('expenses').delete().eq('id', expenseId);
      this.syncBalance();
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
        total: Number(totalExpenses.toFixed(2)),
        adolfo: Number(adolfoTotal.toFixed(2)),
        kari: Number(kariTotal.toFixed(2)),
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

      const kariBalance = Number((kariTotal - totalPaidByKari).toFixed(2));

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

  async syncBalance(): Promise<void> {
    const expenses = await this.getTotalExpenses();
    await this.upsertTotalExpenses(expenses);
    const kariBalance = await this.getKariBalance();
    const today = new Date();
    const month = today.toLocaleString('en-US', { month: 'long' });
    const debtByMonth = await this.getDebtByMonth(month);

    if (debtByMonth?.length) {
      await this.updateDebt(debtByMonth[0], kariBalance);
    } else {
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

      return totals;
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
}

export const supabaseService = new SupabaseService();
