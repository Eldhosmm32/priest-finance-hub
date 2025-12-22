import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type AppUser = {
  id: string;
  email?: string;
  full_name?: string;
};

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const sessionUser = data.session?.user ?? null;
      setUser(
        sessionUser
          ? {
              id: sessionUser.id,
              email: sessionUser.email ?? undefined,
              full_name: sessionUser.user_metadata?.full_name ?? undefined,
            }
          : null
      );
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        const sessionUser = session?.user ?? null;
        setUser(
          sessionUser
            ? {
                id: sessionUser.id,
                email: sessionUser.email ?? undefined,
                full_name: sessionUser.user_metadata?.full_name ?? undefined,
              }
            : null
        );
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
