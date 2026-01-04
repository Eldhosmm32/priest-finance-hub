import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslation } from "../i18n/languageContext";

type Props = {
  onNavigate?: () => void;
};

const links = [
  { href: "/admin/dashboard", key: "sidebar.dashboard" },
  { href: "/admin/priests", key: "sidebar.priests" },
  { href: "/admin/salary", key: "sidebar.salary" },
  { href: "/admin/houserent", key: "sidebar.houserent" },
  { href: "/admin/insurance", key: "sidebar.insurance" },
  { href: "/admin/loans", key: "sidebar.loans" },
  { href: "/admin/fund-transfer", key: "sidebar.intertransfer" },
  { href: "/admin/donation", key: "sidebar.donation" },
  { href: "/admin/announcements", key: "sidebar.announcements" },
];

export default function AdminSidebar({ onNavigate }: Props) {
  const router = useRouter();

  const { t } = useTranslation();

  return (
    <aside className="md:w-56 w-full shrink-0 bg-white border border-gray-200 rounded-lg p-4 space-y-2">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">
        {t("sidebar.title")}
      </h2>
      <nav className="space-y-1">
        {links.map((link) => {
          const active = router.pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onNavigate?.()}
              className={`block px-2 py-1 rounded text-sm ${
                active
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t(link.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
