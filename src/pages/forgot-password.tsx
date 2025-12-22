import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useTranslation, useLanguage } from "../i18n/languageContext";
import Link from "next/link";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    });
    setLoading(false);
    if (error) setMessage(error.message);
    else setMessage(t("forgot.note"));
  };

  return (
    <>
      <header className="h-[3.6rem] px-4 border-b border-gray-200">
        <div className="flex items-center h-full justify-between m-auto max-w-6xl">
          <Link href="/" className="font-semibold text-indigo-700">
            {t("common.appName")}s
          </Link>

          <div className="border border-1 border-gray-300 rounded-full flex gap-2 px-3">
            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value === "de" ? "de" : "en")
              }
              className="rounded-md text-sm font-semibold bg-white h-[2.5rem]"
            >
              <option value="en">{t("common.language.en")}</option>
              <option value="de">{t("common.language.de")}</option>
            </select>
          </div>
        </div>
      </header>

      <div className="h-[calc(100vh-6.15rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            {t("forgot.title")}
          </h1>
          {message && (
            <div className="text-sm text-gray-700 mb-3">{message}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">{t("forgot.email")}</span>
              </label>
              <input
                type="email"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              className="btn btn-primary w-full mt-2"
              type="submit"
              disabled={loading}
            >
              {loading ? t("forgot.sending") : t("forgot.button")}
            </button>
          </form>
        </div>
      </div>

      <footer className="border-t border-gray-200 text-xs text-gray-500 py-3 text-center">
        {t("layout.footer").replace(
          "{{year}}",
          String(new Date().getFullYear())
        )}
      </footer>
    </>
  );
}
