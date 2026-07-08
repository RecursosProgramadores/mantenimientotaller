import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
};

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const navigate = useNavigate();

  // Load user profile from Supabase 'usuarios' table
  const fetchUserProfile = async (userId: string, email: string) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', userId)
      .single();

    if (error || !data) {
      // Fallback if no profile is found but auth succeeds
      return { id: userId, email, name: email.split('@')[0], role: 'Operador' };
    }

    return {
      id: data.id,
      email: data.email,
      name: data.nombre,
      role: data.rol,
      avatar: data.avatar_url
    };
  };

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id, session.user.email!);
        if (mounted) {
          setState({ user: profile, isAuthenticated: true, isLoading: false });
        }
      } else {
        if (mounted) {
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchUserProfile(session.user.id, session.user.email!);
        if (mounted) {
          setState({ user: profile, isAuthenticated: true, isLoading: false });
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setState({ user: null, isAuthenticated: false, isLoading: false });
          navigate({ to: "/login" });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setState(s => ({ ...s, isLoading: true }));
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    });
    
    if (error) {
      setState(s => ({ ...s, isLoading: false }));
      return false;
    }
    
    return true; // onAuthStateChange will handle setting the user
  };

  const logout = async () => {
    setState(s => ({ ...s, isLoading: true }));
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
