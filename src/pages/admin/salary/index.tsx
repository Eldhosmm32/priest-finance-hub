import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useUser } from "../../../hooks/useUser";
import { supabase } from "../../../lib/supabaseClient";

type SalaryRow = {
  id: string;
  priest_id: string;
  salary_amount: number;
  salary_notes: string;
  month: string;
  profiles?: { full_name: string | null; email: string | null };
};

type PriestOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type SalarySummary = {
  total_payout: number;
  priests_recorded: number;
  month: string | null;
};

// Constants
const SALARY_QUERY = "id, priest_id, salary_amount, month, profiles!salary_priest_id_fkey(full_name, email)";
const INITIAL_FORM_STATE = {
  salary_amount: "",
  salary_notes: "",
};

// Toast utilities
const showToast = (message: string, type: "success" | "error") => {
  toast[type](message, {
    position: "top-center",
    style: {
      backgroundColor: type === "success" ? "#4ade80" : "#f87171",
      color: "#fff",
    },
  });
};

export default function AdminSalary() {
  const { user, loading } = useUser();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [salary, setSalary] = useState<SalaryRow[]>([]);
  const [priests, setPriests] = useState<PriestOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [priestId, setPriestId] = useState("");
  const [startMonth, setStartMonth] = useState(`${currentYear}-${currentMonth}`);
  const [endMonth, setEndMonth] = useState(`${currentYear}-${currentMonth}`);
  const [dialogeMonth, setDialogeMonth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [salarySummary, setSalarySummary] = useState<SalarySummary>({
    total_payout: 0,
    priests_recorded: 0,
    month: null,
  });
  const [salaryForm, setSalaryForm] = useState<Record<string, string>>(INITIAL_FORM_STATE);

  // Update individual field value
  const updateField = (fieldName: string, value: string) => {
    setSalaryForm((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Load salary and summary data
  const loadSalaryData = useCallback(async () => {
    const [salaryResult, summaryResult] = await Promise.all([
      supabase
        .from("salary")
        .select(SALARY_QUERY)
        .gte("month", startMonth + '-01')
        .lte("month", endMonth + '-01')
        .order("month", { ascending: false })
        .limit(100),
      supabase
        .from("admin_salary_summary")
        .select("*")
        .gte("month", startMonth + '-01')
        .lte("month", endMonth + '-01'),
    ]);

    setSalary((salaryResult.data ?? []) as unknown as SalaryRow[]);
    
    // Aggregate summary data from multiple months
    const summaryData = summaryResult.data ?? [];
    const aggregatedSummary = summaryData.reduce(
      (acc, curr: any) => ({
        total_payout: acc.total_payout + (curr.total_payout || 0),
        priests_recorded: Math.max(acc.priests_recorded, curr.priests_recorded || 0),
        month: null, // Not applicable for range
      }),
      { total_payout: 0, priests_recorded: 0, month: null }
    );
    
    setSalarySummary(aggregatedSummary);
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

  // Reload data when month range changes
  useEffect(() => {
    if (!user || loading) return;
    loadSalaryData();
  }, [startMonth, endMonth, loadSalaryData, user, loading]);

  const resetForm = () => {
    setPriestId("");
    setDialogeMonth(`${currentYear}-${currentMonth}`);
    setSalaryForm(INITIAL_FORM_STATE);
    setEditingId(null);
    setError(null);
  };

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!priestId || !dialogeMonth) {
      showToast("Please enter all required fields", "error");
      return;
    }

    const monthDate = `${dialogeMonth}-01`;

    // Check for duplicate entry (only for new entries, not edits)
    if (!editingId) {
      const { data: existingEntry } = await supabase
        .from("salary")
        .select("id")
        .eq("priest_id", priestId)
        .eq("month", monthDate)
        .maybeSingle();

      if (existingEntry) {
        setError("A salary entry already exists for this priest in the selected month.");
        return;
      }
    }

    // Prepare salary data
    const salaryData: Record<string, any> = {
      priest_id: priestId,
      salary_amount: parseFloat(salaryForm.salary_amount) || 0,
      month: monthDate,
    };

    // Add all form fields
    Object.keys(INITIAL_FORM_STATE).forEach((key) => {
      salaryData[key] = key === "salary_notes" ? salaryForm[key] : parseFloat(salaryForm[key]) || 0;
    });

    const query = editingId
      ? supabase.from("salary").update(salaryData).eq("id", editingId)
      : supabase.from("salary").insert(salaryData);

    const { error, data } = await query.select(SALARY_QUERY).maybeSingle();

    if (error) {
      console.error(error);
      setError("Failed to save salary entry. Please try again.");
      return;
    }

    if (data) {
      setSalary((prev) =>
        editingId
          ? prev.map((s) => (s.id === editingId ? (data as unknown as SalaryRow) : s))
          : [data as unknown as SalaryRow, ...prev]
      );
      showToast(editingId ? "Salary updated successfully" : "Salary added successfully", "success");
      await loadSalaryData();
      resetForm();
      setOpen(false);
    }
  };

  const handleEdit = async (id: string) => {
    const { data: currentSalary } = await supabase.from("salary").select("*").eq("id", id).maybeSingle();
    if (currentSalary) {
      const formData: Record<string, string> = { ...INITIAL_FORM_STATE };
      Object.keys(INITIAL_FORM_STATE).forEach((key) => {
        formData[key] = currentSalary[key] != null ? String(currentSalary[key]) : "";
      });
      setSalaryForm(formData);
      setPriestId(currentSalary.priest_id);
      setDialogeMonth(currentSalary.month ? currentSalary.month.substring(0, 7) : "");
      setEditingId(id);
      setOpen(true);
    }
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
      <h1 className="text-2xl font-semibold text-gray-800 mb-2">
        Salary Management
      </h1>

      <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex justify-between items-end">
        <div className="flex w-full gap-2">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600">Start Month</label>
            <input
              type="month"
              className="input"
              onChange={(e) => setStartMonth(e.target.value)}
              value={startMonth}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600">End Month</label>
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
        >
          <Plus /> Add salary
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
              <DialogTitle>{editingId ? "Edit Salary" : "Add Salary"}</DialogTitle>
            </DialogHeader>
            {error && (
              <div className="bg-red-50 border text-sm border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center " >
                {error}
                <button className="text-red-700" onClick={() => setError(null)}> x</button>
              </div>
            )}
            <form onSubmit={handleAdd} className="bg-white flex flex-wrap gap-3 items-end">
              <div className="flex gap-2 border border-gray-200 rounded-lg px-2 w-full">
                <div className="flex flex-col py-3 w-1/2">
                  <label className="text-xs font-medium text-gray-600 mb-1">Priest</label>
                  <Select value={priestId} onValueChange={setPriestId} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priest" />
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

                <div className="flex flex-col py-3 w-1/2">
                  <label className="text-xs font-medium text-gray-600 mb-1">Month</label>
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
                <label className="text-xs font-medium w-full">Salary Paid</label>
                <input
                  type="number"
                  className="input"
                  onChange={(e) => updateField("salary_amount", e.target.value)}
                  value={salaryForm.salary_amount}
                  required
                  step="0.01"
                  placeholder="Salary paid"
                />

                <label className="text-xs font-medium w-full">
                  Notes <span className="font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  className="input"
                  onChange={(e) => updateField("salary_notes", e.target.value)}
                  value={salaryForm.salary_notes}
                  placeholder="Notes"
                />
              </div>
            </form>
            <DialogFooter>
              <div className="flex justify-end gap-2 items-center w-full">
                <Button size="sm" type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="btn" onClick={handleAdd}>
                  {editingId ? "Update salary" : "Add salary"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex gap-2">
          <div className="w-2/3 bg-white border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Priest</th>
                  <th className="px-3 py-2 text-left">Month</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {salary.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      {s.profiles?.full_name || s.profiles?.email || s.priest_id}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(s.month).toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2 text-right">€ {s.salary_amount}</td>
                    <td className="px-3 py-2 flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(s.id)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
                {!salary.length && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                      No salary entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="w-1/3 h-fit bg-white border border-gray-200 rounded-lg">
            <div className="p-2 border-b border-gray-200">
              <h2 className="font-semibold">Salary Summary</h2>
            </div>
            <div className="flex flex-col gap-2 p-2">
              <p className="text-sm text-gray-500">
                From{" "}
                {startMonth && endMonth
                  ? `${new Date(startMonth).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })} - ${new Date(endMonth).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })}`
                  : "all time"}
              </p>
              <h1 className="font-bold text-2xl">€ {salarySummary?.total_payout ?? "N/A"}</h1>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
