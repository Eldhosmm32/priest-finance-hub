import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "../i18n/languageContext";
import Image from "next/image";

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
    <div className="flex flex-col gap-2 items-center justify-center bg-gradient-to-b from-[#f3e7e9] to-[#e3eeff] rounded-lg p-4 min-h-[calc(100vh-9.5rem)]">
      <Image src="/logo.png" alt="Logo" width={100} height={100} />
      <span className="text-lg font-semibold text-gray-800"> {t("common.redirecting")}</span>
    </div >
  );
}
