import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useRef } from "react";
import { useTranslation } from "../i18n/languageContext";

type Props = {
	onNavigate?: () => void;
};

type LinkItem = {
	href: string;
	key: string;
  icon?: string;
	children?: LinkItem[];
};

const links: LinkItem[] = [
	{ href: "/admin/dashboard", key: "sidebar.dashboard",icon: "dashboard.png" },
	{ href: "/admin/diocese", key: "sidebar.diocese",icon: "church.png" },
	{ href: "/admin/reports", key: "sidebar.reports",icon: "circle.png" },
	{
		href: "/admin/priests",
		key: "sidebar.priests",
		icon: "priest.png",
		children: [
			{ href: "/admin/salary", key: "sidebar.salary" },
			{ href: "/admin/personal-allowance", key: "sidebar.personalAllowance" },
			{ href: "/admin/houserent", key: "sidebar.houserent" },
			{ href: "/admin/utility-costs", key: "sidebar.utilityCost" },
			{ href: "/admin/km-allowance", key: "sidebar.kmAllowance" },
			{ href: "/admin/other-expenses", key: "sidebar.otherExpenses" },
		],
	},

	{ href: "/admin/insurance", key: "sidebar.insurance", icon: "insurance.png" },
	{ href: "/admin/loans", key: "sidebar.loans", icon: "loan.png" },
	{ href: "/admin/fund-transfer", key: "sidebar.intertransfer", icon: "money.png" },
	{ href: "/admin/donation", key: "sidebar.donation", icon: "donate.png" },
	{ href: "/admin/announcements", key: "sidebar.announcements", icon: "announcemnt.png" },
];

export default function AdminSidebar({ onNavigate }: Props) {
	const router = useRouter();

	const [open, setOpen] = useState<Record<string, boolean>>({});

	const contentRefs = useRef<Record<string, HTMLElement | null>>({});

	const { t } = useTranslation();

	return (
		<aside className="md:w-56 w-full shrink-0 bg-indigo-800 rounded-tl-lg rounded-bl-lg p-4 space-y-2 min-h-[calc(100vh-4.6rem)]">
			<h2 className="text-sm font-semibold text-gray-200 mb-2">
				{t("sidebar.title")}
			</h2>
			<nav className="space-y-1">
				{links.map((link) => {
					const hasChildren = Array.isArray(link.children) && link.children.length > 0;
					const parentActive = router.pathname.startsWith(link.href);
					const childActive = hasChildren
						? link.children!.some((c) => router.pathname.startsWith(c.href))
						: false;
					const isOpen = open[link.href] ?? (parentActive || childActive);

					return (
            <div key={link.href}>
             
              <div
                className={`flex items-center justify-between rounded group ${
                  parentActive || childActive
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-300 hover:bg-indigo-600"
                }`}
              >
                
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => onNavigate?.()}
                  className={`block px-2 py-1 rounded text-sm  flex gap-2 `}
                >
                 {link.icon && (
                <img src={`/icons/${link.icon}`} alt={t(link.key)} className="w-5 h-5 mr-2" />
              )}  {t(link.key)}
                </Link>
                {hasChildren && (
                  <button
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpen((s) => ({ ...s, [link.href]: !isOpen }))
                    }
                    className={`ml-2  px-2 ${
                      isOpen ? "text-indigo-700" : "text-white"
                    }`}
                  >
                    {isOpen ? "−" : "+"}
                  </button>
                )}
              </div>
              {hasChildren && (
                <nav
                  ref={(el) => {
                    contentRefs.current[link.href] = el;
                  }}
                  className="pl-4 mt-1 space-y-1"
                  style={
                    {
                      maxHeight: isOpen
                        ? `${contentRefs.current[link.href]?.scrollHeight ?? 999}px`
                        : "0px",
                      overflow: "hidden",
                      transition: "max-height 220ms ease, opacity 160ms ease",
                      opacity: isOpen ? 1 : 0,
                    } as React.CSSProperties
                  }
                  aria-hidden={!isOpen}
                >
                  {link.children!.map((child) => {
                    const activeChild = router.pathname.startsWith(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => onNavigate?.()}
                        className={`block px-2 py-1 rounded text-sm ${
                          activeChild
                            ? "bg-indigo-50 text-indigo-700 font-medium"
                            : "text-gray-300 hover:bg-indigo-600"
                        }`}
                      >
                        {t(child.key)}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>
          );
				})}
			</nav>
		</aside>
	);
}
