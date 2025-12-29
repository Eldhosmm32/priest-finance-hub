import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type AppUser = {
  id: string;
  email?: string;
  full_name?: string;
};

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<AppUser | null>(null);

  useEffect(() => {
    let mounted = true;

    const updateUser = (sessionUser: any) => {
      const newUser = sessionUser
        ? {
            id: sessionUser.id,
            email: sessionUser.email ?? undefined,
            full_name: sessionUser.user_metadata?.full_name ?? undefined,
          }
        : null;

      // Only update state if user actually changed
      const hasChanged =
        (!newUser && userRef.current) ||
        (newUser && !userRef.current) ||
        (newUser && userRef.current && (
          newUser.id !== userRef.current.id ||
          newUser.email !== userRef.current.email ||
          newUser.full_name !== userRef.current.full_name
        ));

      if (!hasChanged) return;

      userRef.current = newUser;
      setUser(newUser);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      updateUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        updateUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
