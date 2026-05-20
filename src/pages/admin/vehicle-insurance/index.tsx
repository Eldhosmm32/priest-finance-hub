import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useUser } from "../../../hooks/useUser";
import { supabase } from "../../../lib/supabaseClient";
import Loader from "@/components/ui/loader";
import { useTranslation } from "../../../i18n/languageContext";

type VehicleInsuranceRow = {
  id: string;
  priest_id: string;
  car_insu: number;
  month: string;
  profiles?: { full_name: string | null; email: string | null };
};

// Constants
const ALLOWANCE_QUERY = "id, priest_id, car_insu, month, profiles!salary_priest_id_fkey(full_name, email)";

export default function AdminVehicleInsurance() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentMonthDate = `${currentYear}-${currentMonth}`;
  
  const [entries, setEntries] = useState<VehicleInsuranceRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [startMonth, setStartMonth] = useState(currentMonthDate);
  const [endMonth, setEndMonth] = useState(currentMonthDate);
  const [totalAmount, setTotalAmount] = useState(0);

  // Load vehicle insurance data
  const loadVehicleInsuranceData = useCallback(async () => {
    const { data } = await supabase
      .from("salary")
      .select(ALLOWANCE_QUERY)
      .gte("month", startMonth + '-01')
      .lte("month", endMonth + '-01')
      .order("month", { ascending: false })
      .limit(100);

    const insuranceData = (data ?? []) as unknown as VehicleInsuranceRow[];
    setEntries(insuranceData);
    
    // Calculate total
    const total = insuranceData.reduce((sum, item) => sum + (item.car_insu || 0), 0);
    setTotalAmount(total);
  }, [startMonth, endMonth]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    setLoadingData(false);
  }, [user, loading, router]);

  // Reload data when month range changes
  useEffect(() => {
    if (!user || loading) return;
    loadVehicleInsuranceData();
  }, [startMonth, endMonth, loadVehicleInsuranceData, user, loading]);

  if (loading || loadingData) {
    return <Loader />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">
        {t("adminVehicleInsurance.title")}
      </h1>

      {/* Month Range Filter */}
      <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex flex-col md:flex-row gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-gray-600">{t("common.startMonth")}</label>
          <input
            type="month"
            className="input"
            onChange={(e) => setStartMonth(e.target.value)}
            value={startMonth}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-gray-600">{t("common.endMonth")}</label>
          <input
            type="month"
            className="input"
            onChange={(e) => setEndMonth(e.target.value)}
            value={endMonth}
          />
        </div>
      </div>

      {/* Table and Summary */}
      <div className="flex flex-col lg:flex-row gap-2">
        {/* Main Table */}
        <div className="w-full lg:w-2/3 bg-white border border-gray-200 rounded-lg overflow-x-auto p-1">
          <div className="overflow-auto rounded-lg max-h-[calc(100vh-21rem)] thin-scroll">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminVehicleInsurance.priestColumn")}</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminVehicleInsurance.monthColumn")}</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">{t("adminVehicleInsurance.amountColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {item.profiles?.full_name || item.profiles?.email || item.priest_id}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(item.month).toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">€ {item.car_insu}</td>
                  </tr>
                ))}
                {!entries.length && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                      {t("adminVehicleInsurance.noInsuranceEntries")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Card */}
        <div className="w-full lg:w-1/3 h-fit bg-white border border-gray-200 rounded-lg">
          <div className="p-2 border-b border-gray-200">
            <h2 className="font-semibold">{t("adminVehicleInsurance.vehicleInsuranceSummary")}</h2>
          </div>
          <div className="flex flex-col gap-2 p-2">
            <p className="text-sm text-gray-500">
              {t("common.from")}{" "}
              {startMonth && endMonth
                ? `${new Date(startMonth).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })} - ${new Date(endMonth).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })}`
                : t("common.allTime")}
            </p>
            <h1 className="font-bold text-2xl">€ {totalAmount}</h1>
          </div>
        </div>
      </div>
    </div>
  );
}
