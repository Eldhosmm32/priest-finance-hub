import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useUser } from "../../hooks/useUser";
import { supabase } from "../../lib/supabaseClient";

type PriestRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "admin" | "priest";
  active: boolean;
};

export default function fundTransfer() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [priests, setPriests] = useState<PriestRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.role !== "admin") {
        router.replace("/priest/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, active")
        .order("full_name", { ascending: true });

      if (error) {
        console.error(error);
      } else {
        setPriests((data ?? []) as PriestRow[]);
      }
      setLoadingData(false);
    };

    load();
  }, [user, loading, router]);

  const filteredPriests = priests.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.full_name ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q)
    );
  });

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ active: value })
      .eq("id", id);
    if (error) {
      console.error(error);
      return;
    }
    setPriests((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: value } : p))
    );
  };

  const toggleRole = async (id: string, currentRole: "admin" | "priest") => {
    const newRole = currentRole === "admin" ? "priest" : "admin";
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", id);
    if (error) {
      console.error(error);
      return;
    }
    setPriests((prev) =>
      prev.map((p) => (p.id === id ? { ...p, role: newRole } : p))
    );
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">
          International Transfer
        </h1>
        <input
          className="input max-w-xs"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-auto bg-white border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredPriests.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  {p.full_name || (
                    <span className="text-gray-400">(no name)</span>
                  )}
                </td>
                <td className="px-3 py-2">{p.email}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    className="text-xs px-2 py-1 border rounded"
                    onClick={() => toggleRole(p.id, p.role)}
                  >
                    {p.role}
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={p.active}
                    onChange={(e) => toggleActive(p.id, e.target.checked)}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="text-xs text-indigo-600 underline"
                    onClick={() =>
                      router.push(`/admin/salary/${encodeURIComponent(p.id)}`)
                    }
                  >
                    View salary
                  </button>
                </td>
              </tr>
            ))}
            {!filteredPriests.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-sm text-gray-500"
                >
                  No priests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
