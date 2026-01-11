import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "../i18n/languageContext";
import { useLanguage } from "../i18n/languageContext";
import Link from "next/link";
import { toast } from "sonner";

export default function Signup() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();


  const showToast = (message: string, type: "success" | "error") => {
    toast[type](message, {
      position: "top-center",
      style: {
        backgroundColor: type === "success" ? "#4ade80" : "#f87171",
        color: "#fff",
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("errors.passwordsMismatch"));
      return;
    }

    setLoading(true);

    // 1) Sign up the user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // On success:
    // - auth.users row created
    // - handle_new_user trigger (if configured) creates profiles row with role 'priest'
    if (data.user) {
      showToast(t("signup.createdMessage"), "success");

      // Optionally redirect to login after a delay:
      setTimeout(() => router.push("/login"), 2500);
    }
  };

  const { language, setLanguage } = useLanguage();
  return (
    <>
      <header className="h-[3.6rem] px-4 border-b border-gray-200">
        <div className="flex items-center h-full justify-between m-auto max-w-6xl">
          <Link href="/" className="font-semibold text-indigo-700">
            {t("common.appName")}
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
          <h1 className="text-xl font-semibold text-gray-800 mb-1">
            {t("signup.title")}
          </h1>
          <p className="text-sm text-gray-500 mb-4">{t("signup.subtitle")}</p>
          {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">
                  {t("signup.fullName")}
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">{t("login.email")}</span>
              </label>
              <input
                type="email"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">
                  {t("signup.password")}
                </span>
              </label>
              <input
                type="password"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">
                  {t("signup.confirmPassword")}
                </span>
              </label>
              <input
                type="password"
                className="input input-bordered w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button
              className="btn btn-primary w-full mt-2"
              type="submit"
              disabled={loading}
            >
              {loading ? t("signup.creating") : t("signup.button")}
            </button>
          </form>

          <button
            className="link link-primary text-xs mt-4"
            type="button"
            onClick={() => router.push("/login")}
          >
            {t("signup.already")} <span className="text-indigo-600"> {t("signup.login")}</span>
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
