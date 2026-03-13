import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  phone: string;
  nickname: string;
  province: string;
  city: string;
  district: string;
  community: string;
  school: string;
  child_grade: string;
  child_semester: string;
  avatar_url: string | null;
  status: 'enabled' | 'disabled';
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const statusCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data) {
      setProfile(data as Profile);
      // If the profile is disabled, force sign out
      if ((data as Profile).status === 'disabled') {
        await supabase.auth.signOut();
        setProfile(null);
        toast.error('账号已被禁用，如有疑问请联系客服');
      }
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  // Periodic check: verify user is still enabled
  const startStatusCheck = useCallback((userId: string) => {
    if (statusCheckRef.current) clearInterval(statusCheckRef.current);
    statusCheckRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('status')
        .eq('user_id', userId)
        .single();
      if (data?.status === 'disabled') {
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
        setUser(null);
        toast.error('账号已被禁用，已自动退出登录');
        if (statusCheckRef.current) clearInterval(statusCheckRef.current);
      }
    }, 30000); // Check every 30 seconds
  }, []);

  const stopStatusCheck = useCallback(() => {
    if (statusCheckRef.current) {
      clearInterval(statusCheckRef.current);
      statusCheckRef.current = null;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
          startStatusCheck(session.user.id);
        } else {
          setProfile(null);
          stopStatusCheck();
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        startStatusCheck(session.user.id);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      stopStatusCheck();
    };
  }, []);

  const signOut = async () => {
    stopStatusCheck();
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
