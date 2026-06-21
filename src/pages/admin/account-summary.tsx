import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Loader from "@/components/ui/loader";
import { useUser } from "../../hooks/useUser";
import { supabase } from "../../lib/supabaseClient";
import { useTranslation } from "../../i18n/languageContext";

type ProvinceCard = {
  id: string;
  province_name: string;
};

type SalaryRecord = {
  salary_amount: number;
  pers_alnce?: number | null;
  km_alnce?: number | null;
  house_rent?: number | null;
  health_insu?: number | null;
  nurs_care_insu?: number | null;
  car_insu?: number | null;
  others?: number | null;
};

type DioceseSummaryCard = {
  key: string;
  label: string;
  value: number;
  helper: string;
  icon?: string;
  accent: string;
};

const accountSummaryCards = [
  {
    key: "MA",
    label: "Main Account",
    value: "12,450.00",
    helper: "1234 5678 9012 3456",
    icon: "/icons/bank-account.png",
    accent: "from-emerald-50 to-white",
  },
  {
    key: "RA",
    label: "Reserve Account",
    value: "3,200.00",
    helper: "1234 5678 9012 3456",
    icon: "/icons/bank-account.png",
    accent: "from-sky-50 to-white",
  },
  {
    key: "DA",
    label: "Deposit Account",
    value: "2,890.00",
    helper: "1234 5678 9012 3456",
    icon: "/icons/bank-account.png",
    accent: "from-amber-50 to-white",
  },
  {
    key: "FD",
    label: "Fixed Deposit",
    value: "12,450.00",
    helper: "1234 5678 9012 3456",
    icon: "/icons/bank-account.png",
    accent: "from-violet-50 to-white",
  },
];

const dioceseAccentStyles = [
  "from-rose-50 to-white",
  "from-cyan-50 to-white",
  "from-orange-50 to-white",
  "from-violet-50 to-white",
  "from-emerald-50 to-white",
  "from-sky-50 to-white",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);

const getMonthEndDate = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  const endOfMonth = new Date(year, month, 0);
  const day = String(endOfMonth.getDate()).padStart(2, "0");
  return `${year}-${String(month).padStart(2, "0")}-${day}`;
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { t } = useTranslation();

  const [dioceseSummaryCards, setDioceseSummaryCards] = useState<DioceseSummaryCard[]>([]);
  const [totalDioceseBalance, setTotalDioceseBalance] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
  const currentMonthKey = `${currentYear}-${currentMonth}`;

  const fetchDioceseSummaries = useCallback(async () => {
    const startDate = `${currentMonthKey}-01`;
    const endDate = getMonthEndDate(currentMonthKey);

    const { data: provinceRows } = await supabase
      .from("provinces")
      .select("id, province_name")
      .order("province_name", { ascending: true });

    const provinces = (provinceRows ?? []) as ProvinceCard[];

    const summaries = await Promise.all(
      provinces.map(async (province, index) => {
        const { data: priestRows } = await supabase
          .from("priests")
          .select("id")
          .eq("province", province.id)
          .limit(500);

        const priestIds = (priestRows ?? []).map((priest) => priest.id);

        if (!priestIds.length) {
          return {
            key: province.id,
            label: province.province_name,
            value: 0,
            helper: "0 records",
            accent: dioceseAccentStyles[index % dioceseAccentStyles.length],
          };
        }

        const { data: salaryRows } = await supabase
          .from("salary")
          .select(
            "salary_amount, pers_alnce, km_alnce, house_rent, health_insu, nurs_care_insu, car_insu, others"
          )
          .in("priest_id", priestIds)
          .gte("month", startDate)
          .lte("month", endDate)
          .limit(500);

        const records = (salaryRows ?? []) as SalaryRecord[];
        const totalSalary = records.reduce((sum, row) => sum + (row.salary_amount || 0), 0);
        const totalExpenses = records.reduce(
          (sum, row) =>
            sum +
            (row.pers_alnce || 0) +
            (row.km_alnce || 0) +
            (row.house_rent || 0) +
            (row.health_insu || 0) +
            (row.nurs_care_insu || 0) +
            (row.car_insu || 0) +
            (row.others || 0),
          0,
        );
        const balance = totalSalary - totalExpenses;

        return {
          key: province.id,
          label: province.province_name,
          value: balance,
          helper: `${records.length} records`,
          accent: dioceseAccentStyles[index % dioceseAccentStyles.length],
        };
      }),
    );

    const totalBalance = summaries.reduce((sum, card) => sum + card.value, 0);
    const totalCount = summaries.reduce((sum, card) => sum + (card.helper.startsWith("0") ? 0 : Number(card.helper.split(" ")[0])), 0);

    setDioceseSummaryCards(summaries);
    setTotalDioceseBalance(totalBalance);
    setTotalRecords(totalCount);
  }, [currentMonthKey]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user) {
      fetchDioceseSummaries();
    }
  }, [fetchDioceseSummaries, loading, user]);

  const totalDioceseDisplay = useMemo(() => formatCurrency(totalDioceseBalance), [totalDioceseBalance]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-4">
      <h1 className="mb-2 text-2xl font-semibold text-gray-800">
        {t("sidebar.accountSummary")}
      </h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {accountSummaryCards.map((card) => (
          <div
            key={card.key}
            className={`relative rounded-md border border-gray-200 bg-gradient-to-br ${card.accent} shadow-sm transition-transform duration-200 hover:-translate-y-0.5`}
          >
            <div className="flex items-start justify-between gap-3 py-2 px-3">
              <p className="text-md font-medium text-gray-600">{card.label}</p>
              <img
                className="h-8 w-8 opacity-70 absolute right-3 top-2"
                src={card.icon}
                alt={card.label}
              />
            </div>
            <p className="px-3 text-2xl font-semibold text-gray-900">
              € {card.value}
            </p>
            <p className="mt-3 text-right border-t border-gray-200 pt-2 text-xs text-gray-500 py-2 px-3">
              Ac No: {card.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Total Diocese Balance</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{totalDioceseDisplay}</p>
          </div>
          <p className="text-sm text-gray-500">{totalRecords} records across all dioceses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dioceseSummaryCards.map((card) => (
          <div
            key={card.key}
            className={`relative rounded-md border border-gray-200 bg-gradient-to-br ${card.accent} shadow-sm transition-transform duration-200 hover:-translate-y-0.5`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-md font-medium text-gray-600 py-2 px-3">{card.label}</p>
              <span className="flex h-10 w-10 items-center justify-center text-xl absolute right-0 top-0">
                🏛️
              </span>
            </div>
            <p className=" text-2xl font-semibold text-gray-900 px-3">
              {formatCurrency(card.value)}
            </p>
            <p className="flex justify-between mt-3 border-t border-gray-200 pt-2 text-right text-xs text-gray-500  py-2 px-3">
              <span>Ac No: 1234 5678 9012 3456</span>
              <span>{card.helper}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-md font-medium text-gray-600 py-2 px-3">Additional Donation Accounts</p>
          <div className="px-3 pb-2 flex items-center gap-1">
            <p className="tracking-wide text-gray-500">208 256 → Pater Mullasseril T</p>
            <p className="font-semibold text-gray-900">: XXXX €</p>
          </div>
          <div className="px-3 pb-2 flex items-center gap-1">
            <p className="tracking-wide text-gray-500">276 855 → Pater Jojo Thomas</p>
            <p className="font-semibold text-gray-900">: XXXX €</p>
          </div>
          <div className="px-3 pb-2 flex items-center gap-1">
            <p className="tracking-wide text-gray-500">234 4068 → Pater Jomon</p>
            <p className="font-semibold text-gray-900">: XXXX €</p>
          </div>

        </div>
      </div>
    </div>
  );
}
