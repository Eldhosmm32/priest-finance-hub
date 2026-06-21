import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/languageContext";
import Loader from "@/components/ui/loader";


type PriestRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  photo: string | null;
  province: string | null;
};

type ProvinceOption = {
  id: string;
  province_name: string;
};

export default function AdminPriests() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const [priests, setPriests] = useState<PriestRow[]>([]);
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
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
        router.replace("/login");
        return;
      }

      const { data: provinceRows } = await supabase
        .from("provinces")
        .select("id, province_name")
        .order("province_name", { ascending: true });

      setProvinces((provinceRows ?? []) as ProvinceOption[]);

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          active,
          priests!priests_id_fkey(province)
        `)
        .eq("role", "priest")
        .order("full_name", { ascending: true });

      if (error) {
        console.error(error);
      } else {
        const mappedPriests = (data ?? []).map((row: any) => ({
          id: row.id,
          email: row.email,
          full_name: row.full_name,
          phone: row.phone ?? null,
          address: row.address ?? null,
          active: row.active,
          photo: row.photo ?? null,
          province: row.priests?.province ?? null,
        })) as PriestRow[];

        setPriests(mappedPriests);
      }
      setLoadingData(false);
    };

    load();
  }, [user, loading, router]);

  const filteredPriests = priests.filter((p) => {
    const matchesProvince = !selectedProvince || p.province === selectedProvince;
    const matchesSearch = !search.trim()
      ? true
      : ((p.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.email ?? "").toLowerCase().includes(search.toLowerCase()));

    return matchesProvince && matchesSearch;
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


  const openPriestDetail = (priest: PriestRow) => {
    router.push(`/admin/priests/${priest.id}`);
  };

  if (loading || loadingData) {
    return (
      <Loader />
    );
  }

  return (
    <div className="space-y-4 ">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">{t("adminPriests.title")}</h1>
      <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex flex-col md:flex-row justify-between md:items-end gap-2">

        <div className="flex gap-2">
          <div className="flex flex-col flex-1 md:flex-none gap-1">
            <label className="text-xs font-medium text-gray-600">{t("adminPriests.searchLabel")}</label>
            <input
              className="input w-full md:max-w-xs"
              placeholder={t("adminPriests.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1 md:w-56">
            <label className="text-xs font-medium text-gray-600">Province</label>
            <select
              className="input"
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
            >
              <option value="">All Provinces</option>
              {provinces.map((province) => (
                <option key={province.id} value={province.id}>
                  {province.province_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Badge className="text-xs font-medium text-white bg-green-500 w-fit">
          {filteredPriests.length} {t("adminPriests.priestsCount")}
        </Badge>
      </div>

      <div className="p-1 rounded-lg bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-auto rounded-lg max-h-[calc(100vh-18.5rem)] thin-scroll">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-30">
              <tr>
                <th className="px-3 py-2 text-left">{t("common.name")}</th>
                <th className="px-3 py-2 text-left">{t("common.email")}</th>
                <th className="px-3 py-2">{t("common.active")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPriests.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 cursor-pointer hover:bg-gray-100" onClick={() => openPriestDetail(p)}>
                  <td className="px-3 py-2 cursor-pointer">
                    <p> {p.full_name}</p>
                  </td>
                  <td className="px-3 py-2">{p.email}</td>
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <Switch checked={p.active} onCheckedChange={(checked) => toggleActive(p.id, checked as boolean)} />
                  </td>
                </tr>
              ))}


              {!filteredPriests.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-sm text-gray-500"
                  >
                    {t("adminPriests.noPriestsFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
