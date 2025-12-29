import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "../../hooks/useUser";
import { supabase } from "../../lib/supabaseClient";

type StatusCards = {
  totalSalaryThisMonth: string;
  totalRent: string;
  totalInsurance: string;
  totalLoans: string;
  activeLoans: number;
};

export default function AdminDashboard() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [statusCards, setStatusCards] = useState<StatusCards | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    const [rentSummary,salarySummary, insuranceSummary, loansSummary] = await Promise.all([
      supabase
        .from("admin_house_rent_summary")
        .select("*"),
      supabase
        .from("admin_salary_summary")
        .select("*"),
      supabase
        .from("admin_insurance_summary")
        .select("*"),
      supabase
        .from("loans")
        .select("*")
        .gt("closed_on", new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + (new Date().getDate()))
    ]);
    setStatusCards((prev) => ({
      ...prev,
      totalRent: (rentSummary?.data ? rentSummary?.data?.reduce((acc: any, curr: any) => acc + curr.total_payout, 0) : 0).toString(),
      totalSalaryThisMonth: (salarySummary?.data ? salarySummary?.data?.reduce((acc: any, curr: any) => acc + curr.total_payout, 0) : 0).toString(),
      totalInsurance: (insuranceSummary?.data ? insuranceSummary?.data?.reduce((acc: any, curr: any) => acc + curr.total_payout, 0) : 0).toString(),
      totalLoans: (loansSummary?.data ? loansSummary?.data?.reduce((acc: any, curr: any) => acc + curr.total_payout, 0) : 0).toString(),
      activeLoans: loansSummary?.data ? loansSummary?.data?.length : 0,
    }));
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
    <div className="flex-1 space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800 mb-2">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Total Salary</p>
          <p className="text-xl font-semibold mt-1">
            € {statusCards?.totalSalaryThisMonth}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Total Rent Paid</p>
          <p className="text-xl font-semibold mt-1">€ {statusCards?.totalRent}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Total Insurance Paid</p>
          <p className="text-xl font-semibold mt-1">€ {statusCards?.totalInsurance}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Last International Transfers</p>
          <p className="text-xl font-semibold mt-1">€ {statusCards?.activeLoans}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Total Loans Issued</p>
          <p className="text-xl font-semibold mt-1">{statusCards?.activeLoans}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Number of Active Loans</p>
          <p className="text-xl font-semibold mt-1">{statusCards?.activeLoans}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Other Expenses</p>
          <p className="text-xl font-semibold mt-1">€ {statusCards?.activeLoans}</p>
        </div>
      </div>
    </div>
  );
}
