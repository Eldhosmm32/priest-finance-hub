import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, XIcon } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useUser } from "../../../hooks/useUser";
import { supabase } from "../../../lib/supabaseClient";
import { Badge } from "@/components/ui/badge";

type InsuranceRow = {
  id: string;
  priest_id: string;
  amount: number;
  insurance_notes: string;
  month: string;
  type: number;
  profiles?: { full_name: string | null; email: string | null };
};

type PriestOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type InsuranceSummary = {
  total_payout: number;
  priests_recorded: number;
  month: string | null;
};



// Constants
const INSURANCE_QUERY = "id, priest_id, amount, type, month, profiles!insurance_priest_id_fkey(full_name, email)";
const INITIAL_FORM_STATE = {
  amount: "",
  insurance_notes: "",
  plate_number: "",
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

export default function AdminInsurance() {
  const { user, loading } = useUser();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentMonthDate = `${currentYear}-${currentMonth}`;
  const [insurance, setInsurance] = useState<InsuranceRow[]>([]);
  const [insuranceType, setInsuranceType] = useState<any>("");
  const [insuranceSearchType, setInsuranceSearchType] = useState<any>("");
  const [priests, setPriests] = useState<PriestOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [priestId, setPriestId] = useState("");
  const [startMonth, setStartMonth] = useState(currentMonthDate);
  const [endMonth, setEndMonth] = useState(currentMonthDate);
  const [dialogeMonth, setDialogeMonth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [insuranceSummary, setInsuranceSummary] = useState<InsuranceSummary>({
    total_payout: 0,
    priests_recorded: 0,
    month: null,
  });
  const [insuranceForm, setInsuranceForm] = useState<Record<string, string>>(INITIAL_FORM_STATE);
  const insuranceTypeOptions = [{
    id: 1,
    name: "Health",
  }, {
    id: 2,
    name: "Vehicle Insurance",
  }, {
    id: 3,
    name: "KFZ Unfall",
  }, {
    id: 4,
    name: "Lebens",
  }, {
    id: 5,
    name: "Optional types",
  }]

  // Update individual field value
  const updateField = (fieldName: string, value: string) => {
    setInsuranceForm((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Load insurance and summary data
  const loadInsuranceData = useCallback(async () => {
    let query = supabase
      .from("insurance")
      .select(INSURANCE_QUERY)
      .gte("month", startMonth + '-01')
      .lte("month", endMonth + '-01')
      .order("month", { ascending: false })
      .limit(100);
    if (insuranceSearchType) {
      query = query.eq("type", insuranceSearchType.toString());
    }
    const [insuranceResult, summaryResult] = await Promise.all([
      query,
      supabase
        .from(`admin_insurance_summary${insuranceSearchType ? '_' + insuranceSearchType : ''}`)
        .select("*")
        .gte("month", startMonth + '-01')
        .lte("month", endMonth + '-01'),
    ]);

    setInsurance((insuranceResult.data ?? []) as unknown as InsuranceRow[]);

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

    setInsuranceSummary(aggregatedSummary);
  }, [startMonth, endMonth, insuranceSearchType]);

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
    loadInsuranceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMonth, endMonth, insuranceSearchType, user, loading]);

  const resetForm = () => {
    setPriestId("");
    setDialogeMonth(currentMonthDate);
    setInsuranceForm(INITIAL_FORM_STATE);
    setInsuranceType("");
    setEditingId(null);
    setError(null);
  };

  const handleAdd = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!priestId || !dialogeMonth || !insuranceType) {
      showToast("Please enter all required fields", "error");
      return;
    }

    const monthDate = `${dialogeMonth}-01`;

    // Check for duplicate entry (only for new entries, not edits)
    if (!editingId) {
      const { data: existingEntry } = await supabase
        .from("insurance")
        .select("id")
        .eq("priest_id", priestId)
        .eq("month", monthDate)
        .eq("type", insuranceType)
        .maybeSingle();

      if (existingEntry) {
        setError("An insurance entry already exists for this priest in the selected month.");
        return;
      }
    }

    // Prepare insurance data
    const insuranceData: Record<string, any> = {
      priest_id: priestId,
      amount: parseFloat(insuranceForm.amount) || 0,
      month: monthDate,
      type: insuranceType,
    };

    // Add all form fields
    Object.keys(INITIAL_FORM_STATE).forEach((key) => {
      insuranceData[key] = key === "insurance_notes" ? insuranceForm[key] : parseFloat(insuranceForm[key]) || 0;
    });

    const query = editingId
      ? supabase.from("insurance").update(insuranceData).eq("id", editingId)
      : supabase.from("insurance").insert(insuranceData);

    const { error, data } = await query.select(INSURANCE_QUERY).maybeSingle();

    if (error) {
      console.error(error);
      setError("Failed to save insurance entry. Please try again.");
      return;
    }

    if (data) {
      setInsurance((prev) =>
        editingId
          ? prev.map((s) => (s.id === editingId ? (data as unknown as InsuranceRow) : s))
          : [data as unknown as InsuranceRow, ...prev]
      );
      showToast(editingId ? "Insurance updated successfully" : "Insurance added successfully", "success");
      await loadInsuranceData();
      resetForm();
      setOpen(false);
    }
  }, [insuranceType, priestId, dialogeMonth, editingId, insuranceForm]);

  const handleEdit = async (id: string) => {
    const { data: currentInsurance } = await supabase.from("insurance").select("*").eq("id", id).maybeSingle();
    if (currentInsurance) {
      const formData: Record<string, string> = { ...INITIAL_FORM_STATE };
      Object.keys(INITIAL_FORM_STATE).forEach((key) => {
        formData[key] = currentInsurance[key] != null ? String(currentInsurance[key]) : "";
      });
      setInsuranceForm(formData);
      setPriestId(currentInsurance.priest_id);
      setDialogeMonth(currentInsurance.month ? currentInsurance.month.substring(0, 7) : "");
      setInsuranceType(currentInsurance.type || "");
      setEditingId(id);
      setOpen(true);
    }
  };

  const searchByType = (type?: number) => {
    setInsuranceSearchType(type);
    loadInsuranceData();
  };

  const getInsuranceBadge = (type: number) => {
    switch (type) {
      case 1:
        return <Badge className="text-xs bg-green-100 text-green-800"> Health</Badge>
      case 2:
        return <Badge className="text-xs bg-blue-100 text-blue-800"> Vehicle Insurance</Badge>
      case 3:
        return <Badge className="text-xs bg-yellow-100 text-yellow-800"> KFZ Unfall</Badge>
      case 4:
        return <Badge className="text-xs bg-red-100 text-red-800"> Lebens</Badge>
      case 5:
        return <Badge className="text-xs bg-purple-100 text-purple-800"> Optional types</Badge>
      default:
        return <Badge className="text-xs bg-gray-100 text-gray-800"> Unknown</Badge>
    }
  }


  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 bg-gradient-to-b from-[#f3e7e9] to-[#e3eeff] rounded-lg p-4 min-h-[calc(100vh-9.5rem)]">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">
        Insurance Management
      </h1>

      <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex flex-col md:flex-row justify-between md:items-end gap-2">
        <div className="flex w-full gap-2 flex-col md:flex-col lg:flex-row">
          <div className="flex gap-2">
            <div className="flex flex-col flex-1 md:flex-none">
              <label className="text-xs font-medium text-gray-600">Start Month</label>
              <input
                type="month"
                className="input"
                onChange={(e) => setStartMonth(e.target.value)}
                value={startMonth}
              />
            </div>
            <div className="flex flex-col flex-1 md:flex-none">
              <label className="text-xs font-medium text-gray-600">End Month</label>
              <input
                type="month"
                className="input"
                onChange={(e) => setEndMonth(e.target.value)}
                value={endMonth}
              />
            </div>
          </div>
          <div className="flex flex-col flex-1 md:flex-none">
            <label className="text-xs font-medium text-gray-600">Insurance Type</label>
            <div className="flex items-center gap-2">
              <Select value={insuranceSearchType.toString()} onValueChange={(value) => searchByType(Number(value))} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select insurance type" />
                </SelectTrigger>
                <SelectContent>
                  {insuranceTypeOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {insuranceSearchType && <XIcon className="w-4 h-4 text-gray-500 cursor-pointer flex-shrink-0" onClick={() => { searchByType(); setInsuranceSearchType("") }} />}
            </div>
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
          <Plus /> Add insurance
        </Button>
      </div>

      <div className="overflow-auto">
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
              <DialogTitle>{editingId ? "Edit Insurance" : "Add Insurance"}</DialogTitle>
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

                <div className="flex flex-col py-3 w-full sm:w-1/2">
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
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-600 mb-1">Insurance Type</label>
                  <Select value={insuranceType.toString()} onValueChange={(value) => { setInsuranceType(Number(value)) }} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select insurance type" />
                    </SelectTrigger>
                    <SelectContent>
                      {insuranceTypeOptions.filter(p => p.id !== 0).map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {insuranceType === 2 && <>
                  <label className="text-xs font-medium w-full">Vehicle Plate Number</label>
                  <input
                    type="text"
                    className="input"
                    onChange={(e) => updateField("plate_number", e.target.value)}
                    value={insuranceForm.plate_number}
                    required
                    placeholder="Vehicle plate number"
                  />
                </>}

                <label className="text-xs font-medium w-full">Insurance Amount</label>
                <input
                  type="number"
                  className="input"
                  onChange={(e) => updateField("amount", e.target.value)}
                  value={insuranceForm.amount}
                  required
                  step="0.01"
                  placeholder="Insurance amount"
                />

                <label className="text-xs font-medium w-full">
                  Notes <span className="font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  className="input"
                  onChange={(e) => updateField("insurance_notes", e.target.value)}
                  value={insuranceForm.insurance_notes}
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
                  {editingId ? "Update insurance" : "Add insurance"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex flex-col lg:flex-row gap-2">
          <div className="block md:hidden w-full h-fit bg-white border border-gray-200 rounded-lg">
            <div className="py-2 px-3 border rounded-lg border-indigo-100 bg-indigo-100 text-indigo-600 flex justify-between items-center">
              <h2 className="font-normal ">Insurance Summary </h2>
              <span className="font-semibold">€ {insuranceSummary?.total_payout ?? "N/A"}</span>
            </div>
          </div>
          <div className="w-full lg:w-2/3 bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Priest</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Month</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Type</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Amount</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {insurance.map((s) => (
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
                    <td className="px-3 py-2 whitespace-nowrap">
                      {getInsuranceBadge(s.type)}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">€ {s.amount}</td>
                    <td className="px-3 py-2 flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(s.id)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
                {!insurance.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                      No insurance entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="hidden md:block w-1/3 h-fit bg-white border border-gray-200 rounded-lg">
            <div className="p-2 border-b border-gray-200">
              <h2 className="font-semibold">Insurance Summary</h2>
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
              <h1 className="font-bold text-2xl">€ {insuranceSummary?.total_payout ?? "N/A"}</h1>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
