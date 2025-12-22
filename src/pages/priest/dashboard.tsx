import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AnnouncementList from "../../components/AnnouncementList";
import { useUser } from "../../hooks/useUser";
import { supabase } from "../../lib/supabaseClient";
import PriestLayout from "../../components/PriestLayout";

export default function PriestDashboard() {
  const { user, loading } = useUser();
  const router = useRouter();

  const [salary, setSalary] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      const [
        { data: salaryRows },
        { data: insuranceRows },
        { data: loanRows },
        { data: announcementRows },
      ] = await Promise.all([
        supabase
          .from("salary")
          .select("*")
          .eq("priest_id", user.id)
          .order("month", { ascending: false }),
        supabase.from("insurance").select("*").eq("priest_id", user.id),
        supabase.from("loans").select("*").eq("priest_id", user.id),
        supabase
          .from("announcements")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setSalary(salaryRows ?? []);
      setInsurance(insuranceRows ?? []);
      setLoans(loanRows ?? []);
      setAnnouncements(
        (announcementRows ?? []).map((a: any) => ({
          id: a.id,
          title: a.title_en ?? "",
          body: a.body_en ?? "",
          created_at: a.created_at,
        }))
      );
      setDataLoading(false);
    };

    load();
  }, [user, loading, router]);

  if (loading || !user || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Your Dashboard</h1>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Recent salary
          </h2>
          {salary.length ? (
            <ul className="space-y-1 text-sm">
              {salary.slice(0, 6).map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span>
                    {new Date(s.month).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span>€ {s.amount}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">No salary records.</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Insurance
          </h2>
          {insurance.length ? (
            <ul className="space-y-1 text-sm">
              {insurance.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>{i.type}</span>
                  <span>€ {i.amount}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">No insurance records.</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Loans</h2>
          {loans.length ? (
            <ul className="space-y-1 text-sm">
              {loans.map((l) => (
                <li key={l.id} className="flex justify-between">
                  <span>Principal</span>
                  <span>€ {l.principal}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">No loans.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Announcements
        </h2>
        <AnnouncementList items={announcements} />
      </section>
    </div>
  );
}
