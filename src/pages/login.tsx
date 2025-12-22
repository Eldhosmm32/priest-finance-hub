import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../hooks/useUser";
import { useLanguage, useTranslation } from "../i18n/languageContext";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 1) Sign in
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // 2) Get the logged-in user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setLoading(false);
      setError(t("errors.unableToLoadUser"));
      return;
    }

    const userId = userData.user.id;

    // 3) Fetch profile to get role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    setLoading(false);

    if (profileError || !profile) {
      setError(t("errors.profileNotFound"));
      return;
    }

    // 4) Redirect based on role
    if (profile.role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/priest/dashboard");
    }
  };

  return (
    <>
      <header className="h-[3.6rem] px-4 border-b border-gray-200">
        <div className="flex items-center h-full justify-between m-auto max-w-6xl">
          <span className="font-semibold text-indigo-700">
            {t("common.appName")}
          </span>
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
          <h1 className="text-xl font-semibold text-gray-800 mb-1">
            {t("login.title")}
          </h1>
          <p className="text-sm text-gray-500 mb-4">{t("login.subtitle")}</p>
          {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="form-control">
              <label className="label-text text-xs">{t("login.email")}</label>
              <input
                id="email"
                type="email"
                className="input input-ghost input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">
                  {t("login.password")}
                </span>
              </label>
              <input
                type="password"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              className="btn w-full mt-2"
              type="submit"
              disabled={loading}
            >
              {loading ? t("login.button") + "…" : t("login.button")}
            </button>
          </form>

          <button
            className="link link-primary text-xs mt-4"
            type="button"
            onClick={() => router.push("/forgot-password")}
          >
            {t("login.forgot")}
          </button>

          <button
            className="link link-primary text-xs mt-1 block"
            type="button"
            onClick={() => router.push("/signup")}
          >
            {t("login.signupLink")}
          </button>
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
