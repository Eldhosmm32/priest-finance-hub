import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useUser } from "../../../hooks/useUser";
import { supabase } from "../../../lib/supabaseClient";
import useMediaQuery from "@/hooks/useMediaQuery";

type LoanRow = {
  id: string;
  priest_id: string;
  principal: number;
  emi: number;
  issued_on: string;
  created_at: string;
  loan_notes?: string;
  profiles?: { full_name: string | null; email: string | null };
};

type PriestOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

// Constants
const LOAN_QUERY = "id, priest_id, principal, emi, issued_on, created_at, loan_notes, profiles!loans_priest_id_fkey(full_name, email)";
const INITIAL_FORM_STATE = {
  principal: "",
  emi: "",
  loan_notes: "",
  closed_on: "",
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
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [priests, setPriests] = useState<PriestOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [priestId, setPriestId] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<LoanRow | null>(null);
  const [loanForm, setLoanForm] = useState<Record<string, string>>(INITIAL_FORM_STATE);
  const [search, setSearch] = useState("");
  const isDesktop = useMediaQuery("(min-width: 768px)")
  // Update individual field value
  const updateField = (fieldName: string, value: string) => {
    setLoanForm((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Load loans data
  const loadLoanData = useCallback(async () => {
    const { data: loanResult } = await supabase
      .from("loans")
      .select(LOAN_QUERY)
      .order("issued_on", { ascending: false })
      .limit(100);

    setLoans((loanResult ?? []) as unknown as LoanRow[]);
  }, []);

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

  // Reload data when component mounts
  useEffect(() => {
    if (!user || loading) return;
    loadLoanData();
  }, [user, loading, loadLoanData]);

  const resetForm = () => {
    setPriestId("");
    setIssuedOn("");
    setLoanForm(INITIAL_FORM_STATE);
    setEditingId(null);
    setError(null);
  };

  const getClosedOn = (principal: number, emi: number) => {
    const emis = Math.ceil(principal / emi);
    const lastEMIDate = new Date(issuedOn);
    lastEMIDate.setMonth(lastEMIDate.getMonth() + emis);
    return lastEMIDate.toISOString();
  };

  const handleAdd = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!priestId || !issuedOn) {
      showToast("Please enter all required fields", "error");
      return;
    }

    // Prepare loan data
    const loanData: Record<string, any> = {
      priest_id: priestId,
      principal: parseFloat(loanForm.principal) || 0,
      emi: parseFloat(loanForm.emi) || 0,
      issued_on: issuedOn,
      closed_on: getClosedOn(parseFloat(loanForm.principal), parseFloat(loanForm.emi)),
    };

    // Add optional fields
    if (loanForm.loan_notes) {
      loanData.loan_notes = loanForm.loan_notes;
    }

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
  }, [priestId, issuedOn, editingId, loanForm, loadLoanData]);

  const handleEdit = async (loan: LoanRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoanForm({
      principal: loan.principal.toString(),
      emi: loan.emi.toString(),
      loan_notes: loan.loan_notes || "",
    });
    setPriestId(loan.priest_id);
    setEditingId(loan.id);
    setOpen(true);
  };

  const handleView = (loan: LoanRow) => {
    setSelectedLoan(loan);
    setOpenView(true);
  };

  // Calculate loan details for selected loan
  const calculateLoanDetails = (loan: LoanRow) => {
    const principalDisbursed = loan.principal;
    const monthlyEMI = loan.emi;

    // Calculate months since issued
    const issuedDate = new Date(loan.issued_on);
    const today = new Date();
    const monthsPassed = Math.max(
      0,
      (today.getFullYear() - issuedDate.getFullYear()) * 12 +
      (today.getMonth() - issuedDate.getMonth())
    );



    // Calculate total EMI paid (no interest, so EMI = principal payment)
    const totalEMIPaid = monthlyEMI * monthsPassed;
    const principalPaid = Math.min(totalEMIPaid, principalDisbursed);
    const outstandingBalance = Math.max(0, principalDisbursed - principalPaid);

    //estimate last emi date
    const emis = Math.ceil(principalDisbursed / monthlyEMI);
    const lastEMIDate = new Date(issuedDate);
    lastEMIDate.setMonth(lastEMIDate.getMonth() + emis);
    const numberOfMonths = principalDisbursed / monthlyEMI;
    const firstEMIDate = new Date(issuedDate);
    firstEMIDate.setMonth(firstEMIDate.getMonth() + 1);
    return {
      monthlyEMI,
      principalDisbursed,
      emiPaid: totalEMIPaid,
      principalPaid,
      outstandingBalance,
      firstEMIDate,
      lastEMIDate,
      numberOfMonths
    };
  };

  const filteredLoans = loans.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.profiles?.full_name ?? "").toLowerCase().includes(q) ||
      (l.profiles?.email ?? "").toLowerCase().includes(q)
    );
  });

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
        <div className="flex flex-col flex-1 md:flex-none">
          <label className="text-xs font-medium text-gray-600">Search by name or email</label>
          <input
            className="input w-full md:max-w-xs"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge className="text-xs font-medium text-white bg-green-500 w-fit">
          {filteredLoans.length} loans
        </Badge>
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
          <DialogContent aria-describedby="add-loan">
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
                  <label className="text-xs font-medium text-gray-600 mb-1">Issued On</label>
                  <input
                    type="date"
                    className="input"
                    value={issuedOn}
                    onChange={(e) => setIssuedOn(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg w-full max-h-[400px] p-2 overflow-y-auto">
                <label className="text-xs font-medium w-full">Principal Amount</label>
                <input
                  type="number"
                  className="input"
                  onChange={(e) => updateField("principal", e.target.value)}
                  value={loanForm.principal}
                  required
                  step="0.01"
                  placeholder="Principal amount"
                />

                <label className="text-xs font-medium w-full">EMI Amount</label>
                <input
                  type="number"
                  className="input"
                  onChange={(e) => updateField("emi", e.target.value)}
                  value={loanForm.emi}
                  required
                  step="0.01"
                  placeholder="EMI amount"
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

        {isDesktop ?
          <Dialog
            open={openView}
            onOpenChange={setOpenView}
            aria-describedby="'loan-details'"
          >

            <DialogContent >
              <DialogHeader className="hidden">
                <DialogTitle></DialogTitle>
              </DialogHeader>
              {selectedLoan &&
                <>
                  <div className="pb-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Loan Details</h2>
                    <p className="text-sm text-gray-500 mt-1">Summary of your active loan</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {(() => {
                      const details = calculateLoanDetails(selectedLoan);
                      return (
                        <>
                          <div className="flex gap-2">
                            <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-2  w-full">
                              <span className="text-xl">📅</span>
                              <div className="flex flex-col gap-0 text-sm">
                                <span className="text-gray-700">Issued On</span>
                                <span className="font-semibold text-gray-800">
                                  {new Date(selectedLoan.issued_on).toLocaleDateString(
                                    undefined, {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-2  w-full">
                              <span className="text-xl">📅</span>
                              <div className="flex flex-col gap-0 text-sm">
                                <span className="text-gray-700">First EMI Date</span>
                                <span className="font-semibold text-gray-800">
                                  {new Date(details.firstEMIDate).toLocaleDateString(
                                    undefined, {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-2  w-full">
                              <span className="text-xl">📅</span>
                              <div className="flex flex-col gap-0 text-sm">
                                <span className="text-gray-700">Last EMI Date</span>
                                <span className="font-semibold text-gray-800">
                                  {new Date(details.lastEMIDate).toLocaleDateString(
                                    undefined, {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border border-gray-200 rounded-lg p-2  w-full">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">💰</span>
                              <span className="text-gray-700">Principal Disbursed</span>
                            </div>
                            <span className="font-semibold text-gray-800">
                              € {details.principalDisbursed.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border border-gray-200 rounded-lg p-2  w-full">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">💵</span>
                              <span className="text-gray-700">EMI Paid Monthly</span>
                            </div>
                            <div className="flex flex-col gap-0">
                              <span className="font-semibold text-gray-800">
                                € {details.monthlyEMI}
                              </span>
                              <span className="text-xs">{details.numberOfMonths} months</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border border-gray-200 rounded-lg p-2  w-full">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">📝</span>
                              <span className="text-gray-700">Principal Paid</span>
                            </div>
                            <span className="font-semibold text-gray-800">
                              € {details.principalPaid.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">⚠️</span>
                              <span className="text-gray-700">Outstanding Balance</span>
                            </div>
                            <span className="font-semibold text-red-600">
                              € {details.outstandingBalance.toFixed(2)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              }

              <DialogFooter>
                <div className="flex justify-end gap-2 items-center w-full">
                  <Button size="sm" type="button" variant="outline" className="border-gray-300" onClick={() => setOpenView(false)}>
                    Cancel
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          :
          <Drawer
            open={openView}
            onOpenChange={setOpenView}
            aria-describedby="'loan-details'">
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Loan Details</DrawerTitle>
                <DrawerDescription>Summary of the loan</DrawerDescription>
              </DrawerHeader>
              {selectedLoan &&
                <>
                  <div className="flex flex-col gap-4 p-4 ">
                    {(() => {
                      const details = calculateLoanDetails(selectedLoan);
                      return (
                        <>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-2 w-full">
                              <span className="text-xl">📅</span>
                              <div className="flex flex-col gap-0 text-sm">
                                <span className="text-gray-700">Issued On</span>
                                <span className="font-semibold text-gray-800">
                                  {new Date(selectedLoan.issued_on).toLocaleDateString(
                                    undefined, {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-2 w-full">
                              <span className="text-xl">📅</span>
                              <div className="flex flex-col gap-0 text-sm">
                                <span className="text-gray-700">First EMI Date</span>
                                <span className="font-semibold text-gray-800">
                                  {new Date(details.firstEMIDate).toLocaleDateString(
                                    undefined, {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-2 w-full">
                              <span className="text-xl">📅</span>
                              <div className="flex flex-col gap-0 text-sm">
                                <span className="text-gray-700">Last EMI Date</span>
                                <span className="font-semibold text-gray-800">
                                  {new Date(details.lastEMIDate).toLocaleDateString(
                                    undefined, {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">💰</span>
                              <span className="text-gray-700">Principal Disbursed</span>
                            </div>
                            <span className="font-semibold text-gray-800">
                              € {details.principalDisbursed.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">💵</span>
                              <span className="text-gray-700">EMI Paid Monthly</span>
                            </div>
                            <div className="flex flex-col gap-0">
                              <span className="font-semibold text-gray-800">
                                € {details.monthlyEMI}
                              </span>
                              <span className="text-xs">{details.numberOfMonths} months</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">📝</span>
                              <span className="text-gray-700">Principal Paid</span>
                            </div>
                            <span className="font-semibold text-gray-800">
                              € {details.principalPaid.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">⚠️</span>
                              <span className="text-gray-700">Outstanding Balance</span>
                            </div>
                            <span className="font-semibold text-red-600">
                              € {details.outstandingBalance.toFixed(2)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              }
              <DrawerFooter>
                <Button size="sm" type="button" variant="outline" onClick={() => setOpenView(false)}>
                  Cancel
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        }


        <div className="flex flex-col lg:flex-row gap-2">
          <div className="w-full bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Priest</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Principal</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">EMI</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Issued On</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Notes</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan) => (
                  <tr
                    key={loan.id}
                    className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${selectedLoan?.id === loan.id ? "bg-indigo-50" : ""
                      }`}
                    onClick={() => handleView(loan)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {loan.profiles?.full_name || loan.profiles?.email || loan.priest_id}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">€ {loan.principal.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">€ {loan.emi.toFixed(2)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(loan.issued_on).toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {loan.loan_notes}
                    </td>
                    <td className="px-3 py-2 flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={(e) => handleEdit(loan, e)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => handleView(loan)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {!filteredLoans.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                      No loan entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

