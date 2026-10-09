import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

export type Role = 'student' | 'teacher';

type ProfileState = {
  role: Role | null;
  loading: boolean;
  isTeacher: boolean;
};

export function useProfile(): ProfileState {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        setRole(error ? null : ((data?.role as Role) ?? null));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { role, loading, isTeacher: role === 'teacher' };
}