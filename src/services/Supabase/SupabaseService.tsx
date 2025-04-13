/* eslint-disable camelcase */
import { createClient, SupabaseClient, AuthResponse, User } from '@supabase/supabase-js';
import { ExpenseCategory, ExpenseType, Expense, Income, TotalExpenses, Debt, RequestDebtDto } from '../../interfaces';

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
      this.syncBalance();
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
      const { data } = await this.client.rpc('get_total_expenses');
      return data[0];
    } catch (error) {
      throw new Error(`Get total expense failed: ${error}`);
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
      const { data } = await this.client.rpc('get_kari_balance');
      return data[0].kari_balance || 0;
    } catch (error) {
      throw new Error(`Get total expense failed: ${error}`);
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
    // TODO: Remplazar cuando carguemos abril
    // const month = today.toLocaleString('en-US', { month: 'long' });
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1);
    const month = lastMonthDate.toLocaleString('en-US', { month: 'long' });
    const debtByMonth = await this.getDebtByMonth(month);

    if (debtByMonth?.length) {
      this.updateDebt(debtByMonth[0], kariBalance);
    } else {
      await this.insertDebt(kariBalance, month);
    }
  }
}

export const supabaseService = new SupabaseService();
