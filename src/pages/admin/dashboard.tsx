import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "../../hooks/useUser";
import { supabase } from "../../lib/supabaseClient";
import { useTranslation } from "../../i18n/languageContext";
import Loader from "@/components/ui/loader";
// import users from "../api/priests-data.json";

type StatusCards = {
  totalSalaryThisMonth: string;
  totalInsuranceThisMonth: string;
  insuranceDescription: string;
  totalRentThisMonth: string;
  totalLoansIssuedThisMonth: number;
  numberOfActiveLoans: number;
  lastInternationalTransfersTotal: string;
  lastInternationalTransfersDescription: string;
  lastDonationReceived: string;
  lastDonationDate: string;
};

export default function AdminDashboard() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const [statusCards, setStatusCards] = useState<StatusCards | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // const createUser = async () => {
  //   for (const user of users) {
  //     try {
  //       // Get the current session token
  //       const { data: { session } } = await supabase.auth.getSession();

  //       if (!session) {
  //         console.error("No session found");
  //         return;
  //       }


  //       // Call the API route
  //       const response = await fetch("/api/admin/create-user", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           "Authorization": `Bearer ${session.access_token}`,
  //         },
  //         body: JSON.stringify({
  //           email: user.email,
  //           password: user.password,
  //           full_name: user.full_name,
  //           role: user.role,
  //           active: user.active,
  //         }),
  //       });

  //       const result = await response.json();

  //       if (!response.ok) {
  //         console.error("Error creating user:", result.error);
  //         console.error("Error details:", result.details);
  //         return;
  //       }

  //       console.log("User created successfully:", result.user);
  //     } catch (error) {
  //       console.error("Error:", error);
  //     }
  //   }
  // };

  // Only call this if you want to test - remove or comment out after testing
  //createUser();

  const fetchSummary = useCallback(async () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const currentMonthStr = `${currentYear}-${currentMonth}`;
    const currentMonthStart = `${currentMonthStr}-01`;
    const today = currentDate.toISOString().split('T')[0];

    // Calculate first and last day of current month for date range queries
    const firstDayOfMonth = new Date(currentYear, currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentYear, currentDate.getMonth() + 1, 0);
    const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
    const lastDayStr = lastDayOfMonth.toISOString().split('T')[0];

    const [
      rentSummary,
      salarySummary,
      insuranceData,
      loansIssuedThisMonth,
      activeLoansData,
      lastTransfers,
      lastDonation
    ] = await Promise.all([
      // 1. Total Rent Paid (This Month)
      supabase
        .from("admin_house_rent_summary")
        .select("*")
        .eq("month", currentMonthStart),
      // 2. Total Salary (This Month)
      supabase
        .from("admin_salary_summary")
        .select("*")
        .eq("month", currentMonthStart),
      // 3. Total Insurance Paid (This Month) - Get all insurance types
      supabase
        .from("insurance")
        .select("amount, type")
        .gte("month", currentMonthStart)
        .lte("month", lastDayStr),
      // 4. Total Loan Issued (This Month)
      supabase
        .from("loans")
        .select("principal")
        .gte("issued_on", firstDayStr)
        .lte("issued_on", lastDayStr),
      // 5. Number of Active Loans
      supabase
        .from("loans")
        .select("id")
        .gte("closed_on", today),
      // 6. Last International Transfers
      supabase
        .from("fund_transfer")
        .select("amount, notes, transfer_date")
        .order("transfer_date", { ascending: false })
        .limit(1),
      // 7. Last Donation Received
      supabase
        .from("donations")
        .select("amount, credited_date, sender")
        .order("created_at", { ascending: false })
        .limit(1)
    ]);

    // Calculate totals
    const totalRent = rentSummary?.data
      ? rentSummary.data.reduce((acc: any, curr: any) => acc + (curr.total_payout || 0), 0)
      : 0;

    const totalSalary = salarySummary?.data
      ? salarySummary.data.reduce((acc: any, curr: any) => acc + (curr.total_payout || 0), 0)
      : 0;

    const totalInsurance = insuranceData?.data
      ? insuranceData.data.reduce((acc: any, curr: any) => acc + (curr.amount || 0), 0)
      : 0;

    // Get insurance types for description
    const insuranceTypes = insuranceData?.data
      ? [...new Set(insuranceData.data.map((item: any) => item.type))].sort()
      : [];
    const insuranceTypeNames: Record<number, string> = {
      1: "Health",
      2: "Vehicle Insurance",
      3: "KFZ Unfall",
      4: "Lebens",
      5: "Optional types",
      6: "Other"
    };
    const insuranceDescription = insuranceTypes.length > 0
      ? insuranceTypes.map((type: number) => insuranceTypeNames[type] || `Type ${type}`).join(", ")
      : "No insurance payments";

    const totalLoansIssued = loansIssuedThisMonth?.data?.length || 0;

    const numberOfActiveLoans = activeLoansData?.data?.length || 0;

    // Last International Transfers - sum of last transfers
    const lastTransfersTotal = lastTransfers?.data
      ? lastTransfers.data.reduce((acc: any, curr: any) => acc + (curr.amount || 0), 0)
      : 0;
    const lastTransfersDescription = lastTransfers?.data && lastTransfers.data.length > 0
      ? lastTransfers.data.map((t: any) => t.notes || "No description").filter((d: string) => d !== "No description").join(", ") || "No description"
      : "No transfers";

    // Last Donation Received
    const lastDonationAmount = lastDonation?.data && lastDonation.data.length > 0
      ? lastDonation.data[0].amount || 0
      : 0;
    const lastDonationDate = lastDonation?.data && lastDonation.data.length > 0
      ? lastDonation.data[0].credited_date || ""
      : "";

    setStatusCards({
      totalSalaryThisMonth: totalSalary.toFixed(2),
      totalInsuranceThisMonth: totalInsurance.toFixed(2),
      insuranceDescription: insuranceDescription,
      totalRentThisMonth: totalRent.toFixed(2),
      totalLoansIssuedThisMonth: totalLoansIssued,
      numberOfActiveLoans: numberOfActiveLoans,
      lastInternationalTransfersTotal: lastTransfersTotal.toFixed(2),
      lastInternationalTransfersDescription: lastTransfersDescription,
      lastDonationReceived: lastDonationAmount.toFixed(2),
      lastDonationDate: lastDonationDate,
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const fetchRoleAndStats = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.role !== "admin") {
        router.replace("/priest/dashboard");
        return;
      }

      setRole("admin");
      await fetchSummary();
    };

    fetchRoleAndStats();
  }, [user, loading, router, fetchSummary]);

  return (
    <>
      {loading ? <Loader /> : (
        <div className="flex-1 space-y-4 bg-gradient-to-b from-[#f3e7e9] to-[#e3eeff] rounded-lg p-4 min-h-[calc(100vh-9.5rem)]">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">{t("common.dashboard")}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Total Salary (This Month) */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">{t("adminDashboard.totalSalary")} (This Month)</p>
              <p className="text-xl font-semibold mt-1">
                € {statusCards?.totalSalaryThisMonth || "0.00"}
              </p>
            </div>

            {/* 2. Total Insurance Paid (This Month amount and Description) */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">{t("adminDashboard.totalInsurancePaid")} (This Month)</p>
              <p className="text-xl font-semibold mt-1">€ {statusCards?.totalInsuranceThisMonth || "0.00"}</p>
              <p className="text-xs text-gray-400 mt-1">{statusCards?.insuranceDescription || "No insurance payments"}</p>
            </div>

            {/* 3. Total Rent Paid (This Month) */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">{t("adminDashboard.totalRentPaid")} (This Month)</p>
              <p className="text-xl font-semibold mt-1">€ {statusCards?.totalRentThisMonth || "0.00"}</p>
            </div>

            {/* 4. Total Loan Issued (This Month) */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">{t("adminDashboard.totalLoansIssued")} (This Month)</p>
              <p className="text-xl font-semibold mt-1"> {statusCards?.totalLoansIssuedThisMonth || 0}</p>
            </div>

            {/* 5. Number of Active Loans */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">{t("adminDashboard.numberOfActiveLoans")}</p>
              <p className="text-xl font-semibold mt-1">{statusCards?.numberOfActiveLoans || 0}</p>
            </div>

            {/* 6. Last International Transfers (Total Amount and Description) */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">{t("adminDashboard.lastInternationalTransfers")}</p>
              <p className="text-xl font-semibold mt-1">€ {statusCards?.lastInternationalTransfersTotal || "0.00"}</p>
              <p className="text-xs text-gray-400 mt-1 truncate" title={statusCards?.lastInternationalTransfersDescription}>
                {statusCards?.lastInternationalTransfersDescription || "No transfers"}
              </p>
            </div>

            {/* 7. Last Donation Received */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">Last Donation Received</p>
              <p className="text-xl font-semibold mt-1">€ {statusCards?.lastDonationReceived || "0.00"}</p>
              {statusCards?.lastDonationDate && (
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(statusCards.lastDonationDate).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
