import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../hooks/useUser";
import { useLanguage, useTranslation } from "../i18n/languageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  children: React.ReactNode;
};

export default function PriestLayout({ children }: Props) {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value === "de" ? "de" : "en";
    setLanguage(lang);
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm ">
        <div className="flex max-w-6xl mx-auto p-2 ">
          <div className="flex-1 flex items-center">
            <Link href="/" className="font-semibold text-indigo-700">
              {t("common.appName")}
            </Link>
          </div>
          <div className="flex-none">
            <div className="flex gap-2">
              <div className="border border-1 border-gray-300 rounded-full flex gap-2 px-3">
                <select
                  value={language}
                  onChange={handleLanguageChange}
                  className="rounded-md text-sm font-semibold bg-white"
                >
                  <option value="en">{t("common.language.en")}</option>
                  <option value="de">{t("common.language.de")}</option>
                </select>
              </div>
              <div className="border border-1 border-gray-300 rounded-full flex gap-2 p-1 pl-3">
                <div className="flex flex-col item min-w-12">
                  <span className="text-xs font-semibold">
                    {user?.full_name ?? "----"}
                  </span>
                  <span className="text-xs text-gray-600">
                    {t("layout.role.priest")}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <div className="bg-indigo-700 w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        {user?.full_name?.slice(0, 2).toUpperCase() ?? "----"}
                      </span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>
                      {t("layout.myAccount")}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>{t("layout.profile")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      {t("common.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-gray-200 text-xs text-gray-500 py-3 text-center">
        {t("layout.footer").replace(
          "{{year}}",
          String(new Date().getFullYear())
        )}
      </footer>
    </div>
  );
}
