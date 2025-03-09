import { createClient, SupabaseClient, AuthResponse, AuthError, User } from '@supabase/supabase-js';
import { Income } from '../../interfaces/Income';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY!;

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
}

export const supabaseService = new SupabaseService();
