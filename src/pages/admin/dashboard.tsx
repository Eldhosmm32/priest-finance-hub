import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "../../hooks/useUser";
import { supabase } from "../../lib/supabaseClient";
import { useTranslation } from "../../i18n/languageContext";
import Loader from "@/components/ui/loader";

const bibleQuotes = [
  "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go. — Joshua 1:9",
  "The Lord is my shepherd; I shall not want. — Psalm 23:1",
  "Trust in the Lord with all your heart and lean not on your own understanding. — Proverbs 3:5",
  "Let all that you do be done in love. — 1 Corinthians 16:14",
  "Peace I leave with you; my peace I give you. — John 14:27",
];

export default function AdminDashboard() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const [role, setRole] = useState<string | null>(null);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [welcomeQuotes] = useState(() => {
    const shuffledQuotes = [...bibleQuotes].sort(() => Math.random() - 0.5);
    return shuffledQuotes.slice(0, 3);
  });

  useEffect(() => {
    if (loading || !user) {
      if (!loading && !user) router.replace("/login");
      return;
    }

    const checkAdminAccess = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.role !== "admin") {
        router.replace("/priest/dashboard");
        return;
      }

      setRole("admin");
    };

    checkAdminAccess();
  }, [user, loading, router]);

  useEffect(() => {
    if (welcomeQuotes.length === 0) return;

    const interval = window.setInterval(() => {
      setCurrentQuoteIndex((prevIndex) =>
        prevIndex === welcomeQuotes.length - 1 ? 0 : prevIndex + 1
      );
    }, 10000);

    return () => window.clearInterval(interval);
  }, [welcomeQuotes.length]);

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">

      <h1 className="text-2xl font-semibold text-gray-800 mb-2">
        {t("common.dashboard")}
      </h1>

      <div className="rounded-md border border-amber-200 bg-white p-6 shadow-sm">
        <h1 className="mt-2 text-2xl font-semibold text-gray-800 uppercase">
          Welcome, {role || "Administrator"} 🙏
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          May your work today be guided by wisdom, peace, and grace.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl bg-white/80 p-4 shadow-sm transition-all duration-300">
          <div className="flex flex-col items-center justify-between gap-3">
            <div className="min-h-[72px] flex-1 text-sm text-gray-700 ">
              <h1 className="mt-2 text-3xl font-semibold text-gray-800">“{welcomeQuotes[currentQuoteIndex] || ""}”</h1>
            </div>
            <div className="flex gap-1">
              {welcomeQuotes.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentQuoteIndex(index)}
                  className={`h-2 w-2 rounded-full ${index === currentQuoteIndex ? "bg-amber-600" : "bg-amber-200"
                    }`}
                  aria-label={`Show quote ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
