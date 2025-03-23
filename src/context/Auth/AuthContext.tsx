import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { useNotifications } from '../../context';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { showNotification } = useNotifications();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await supabaseService.getSession();
        setUser(currentUser);
      } catch (err) {
        console.error('Error fetching session:', err);
        showNotification(`Error fetching session: ${err}`, 'error')
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await supabaseService.signInWithEmail(email, password);
      setUser(loggedInUser);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
      showNotification(`Error in login: ${err.message}`, 'error')
    }
    setLoading(false);
  };

  const logout = async () => {
    try {
      await supabaseService.signOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      showNotification(`Error in logout: ${err}`, 'error')
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
