import React, { createContext, useContext, useEffect, useState } from "react";
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
import Logo from "./ui/logo";
import Footer from "./ui/footer";

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  active: boolean;
  role: string | null;
};

type UserDetailsContextType = {
  userDetails: UserProfile | null;
  loading: boolean;
};

const UserDetailsContext = createContext<UserDetailsContextType | undefined>(undefined);

export const useUserDetails = () => {
  const context = useContext(UserDetailsContext);
  if (context === undefined) {
    throw new Error("useUserDetails must be used within PriestLayout");
  }
  return context;
};

type Props = {
  children: React.ReactNode;
};

export default function PriestLayout({ children }: Props) {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [userDetails, setUserDetails] = useState<UserProfile | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value === "de" ? "de" : "en";
    setLanguage(lang);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    if (!user?.id) {
      setLoadingDetails(false);
      return;
    }

    const fetchUserDetails = async () => {
      setLoadingDetails(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setUserDetails(data ?? null);
      setLoadingDetails(false);
    };

    fetchUserDetails();
  }, [user?.id]);



  return (
    <UserDetailsContext.Provider value={{ userDetails, loading: loadingDetails }}>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#f3e7e987] to-[#e3eeff8d] rounded-none md:rounded-lg">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="flex max-w-6xl mx-auto p-2 ">
            <div className="flex-1 flex items-center">
              <Link href="/" className="font-semibold text-indigo-700">
                <Logo />
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
                    <span className="text-xs font-semibold max-w-16 truncate">
                      {userDetails?.full_name ?? user?.full_name ?? "----"}
                    </span>
                    <span className="text-xs text-gray-600">
                      {t("layout.role.priest")}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <div className="bg-indigo-700 w-8 h-8 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {userDetails?.full_name?.slice(0, 2).toUpperCase() ??
                            user?.full_name?.slice(0, 2).toUpperCase() ?? "----"}
                        </span>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel className="cursor-pointer" onClick={() => router.push("/priest/dashboard")}>
                        {t("layout.myAccount")}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push("/priest/password")}>{t("priestPassword.changePassword")}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/priest/profile")}>{t("layout.profile")}</DropdownMenuItem>
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
        <main className="flex-1 max-w-6xl mx-auto w-full px-0 md:px-4 py-0 md:py-6">
          {children}
        </main>
        <Footer />
      </div>
    </UserDetailsContext.Provider>
  );
}
