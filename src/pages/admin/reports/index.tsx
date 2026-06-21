import { useCallback, useEffect, useState } from "react";
import Loader from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  pers_alnce?: number;
  km_alnce?: number;
  house_rent?: number;
  health_insu?: number;
  nurs_care_insu?: number;
  car_insu?: number;
  total?: number;
  balance?: number;
  others?: number;
  currency?: string | null;
  profiles?: { full_name: string | null; email: string | null } | Array<{ full_name: string | null; email: string | null }>;
};

const REPORT_QUERY = "id, priest_id, salary_amount, month, salary_notes, pers_alnce, km_alnce, house_rent, health_insu, nurs_care_insu, car_insu, others, currency, profiles!salary_priest_id_fkey(full_name, email)";

const getMonthEndDate = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  const endOfMonth = new Date(year, month, 0);
  const day = String(endOfMonth.getDate()).padStart(2, "0");
  return `${value}-${day}`;
};

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
  const [selectedEntry, setSelectedEntry] = useState<ReportRow | null>(null);

  const loadProvinces = useCallback(async () => {
    const { data } = await supabase
      .from("provinces")
      .select("id, province_name")
      .order("province_name", { ascending: true });

    setProvinces((data ?? []) as ProvinceCard[]);
    setSelectedProvinceId(data && data.length > 0 ? data[0].id : null);
  }, []);

  const loadReportData = useCallback(async () => {
    if (!selectedProvinceId) {
      setEntries([]);
      setTotalAmount(0);
      return;
    }

    const startDate = `${startMonth}-01`;
    const endDate = getMonthEndDate(endMonth);

    const { data: priestRows, error: priestError } = await supabase
      .from("priests")
      .select("id")
      .eq("province", selectedProvinceId)
      .limit(500);

    if (priestError) {
      console.error("Error loading priests for province:", priestError);
      setEntries([]);
      setTotalAmount(0);
      return;
    }

    const priestIds = (priestRows ?? []).map((priest) => priest.id);
    if (!priestIds.length) {
      setEntries([]);
      setTotalAmount(0);
      return;
    }

    const { data } = await supabase
      .from("salary")
      .select(REPORT_QUERY)
      .in("priest_id", priestIds)
      .gte("month", startDate)
      .lte("month", endDate)
      .order("month", { ascending: false })
      .limit(500);

    const reportRows = (data ?? []) as ReportRow[];
    reportRows.forEach((s: any) => {
      s.total = (s.pers_alnce || 0) + (s.km_alnce || 0) + (s.house_rent || 0) + (s.health_insu || 0) + (s.nurs_care_insu || 0) + (s.car_insu || 0) + (s.others || 0);
      s.balance = s.salary_amount - s.total;
    });
    setEntries(reportRows);
    setTotalAmount(reportRows.reduce((sum, row) => sum + (row.balance || 0), 0));
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
  const selectedProfile = selectedEntry
    ? Array.isArray(selectedEntry.profiles)
      ? selectedEntry.profiles[0]
      : selectedEntry.profiles
    : null;

  return (
    <>
      {loading || loadingData ? (
        <Loader />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {provinces.map((province) => {
              const isSelected = selectedProvinceId === province.id;
              return (
                <button
                  key={province.id}
                  type="button"
                  onClick={() => setSelectedProvinceId(province.id)}
                  className={`rounded-lg border p-3 text-left transition ${isSelected ? "border-indigo-600 bg-indigo-50 shadow-sm" : "border-gray-200 bg-white hover:border-indigo-500 hover:bg-indigo-50"}`}
                >
                  <div className="text-md font-semibold text-gray-800">{province.province_name}</div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-2/3 bg-white border border-gray-200 rounded-lg overflow-x-auto p-4">
              <div className="flex flex-col gap-2 mb-2">
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
              </div>

              <div className="overflow-auto rounded-lg lg:h-[calc(100vh-27.5rem)] ">
                <table className="min-w-full text-sm ">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminReports.dateColumn")}</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminReports.accountColumn")}</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminReports.salaryColumn")}</th>
                      <th className="px-3 py-2 whitespace-nowrap">{t("adminReports.personalAllowanceColumn")}</th>
                      <th className="px-3 py-2 whitespace-nowrap">{t("adminReports.kmAllowanceColumn")}</th>
                      <th className="px-3 py-2 whitespace-nowrap">{t("adminReports.houseRentColumn")}</th>
                      <th className="px-3 py-2 whitespace-nowrap">{t("adminReports.healthInsuranceColumn")}</th>
                      <th className="px-3 py-2 whitespace-nowrap">{t("adminReports.nursingInsuranceColumn")}</th>
                      <th className="px-3 py-2 whitespace-nowrap">{t("adminReports.carInsuranceColumn")}</th>
                      <th className="px-3 py-2 whitespace-nowrap">{t("adminReports.otherExpensesColumn")}</th>
                      <th className="px-3 py-2 whitespace-nowrap">{t("adminReports.totalExpensesColumn")}</th>
                      <th className="px-3 py-2 whitespace-nowrap">{t("adminReports.balanceAmountColumn")}</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminReports.notesColumn")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProvinceId && entries.length > 0 ? (
                      entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {new Date(entry.month).toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {((Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles)?.full_name) ||
                              ((Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles)?.email) ||
                              entry.priest_id}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap"><span className="text-slate-400">{"€"}</span> <span className="font-semibold"> {entry.salary_amount?.toFixed(2) ?? "0.00"}</span></td>
                          <td className="px-3 py-2 whitespace-nowrap"><span className="text-slate-400">{"€"}</span> <span className="font-semibold"> {(entry.pers_alnce ?? 0).toFixed(2)}</span></td>
                          <td className="px-3 py-2 whitespace-nowrap"><span className="text-slate-400">{"€"}</span> <span className="font-semibold"> {(entry.km_alnce ?? 0).toFixed(2)}</span></td>
                          <td className="px-3 py-2 whitespace-nowrap"><span className="text-slate-400">{"€"}</span> <span className="font-semibold"> {(entry.house_rent ?? 0).toFixed(2)}</span></td>
                          <td className="px-3 py-2 whitespace-nowrap"><span className="text-slate-400">{"€"}</span> <span className="font-semibold"> {(entry.health_insu ?? 0).toFixed(2)}</span></td>
                          <td className="px-3 py-2 whitespace-nowrap"><span className="text-slate-400">{"€"}</span> <span className="font-semibold"> {(entry.nurs_care_insu ?? 0).toFixed(2)}</span></td>
                          <td className="px-3 py-2 whitespace-nowrap"><span className="text-slate-400">{"€"}</span> <span className="font-semibold"> {(entry.car_insu ?? 0).toFixed(2)}</span></td>
                          <td className="px-3 py-2 whitespace-nowrap"><span className="text-slate-400">{"€"}</span> <span className="font-semibold"> {(entry.others ?? 0).toFixed(2)}</span></td>
                          <td className="px-3 py-2 whitespace-nowrap"><span className="text-slate-400">{"€"}</span> <span className="font-semibold"> {(entry.total ?? 0).toFixed(2)}</span></td>
                          <td className="px-3 py-2 whitespace-nowrap"><span className="text-slate-400">{"€"}</span> <span className="font-semibold"> {(entry.balance ?? 0).toFixed(2)}</span></td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{entry.salary_notes ?? "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="px-3 py-8 text-center text-gray-500">
                          {selectedProvinceId ? t("adminReports.noReportEntries") : t("adminReports.noProvinceSelected")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="w-full h-full lg:w-1/3 bg-white border border-gray-200 rounded-lg p-4">
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

          <Dialog
            open={!!selectedEntry}
            onOpenChange={(isOpen) => {
              if (!isOpen) setSelectedEntry(null);
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedProfile?.full_name || selectedEntry?.priest_id}</DialogTitle>
              </DialogHeader>

              {selectedEntry && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">{t("adminReports.dateColumn")}</p>
                      <p className="font-medium text-gray-800">
                        {new Date(selectedEntry.month).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t("common.name")}</p>
                      <p className="font-medium text-gray-800">{selectedProfile?.full_name || "-"}</p>
                    </div>
                    {/* <div>
                      <p className="text-gray-500">{t("adminReports.salaryColumn")}</p>
                      <p className="font-medium text-gray-800">€ {selectedEntry.salary_amount?.toFixed(2) ?? "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t("adminReports.balanceAmountColumn")}</p>
                      <p className="font-medium text-gray-800">€ {(selectedEntry.balance ?? 0).toFixed(2)}</p>
                    </div> */}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-blue-50 p-3">
                      <p className="text-gray-500">{t("sidebar.salary")}</p>
                      <p className="font-medium">€ {(selectedEntry.salary_amount ?? 0).toFixed(2)}</p>
                    </div>

                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-gray-500">{t("adminReports.personalAllowanceColumn")}</p>
                      <p className="font-medium">€ {(selectedEntry.pers_alnce ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-gray-500">{t("adminReports.kmAllowanceColumn")}</p>
                      <p className="font-medium">€ {(selectedEntry.km_alnce ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-gray-500">{t("adminReports.houseRentColumn")}</p>
                      <p className="font-medium">€ {(selectedEntry.house_rent ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-gray-500">{t("adminReports.healthInsuranceColumn")}</p>
                      <p className="font-medium">€ {(selectedEntry.health_insu ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-gray-500">{t("adminReports.nursingInsuranceColumn")}</p>
                      <p className="font-medium">€ {(selectedEntry.nurs_care_insu ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-gray-500">{t("adminReports.carInsuranceColumn")}</p>
                      <p className="font-medium">€ {(selectedEntry.car_insu ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-gray-500">{t("adminReports.otherExpensesColumn")}</p>
                      <p className="font-medium">€ {(selectedEntry.others ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-md bg-green-100 p-3">
                      <p className="text-gray-500">{t("adminReports.totalExpensesColumn")}</p>
                      <p className="font-medium">€ {(selectedEntry.total ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-md bg-purple-100 p-3">
                      <p className="text-gray-500">{t("adminReports.balanceAmountColumn")}</p>
                      <p className="font-medium">€ {(selectedEntry.balance ?? 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-500">{t("common.notes")}</p>
                    <p className="font-medium text-gray-800">{selectedEntry.salary_notes || "-"}</p>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                  {t("common.close")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

      )}
    </>
  );
}
