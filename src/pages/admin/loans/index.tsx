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

type LoanRow = {
  id: string;
  priest_id: string;
  loan_amount: number;
  interest_rate: number;
  repayment_amount: number;
  loan_notes: string;
  month: string;
  status: number;
  profiles?: { full_name: string | null; email: string | null };
};

type PriestOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type LoanSummary = {
  total_payout: number;
  priests_recorded: number;
  month: string | null;
};

// Constants
const LOAN_QUERY = "id, priest_id, loan_amount, interest_rate, repayment_amount, status, month, profiles!loans_priest_id_fkey(full_name, email)";
const INITIAL_FORM_STATE = {
  loan_amount: "",
  interest_rate: "",
  repayment_amount: "",
  loan_notes: "",
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

export default function AdminLoans() {
  const { user, loading } = useUser();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loanStatus, setLoanStatus] = useState<any>("");
  const [loanSearchStatus, setLoanSearchStatus] = useState<any>("");
  const [priests, setPriests] = useState<PriestOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [priestId, setPriestId] = useState("");
  const [startMonth, setStartMonth] = useState(`${currentYear}-${currentMonth}`);
  const [endMonth, setEndMonth] = useState(`${currentYear}-${currentMonth}`);
  const [dialogeMonth, setDialogeMonth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loanSummary, setLoanSummary] = useState<LoanSummary>({
    total_payout: 0,
    priests_recorded: 0,
    month: null,
  });
  const [loanForm, setLoanForm] = useState<Record<string, string>>(INITIAL_FORM_STATE);
  const loanStatusOptions = [
    {
      id: 1,
      name: "Active",
    },
    {
      id: 2,
      name: "Repaying",
    },
    {
      id: 3,
      name: "Paid",
    },
    {
      id: 4,
      name: "Defaulted",
    },
  ];

  // Update individual field value
  const updateField = (fieldName: string, value: string) => {
    setLoanForm((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Load loans and summary data
  const loadLoanData = useCallback(async () => {
    let query = supabase
      .from("loans")
      .select(LOAN_QUERY)
      .gte("month", startMonth + '-01')
      .lte("month", endMonth + '-01')
      .order("month", { ascending: false })
      .limit(100);
    if (loanSearchStatus) {
      query = query.eq("status", loanSearchStatus.toString());
    }
    const [loanResult, summaryResult] = await Promise.all([
      query,
      supabase
        .from(`admin_loans_summary${loanSearchStatus ? '_' + loanSearchStatus : ''}`)
        .select("*")
        .gte("month", startMonth + '-01')
        .lte("month", endMonth + '-01'),
    ]);

    setLoans((loanResult.data ?? []) as unknown as LoanRow[]);

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

    setLoanSummary(aggregatedSummary);
  }, [startMonth, endMonth, loanSearchStatus]);

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
    loadLoanData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMonth, endMonth, loanSearchStatus, user, loading]);

  const resetForm = () => {
    setPriestId("");
    setDialogeMonth(`${currentYear}-${currentMonth}`);
    setLoanForm(INITIAL_FORM_STATE);
    setLoanStatus("");
    setEditingId(null);
    setError(null);
  };

  const handleAdd = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!priestId || !dialogeMonth || !loanStatus) {
      showToast("Please enter all required fields", "error");
      return;
    }

    const monthDate = `${dialogeMonth}-01`;

    // Check for duplicate entry (only for new entries, not edits)
    if (!editingId) {
      const { data: existingEntry } = await supabase
        .from("loans")
        .select("id")
        .eq("priest_id", priestId)
        .eq("month", monthDate)
        .eq("status", loanStatus)
        .maybeSingle();

      if (existingEntry) {
        setError("A loan entry already exists for this priest in the selected month.");
        return;
      }
    }

    // Prepare loan data
    const loanData: Record<string, any> = {
      priest_id: priestId,
      loan_amount: parseFloat(loanForm.loan_amount) || 0,
      interest_rate: parseFloat(loanForm.interest_rate) || 0,
      repayment_amount: parseFloat(loanForm.repayment_amount) || 0,
      month: monthDate,
      status: loanStatus,
    };

    // Add all form fields
    Object.keys(INITIAL_FORM_STATE).forEach((key) => {
      if (key === "loan_notes") {
        loanData[key] = loanForm[key];
      } else if (!loanData[key]) {
        loanData[key] = parseFloat(loanForm[key]) || 0;
      }
    });

    const query = editingId
      ? supabase.from("loans").update(loanData).eq("id", editingId)
      : supabase.from("loans").insert(loanData);

    const { error, data } = await query.select(LOAN_QUERY).maybeSingle();

    if (error) {
      console.error(error);
      setError("Failed to save loan entry. Please try again.");
      return;
    }

    if (data) {
      setLoans((prev) =>
        editingId
          ? prev.map((s) => (s.id === editingId ? (data as unknown as LoanRow) : s))
          : [data as unknown as LoanRow, ...prev]
      );
      showToast(editingId ? "Loan updated successfully" : "Loan added successfully", "success");
      await loadLoanData();
      resetForm();
      setOpen(false);
    }
  }, [loanStatus, priestId, dialogeMonth, editingId, loanForm, loadLoanData]);

  const handleEdit = async (id: string) => {
    const { data: currentLoan } = await supabase.from("loans").select("*").eq("id", id).maybeSingle();
    if (currentLoan) {
      const formData: Record<string, string> = { ...INITIAL_FORM_STATE };
      Object.keys(INITIAL_FORM_STATE).forEach((key) => {
        formData[key] = currentLoan[key] != null ? String(currentLoan[key]) : "";
      });
      setLoanForm(formData);
      setPriestId(currentLoan.priest_id);
      setDialogeMonth(currentLoan.month ? currentLoan.month.substring(0, 7) : "");
      setLoanStatus(currentLoan.status || "");
      setEditingId(id);
      setOpen(true);
    }
  };

  const searchByStatus = (status?: number) => {
    setLoanSearchStatus(status);
    loadLoanData();
  };

  const getLoanBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge className="text-xs bg-green-100 text-green-800">Active</Badge>;
      case 2:
        return <Badge className="text-xs bg-blue-100 text-blue-800">Repaying</Badge>;
      case 3:
        return <Badge className="text-xs bg-gray-100 text-gray-800">Paid</Badge>;
      case 4:
        return <Badge className="text-xs bg-red-100 text-red-800">Defaulted</Badge>;
      default:
        return <Badge className="text-xs bg-gray-100 text-gray-800">Unknown</Badge>;
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
    <div className="flex-1 space-y-2">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">
        Loan Management
      </h1>

      <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex flex-col md:flex-row justify-between md:items-end gap-2">
        <div className="flex w-full gap-2">
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
          <div className="flex flex-col flex-1 md:flex-none">
            <label className="text-xs font-medium text-gray-600">Loan Status</label>
            <div className="flex items-center gap-2">
              <Select value={loanSearchStatus.toString()} onValueChange={(value) => searchByStatus(Number(value))} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select loan status" />
                </SelectTrigger>
                <SelectContent>
                  {loanStatusOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loanSearchStatus && <XIcon className="w-4 h-4 text-gray-500 cursor-pointer flex-shrink-0" onClick={() => { searchByStatus(); setLoanSearchStatus("") }} />}
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
          <Plus /> Add loan
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
              <DialogTitle>{editingId ? "Edit Loan" : "Add Loan"}</DialogTitle>
            </DialogHeader>
            {error && (
              <div className="bg-red-50 border text-sm border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
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

              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg w-full max-h-[400px] p-2 overflow-y-auto">
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-600 mb-1">Loan Status</label>
                  <Select value={loanStatus.toString()} onValueChange={(value) => { setLoanStatus(Number(value)) }} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select loan status" />
                    </SelectTrigger>
                    <SelectContent>
                      {loanStatusOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <label className="text-xs font-medium w-full">Loan Amount</label>
                <input
                  type="number"
                  className="input"
                  onChange={(e) => updateField("loan_amount", e.target.value)}
                  value={loanForm.loan_amount}
                  required
                  step="0.01"
                  placeholder="Loan amount"
                />

                <label className="text-xs font-medium w-full">Interest Rate (%)</label>
                <input
                  type="number"
                  className="input"
                  onChange={(e) => updateField("interest_rate", e.target.value)}
                  value={loanForm.interest_rate}
                  required
                  step="0.01"
                  placeholder="Interest rate"
                />

                <label className="text-xs font-medium w-full">Repayment Amount</label>
                <input
                  type="number"
                  className="input"
                  onChange={(e) => updateField("repayment_amount", e.target.value)}
                  value={loanForm.repayment_amount}
                  required
                  step="0.01"
                  placeholder="Repayment amount"
                />

                <label className="text-xs font-medium w-full">
                  Notes <span className="font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  className="input"
                  onChange={(e) => updateField("loan_notes", e.target.value)}
                  value={loanForm.loan_notes}
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
                  {editingId ? "Update loan" : "Add loan"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex flex-col lg:flex-row gap-2">
          <div className="block md:hidden w-full h-fit bg-white border border-gray-200 rounded-lg">
            <div className="py-2 px-3 border rounded-lg border-indigo-100 bg-indigo-100 text-indigo-600 flex justify-between items-center">
              <h2 className="font-normal ">Loan Summary </h2>
              <span className="font-semibold">€ {loanSummary?.total_payout ?? "N/A"}</span>
            </div>
          </div>
          <div className="w-full lg:w-2/3 bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Priest</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Month</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Loan Amount</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Interest Rate</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Repayment</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((s) => (
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
                      {getLoanBadge(s.status)}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">€ {s.loan_amount}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{s.interest_rate}%</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">€ {s.repayment_amount}</td>
                    <td className="px-3 py-2 flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(s.id)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loans.length && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                      No loan entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="hidden md:block w-1/3 h-fit bg-white border border-gray-200 rounded-lg">
            <div className="p-2 border-b border-gray-200">
              <h2 className="font-semibold">Loan Summary</h2>
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
              <h1 className="font-bold text-2xl">€ {loanSummary?.total_payout ?? "N/A"}</h1>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

