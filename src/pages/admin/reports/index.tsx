import { useCallback, useEffect, useState } from "react";
import Loader from "@/components/ui/loader";
import { useUser } from "../../../hooks/useUser";
import { useRouter } from "next/router";
import { supabase } from "../../../lib/supabaseClient";
import { useTranslation } from "../../../i18n/languageContext";

type ProvinceCard = {
  id: string;
  province_name: string;
};

type ReportRow = {
  id: string;
  priest_id: string;
  month: string;
  salary_amount: number;
  salary_notes?: string | null;
  profiles?: Array<{ full_name: string | null; email: string | null; province?: string | null }>;
};

const REPORT_QUERY = "id, priest_id, salary_amount, month, salary_notes, profiles!salary_priest_id_fkey(full_name, email, province)";

export default function AdminReports() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

  const [provinces, setProvinces] = useState<ProvinceCard[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ReportRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [startMonth, setStartMonth] = useState(`${currentYear}-${currentMonth}`);
  const [endMonth, setEndMonth] = useState(`${currentYear}-${currentMonth}`);
  const [totalAmount, setTotalAmount] = useState(0);

  const loadProvinces = useCallback(async () => {
    const { data } = await supabase
      .from("provinces")
      .select("id, province_name")
      .order("province_name", { ascending: true });

    setProvinces((data ?? []) as ProvinceCard[]);
  }, []);

  const loadReportData = useCallback(async () => {
    if (!selectedProvinceId) {
      setEntries([]);
      setTotalAmount(0);
      return;
    }

    const startDate = `${startMonth}-01`;
    const endDate = `${endMonth}-31`;

    const { data } = await supabase
      .from("salary")
      .select(REPORT_QUERY)
      .eq("profiles.province", selectedProvinceId)
      .gte("month", startDate)
      .lte("month", endDate)
      .order("month", { ascending: false })
      .limit(500);

    const reportRows = (data ?? []) as ReportRow[];
    setEntries(reportRows);
    setTotalAmount(reportRows.reduce((sum, row) => sum + (row.salary_amount || 0), 0));
  }, [selectedProvinceId, startMonth, endMonth]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    loadProvinces();
    setLoadingData(false);
  }, [user, loading, router, loadProvinces]);

  useEffect(() => {
    if (!user || loading) return;
    loadReportData();
  }, [selectedProvinceId, startMonth, endMonth, loadReportData, user, loading]);

  const selectedProvinceName = provinces.find((province) => province.id === selectedProvinceId)?.province_name ?? "";

  return (
    <>
      {loading || loadingData ? (
        <Loader />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">{t("adminReports.title")}</h1>
              <p className="text-sm text-gray-500">{t("adminReports.subtitle")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">{t("adminReports.startMonth")}</label>
                <input
                  type="month"
                  className="input"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">{t("adminReports.endMonth")}</label>
                <input
                  type="month"
                  className="input"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {provinces.map((province) => {
              const isSelected = selectedProvinceId === province.id;
              return (
                <button
                  key={province.id}
                  type="button"
                  onClick={() => setSelectedProvinceId(province.id)}
                  className={`rounded-lg border px-4 py-4 text-left transition ${isSelected ? "border-indigo-600 bg-indigo-50 shadow-sm" : "border-gray-200 bg-white hover:border-indigo-500 hover:bg-indigo-50"}`}
                >
                  <div className="text-base font-semibold text-gray-800">{province.province_name}</div>
                  <div className="mt-2 text-sm text-gray-500">
                    {isSelected ? t("adminReports.provinceSelected") : t("adminReports.selectProvinceCard")}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-2/3 bg-white border border-gray-200 rounded-lg overflow-x-auto p-4">
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-gray-500">{t("adminReports.selectedProvince")}</p>
                    <h2 className="text-lg font-semibold text-gray-800">{selectedProvinceName || t("adminReports.noneSelected")}</h2>
                  </div>
                  <div className="text-sm text-gray-600">
                    {startMonth && endMonth
                      ? `${new Date(startMonth).toLocaleDateString(undefined, { month: "short", year: "numeric" })} - ${new Date(endMonth).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
                      : t("adminReports.allTime")}
                  </div>
                </div>
                {!selectedProvinceId && (
                  <p className="text-sm text-gray-500">{t("adminReports.noProvinceSelected")}</p>
                )}
              </div>

              <div className="overflow-auto rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminReports.dateColumn")}</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminReports.accountColumn")}</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminReports.notesColumn")}</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">{t("adminReports.amountColumn")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProvinceId && entries.length > 0 ? (
                      entries.map((entry) => (
                        <tr key={entry.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {new Date(entry.month).toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">{entry.profiles?.[0]?.full_name || entry.profiles?.[0]?.email || entry.priest_id}</td>
                          <td className="px-3 py-2 text-gray-700">{entry.salary_notes ?? "-"}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap font-semibold text-gray-800">€ {entry.salary_amount.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                          {selectedProvinceId ? t("adminReports.noReportEntries") : t("adminReports.noProvinceSelected")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-lg p-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">{t("adminReports.reportSummary")}</h2>
                <p className="text-sm text-gray-500">{t("adminReports.summaryDescription")}</p>
              </div>
              <div className="grid gap-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase font-medium tracking-wide text-gray-600">{t("adminReports.totalRecords")}</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{entries.length}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase font-medium tracking-wide text-gray-600">{t("adminReports.totalAmount")}</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">€ {totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
