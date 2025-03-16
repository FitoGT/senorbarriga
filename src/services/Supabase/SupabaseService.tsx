/* eslint-disable camelcase */
import { createClient, SupabaseClient, AuthResponse, User } from '@supabase/supabase-js';
import { Income } from '../../interfaces/Income';
import {ExpenseCategory, ExpenseType, Expense} from '../../interfaces/Expenses';

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
    const { data, error }: AuthResponse = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data.user!;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async getSession(): Promise<User | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session?.user || null;
  }

  async getLatestIncome(): Promise<Income | null> {
    const { data, error } = await this.client
      .from('income')
      .select('*')
      .order('created_at', { ascending: false }) // Get the latest record
      .limit(1)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateIncome(person: 'kari' | 'adolfo', newIncome: number): Promise<void> {
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

    const { error } = await this.client.from('income').update(updatedData).eq('id', latestIncome.id);

    if (error) throw new Error(error.message);
  }

  async getAllExpenses(): Promise<Expense[]> {
    const { data, error } = await this.client
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });
  
    if (error) throw new Error(error.message);
  
    return (data || []).map(expense => ({
      ...expense,
      category: expense.category as ExpenseCategory,
      type: expense.type as ExpenseType,
    }));
  }
}



export const supabaseService = new SupabaseService();
