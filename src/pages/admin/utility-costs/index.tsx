import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useUser } from "../../../hooks/useUser";
import { supabase } from "../../../lib/supabaseClient";
import Loader from "@/components/ui/loader";
import { useTranslation } from "../../../i18n/languageContext";

type UtilityCostRow = {
  id: string;
  priest_id: string;
  cost_amount: number;
  cost_notes: string;
  month: string;
  profiles?: { full_name: string | null; email: string | null };
};

type PriestOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type UtilityCostSummary = {
  total_payout: number;
  priests_recorded: number;
  month: string | null;
};

const UTILITY_COSTS_QUERY = "id, priest_id, cost_amount, month, profiles!utility_costs_priest_id_fkey(full_name, email)";
const INITIAL_FORM_STATE = {
  cost_amount: "",
  cost_notes: "",
};

const showToast = (message: string, type: "success" | "error") => {
  toast[type](message, {
    position: "top-center",
    style: {
      backgroundColor: type === "success" ? "#4ade80" : "#f87171",
      color: "#fff",
    },
  });
};

export default function AdminUtilityCosts() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentMonthDate = `${currentYear}-${currentMonth}`;
  const [utilityCosts, setUtilityCosts] = useState<UtilityCostRow[]>([]);
  const [priests, setPriests] = useState<PriestOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [priestId, setPriestId] = useState("");
  const [startMonth, setStartMonth] = useState(currentMonthDate);
  const [endMonth, setEndMonth] = useState(currentMonthDate);
  const [dialogeMonth, setDialogeMonth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [utilityCostSummary, setUtilityCostSummary] = useState<UtilityCostSummary>({
    total_payout: 0,
    priests_recorded: 0,
    month: null,
  });
  const [utilityCostsForm, setUtilityCostsForm] = useState<Record<string, string>>(INITIAL_FORM_STATE);

  const updateField = (fieldName: string, value: string) => {
    setUtilityCostsForm((prev) => ({ ...prev, [fieldName]: value }));
  };

  const loadUtilityCostsData = useCallback(async () => {
    const [costsResult, summaryResult] = await Promise.all([
      supabase
        .from("utility_costs")
        .select(UTILITY_COSTS_QUERY)
        .gte("month", startMonth + '-01')
        .lte("month", endMonth + '-01')
        .order("month", { ascending: false })
        .limit(100),
      supabase
        .from("admin_utility_costs_summary")
        .select("*")
        .gte("month", startMonth + '-01')
        .lte("month", endMonth + '-01'),
    ]);

    setUtilityCosts((costsResult.data ?? []) as unknown as UtilityCostRow[]);

    const summaryData = summaryResult.data ?? [];
    const aggregatedSummary = summaryData.reduce(
      (acc, curr: any) => ({
        total_payout: acc.total_payout + (curr.total_payout || 0),
        priests_recorded: Math.max(acc.priests_recorded, curr.priests_recorded || 0),
        month: null,
      }),
      { total_payout: 0, priests_recorded: 0, month: null }
    );

    setUtilityCostSummary(aggregatedSummary);
  }, [startMonth, endMonth]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const loadPriests = async () => {
      const { data: priestRows } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "priest")
        .order("full_name", { ascending: true });
      setPriests((priestRows ?? []) as PriestOption[]);
      setLoadingData(false);
    };

    loadPriests();
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || loading) return;
    loadUtilityCostsData();
  }, [startMonth, endMonth, loadUtilityCostsData, user, loading]);

  const resetForm = () => {
    setPriestId("");
    setDialogeMonth(currentMonthDate);
    setUtilityCostsForm(INITIAL_FORM_STATE);
    setEditingId(null);
    setError(null);
  };

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!priestId || !dialogeMonth) {
      showToast(t("toasts.enterAllRequiredFields"), "error");
      return;
    }

    const monthDate = `${dialogeMonth}-01`;

    if (!editingId) {
      const { data: existingEntry } = await supabase
        .from("utility_costs")
        .select("id")
        .eq("priest_id", priestId)
        .eq("month", monthDate)
        .maybeSingle();

      if (existingEntry) {
        setError(t("toasts.utilityCostsEntryExists"));
        return;
      }
    }

    const utilityCostData: Record<string, any> = {
      priest_id: priestId,
      cost_amount: parseFloat(utilityCostsForm.cost_amount) || 0,
      month: monthDate,
    };

    Object.keys(INITIAL_FORM_STATE).forEach((key) => {
      utilityCostData[key] = key === "cost_notes" ? utilityCostsForm[key] : parseFloat(utilityCostsForm[key]) || 0;
    });

    const query = editingId
      ? supabase.from("utility_costs").update(utilityCostData).eq("id", editingId)
      : supabase.from("utility_costs").insert(utilityCostData);

    const { error, data } = await query.select(UTILITY_COSTS_QUERY).maybeSingle();

    if (error) {
      console.error(error);
      setError(t("toasts.failedToSaveUtilityCosts"));
      return;
    }

    if (data) {
      setUtilityCosts((prev) =>
        editingId
          ? prev.map((s) => (s.id === editingId ? (data as unknown as UtilityCostRow) : s))
          : [data as unknown as UtilityCostRow, ...prev]
      );
      showToast(editingId ? t("toasts.utilityCostsUpdated") : t("toasts.utilityCostsAdded"), "success");
      await loadUtilityCostsData();
      resetForm();
      setOpen(false);
    }
  };

  const handleEdit = async (id: string) => {
    const { data: currentCost } = await supabase.from("utility_costs").select("*").eq("id", id).maybeSingle();
    if (currentCost) {
      const formData: Record<string, string> = { ...INITIAL_FORM_STATE };
      Object.keys(INITIAL_FORM_STATE).forEach((key) => {
        formData[key] = currentCost[key] != null ? String(currentCost[key]) : "";
      });
      setUtilityCostsForm(formData);
      setPriestId(currentCost.priest_id);
      setDialogeMonth(currentCost.month ? currentCost.month.substring(0, 7) : "");
      setEditingId(id);
      setOpen(true);
    }
  };

  if (loading || loadingData) {
    return <Loader />;
  }

  return (
    <div className="space-y-4 ">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">
        {t("adminUtilityCosts.title")}
      </h1>

      <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex flex-col md:flex-row justify-between md:items-end gap-2">
        <div className="flex w-full gap-2">
          <div className="flex flex-col flex-1 md:flex-none gap-1">
            <label className="text-xs font-medium text-gray-600">{t("common.startMonth")}</label>
            <input
              type="month"
              className="input"
              onChange={(e) => setStartMonth(e.target.value)}
              value={startMonth}
            />
          </div>
          <div className="flex flex-col flex-1 md:flex-none gap-1">
            <label className="text-xs font-medium text-gray-600">{t("common.endMonth")}</label>
            <input
              type="month"
              className="input"
              onChange={(e) => setEndMonth(e.target.value)}
              value={endMonth}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="w-full md:w-auto"
        >
          <Plus /> {t("adminUtilityCosts.addUtilityCosts")}
        </Button>
      </div>

      <div className=" overflow-auto">
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              resetForm();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? t("adminUtilityCosts.editUtilityCosts") : t("adminUtilityCosts.addUtilityCostsTitle")}</DialogTitle>
            </DialogHeader>
            {error && (
              <div className="bg-red-50 border text-sm border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center " >
                {error}
                <button className="text-red-700" onClick={() => setError(null)}> x</button>
              </div>
            )}
            <form onSubmit={handleAdd} className="bg-white flex flex-wrap gap-3 items-end">
              <div className="flex flex-col sm:flex-row gap-2 border border-gray-200 rounded-lg px-2 w-full">
                <div className="flex flex-col py-3 w-full sm:w-1/2">
                  <label className="text-xs font-medium text-gray-600 mb-1">{t("common.priest")}</label>
                  <Select value={priestId} onValueChange={setPriestId} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("common.selectPriest")} />
                    </SelectTrigger>
                    <SelectContent>
                      {priests.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name || p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col py-3 w-full sm:w-1/2">
                  <label className="text-xs font-medium text-gray-600 mb-1">{t("common.month")}</label>
                  <input
                    type="month"
                    className="input"
                    min="1997-01"
                    max="2030-12"
                    value={dialogeMonth}
                    onChange={(e) => setDialogeMonth(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg w-full max-h-[400px] p-2">
                <label className="text-xs font-medium w-full">{t("adminUtilityCosts.utilityCostPaid")}</label>
                <input
                  type="number"
                  className="input"
                  onChange={(e) => updateField("cost_amount", e.target.value)}
                  value={utilityCostsForm.cost_amount}
                  required
                  step="0.01"
                  placeholder={t("adminUtilityCosts.utilityCostPaidPlaceholder")}
                />

                <label className="text-xs font-medium w-full">
                  {t("common.notes")} <span className="font-normal">{t("common.optional")}</span>
                </label>
                <input
                  type="text"
                  className="input"
                  onChange={(e) => updateField("cost_notes", e.target.value)}
                  value={utilityCostsForm.cost_notes}
                  placeholder={t("common.notesPlaceholder")}
                />
              </div>
            </form>
            <DialogFooter>
              <div className="flex justify-end gap-2 items-center w-full">
                <Button size="sm" type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button size="sm" type="submit" className="btn" onClick={handleAdd}>
                  {editingId ? t("adminUtilityCosts.updateUtilityCosts") : t("adminUtilityCosts.addUtilityCosts")}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex flex-col lg:flex-row gap-2">
          <div className="block md:hidden w-full h-fit bg-white border border-gray-200 rounded-lg">
            <div className="py-2 px-3 border rounded-lg border-indigo-100 bg-indigo-100 text-indigo-600 flex justify-between items-center">
              <h2 className="font-normal ">{t("adminUtilityCosts.utilityCostsSummary")} </h2>
              <span className="font-semibold">€ {utilityCostSummary?.total_payout ?? "N/A"}</span>
            </div>
          </div>
          <div className="w-full lg:w-2/3 bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <div className="overflow-auto rounded-lg max-h-[calc(100vh-21rem)] thin-scroll">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminUtilityCosts.priestColumn")}</th>
                    <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminUtilityCosts.monthColumn")}</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">{t("adminUtilityCosts.amountColumn")}</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {utilityCosts.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {s.profiles?.full_name || s.profiles?.email || s.priest_id}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(s.month).toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">€ {s.cost_amount}</td>
                      <td className="px-3 py-2 flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(s.id)}>
                          {t("common.edit")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!utilityCosts.length && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                        {t("adminUtilityCosts.noUtilityCostsEntries")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="hidden md:block w-1/3 h-fit bg-white border border-gray-200 rounded-lg">
            <div className="p-2 border-b border-gray-200">
              <h2 className="font-semibold">{t("adminUtilityCosts.utilityCostsSummary")}</h2>
            </div>
            <div className="flex flex-col gap-2 p-2">
              <p className="text-sm text-gray-500">
                {t("common.from")} {startMonth && endMonth
                  ? `${new Date(startMonth).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })} - ${new Date(endMonth).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })}`
                  : t("common.allTime")}
              </p>
              <h1 className="font-bold text-2xl">€ {utilityCostSummary?.total_payout ?? "N/A"}</h1>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
