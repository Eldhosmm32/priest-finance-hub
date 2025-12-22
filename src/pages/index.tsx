import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "../i18n/languageContext";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const go = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      const userId = session.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/priest/dashboard");
      }
    };

    go().finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">
      {loading ? t("common.redirecting") : t("common.redirecting")}
    </div>
  );
}
