import { useRouter } from "next/router";
import React, { useState } from "react";
import { useUser } from "../hooks/useUser";
import { supabase } from "../lib/supabaseClient";
import AdminSidebar from "./AdminSidebar";
import { useLanguage, useTranslation } from "../i18n/languageContext";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import Link from "next/link";
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";
import Logo from "./ui/logo";
import Footer from "./ui/footer";

type Props = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: Props) {
  const [open, setOpen] = useState(false);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#E8CBC0] to-[#636FA4]">
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
                <div className="flex flex-col item">
                  <span className="text-xs font-semibold">
                    {user?.full_name ?? "----"}
                  </span>
                  <span className="text-xs text-gray-600">
                    {t("layout.role.admin")}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <div className="bg-indigo-700 w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        AD
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

      <main className="flex gap-4 flex-1 max-w-6xl mx-auto w-full px-4 py-6 overflow-y-auto">
        {/* Mobile hamburger */}
        <div className="md:hidden mb-4 absolute top-[5rem] right-2">

          <Button
            aria-label="Open admin menu"
            onClick={() => setOpen(true)}
            variant="outline"
            size="sm"
          >
            <Menu />
          </Button>
        </div>
        {/* Desktop sidebar (hidden on small screens) */}
        <div className="hidden md:block">
          <AdminSidebar />
        </div>

        {/* Main content / router outlet */}
        <div className="flex-1 overflow-x-auto">{children}</div>

        {/* Mobile sidebar overlay */}
        {open && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div className="fixed inset-y-0 right-0 z-50 w-72 bg-white border-r border-gray-200 p-4 overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">{t("layout.role.admin")}</h2>

                <Button
                  aria-label="Close admin menu"
                  onClick={() => setOpen(false)}
                  variant="outline"
                  size="sm"
                >
                  <X />
                </Button>
              </div>
              <AdminSidebar onNavigate={() => setOpen(false)} />
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
