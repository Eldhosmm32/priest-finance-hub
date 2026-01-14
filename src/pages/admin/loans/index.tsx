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
import Loader from "@/components/ui/loader";
import { useTranslation } from "../../../i18n/languageContext";

type LoanRow = {
  id: string;
  priest_id: string;
  principal: number;
  emi: number;
  issued_on: string;
  created_at: string;
  loan_notes?: string;
  profiles?: { full_name: string | null; email: string | null };
  closed_on: string;
  last_emi_amount: number;
  total_months: number;
};

type PriestOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

// Constants
const LOAN_QUERY = "id, priest_id, principal, emi, issued_on, created_at, loan_notes, profiles!loans_priest_id_fkey(full_name, email), closed_on, last_emi_amount, total_months";
const INITIAL_FORM_STATE = {
  principal: "",
  emi: "",
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
  const { t } = useTranslation();
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

  const calculateEmiSummary = (principal: number, monthlyEmi: number, firstEmiDate: string) => {
    if (principal <= 0 || monthlyEmi <= 0) {
      throw new Error("Principal and EMI must be greater than zero");
    }

    const totalMonths = Math.ceil(principal / monthlyEmi);
    const lastEmiAmount =
      principal % monthlyEmi === 0 ? monthlyEmi : principal % monthlyEmi;

    const firstDate = new Date(firstEmiDate);
    const lastEmiDate = new Date(firstDate);
    lastEmiDate.setMonth(firstDate.getMonth() + totalMonths - 1);

    return {
      totalMonths,
      lastEmiAmount,
      closed_on: lastEmiDate.toISOString().split('T')[0],
    };
  }

  const handleAdd = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!priestId || !issuedOn) {
      showToast(t("toasts.enterAllRequiredFields"), "error");
      return;
    }

    // Prepare loan data
    const emiSummary = calculateEmiSummary(parseFloat(loanForm.principal), parseFloat(loanForm.emi), issuedOn);
    const loanData: Record<string, any> = {
      priest_id: priestId,
      principal: parseFloat(loanForm.principal) || 0,
      emi: parseFloat(loanForm.emi) || 0,
      issued_on: issuedOn,
      closed_on: emiSummary.closed_on,
      last_emi_amount: emiSummary.lastEmiAmount,
      total_months: emiSummary.totalMonths,
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
      setError(t("toasts.failedToSaveLoan"));
      return;
    }

    if (data) {
      setLoans((prev) =>
        editingId
          ? prev.map((s) => (s.id === editingId ? (data as unknown as LoanRow) : s))
          : [data as unknown as LoanRow, ...prev]
      );
      showToast(editingId ? t("toasts.loanUpdated") : t("toasts.loanAdded"), "success");
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
    setIssuedOn(new Date(loan.issued_on).toISOString().split('T')[0]);
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
    const issuedDate = new Date(loan.issued_on);

    // Calculate first EMI date (issued_on + 1 month)
    const firstEMIDate = new Date(issuedDate);
    firstEMIDate.setMonth(firstEMIDate.getMonth() + 1);

    // Use calculateEmiSummary logic
    const totalMonths = Math.ceil(principalDisbursed / monthlyEMI);
    const lastEmiAmount = principalDisbursed % monthlyEMI === 0 ? monthlyEMI : principalDisbursed % monthlyEMI;
    const lastEMIDate = new Date(firstEMIDate);
    lastEMIDate.setMonth(firstEMIDate.getMonth() + totalMonths - 1);

    // Generate EMI list
    const emiList: Array<{ emiNumber: number; date: Date; amount: number }> = [];
    for (let i = 0; i < totalMonths; i++) {
      const emiDate = new Date(firstEMIDate);
      emiDate.setMonth(firstEMIDate.getMonth() + i);
      const isLastEmi = i === totalMonths - 1;
      emiList.push({
        emiNumber: i + 1,
        date: emiDate,
        amount: isLastEmi ? lastEmiAmount : monthlyEMI,
      });
    }

    // Calculate months passed since first EMI date
    const today = new Date();
    const monthsPassed = Math.max(
      0,
      (today.getFullYear() - firstEMIDate.getFullYear()) * 12 +
      (today.getMonth() - firstEMIDate.getMonth())
    );

    // Calculate principal paid (no interest, so EMI = principal payment)
    let principalPaid = 0;
    for (let i = 0; i < Math.min(monthsPassed, totalMonths); i++) {
      principalPaid += emiList[i].amount;
    }
    principalPaid = Math.min(principalPaid, principalDisbursed);

    // Calculate outstanding balance
    const outstandingBalance = Math.max(0, principalDisbursed - principalPaid);

    return {
      emiList,
      principalPaid,
      outstandingBalance,
      firstEMIDate,
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
      <Loader />
    );
  }

  return (
    <div className="flex-1 space-y-4 bg-gradient-to-b from-[#f3e7e9] to-[#e3eeff] rounded-lg p-4 min-h-[calc(100vh-9.5rem)]">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">
        {t("adminLoans.title")}
      </h1>

      <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex flex-col md:flex-row justify-between md:items-end gap-2">
        <div className="flex flex-col flex-1 md:flex-none">
          <label className="text-xs font-medium text-gray-600">{t("adminLoans.searchLabel")}</label>
          <input
            className="input w-full md:max-w-xs"
            placeholder={t("adminLoans.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge className="text-xs font-medium text-white bg-green-500 w-fit">
          {filteredLoans.length} {t("adminLoans.loansCount")}
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
          <Plus /> {t("adminLoans.addLoan")}
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
              <DialogTitle>{editingId ? t("adminLoans.editLoan") : t("adminLoans.addLoanTitle")}</DialogTitle>
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
                  <label className="text-xs font-medium text-gray-600 mb-1">{t("adminLoans.issuedOn")}</label>
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
                <label className="text-xs font-medium w-full">{t("adminLoans.principalAmount")}</label>
                <input
                  type="number"
                  className="input"
                  onChange={(e) => updateField("principal", e.target.value)}
                  value={loanForm.principal}
                  required
                  step="0.01"
                  placeholder={t("adminLoans.principalAmountPlaceholder")}
                />

                <label className="text-xs font-medium w-full">{t("adminLoans.emiAmount")}</label>
                <input
                  type="number"
                  className="input"
                  onChange={(e) => updateField("emi", e.target.value)}
                  value={loanForm.emi}
                  required
                  step="0.01"
                  placeholder={t("adminLoans.emiAmountPlaceholder")}
                />

                <label className="text-xs font-medium w-full">
                  {t("common.notes")} <span className="font-normal">{t("common.optional")}</span>
                </label>
                <input
                  type="text"
                  className="input"
                  onChange={(e) => updateField("loan_notes", e.target.value)}
                  value={loanForm.loan_notes}
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
                  {editingId ? t("adminLoans.updateLoan") : t("adminLoans.addLoan")}
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
                    <h2 className="text-xl font-semibold text-gray-800">{t("adminLoans.loanDetails")}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t("adminLoans.summaryOfLoan")}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {(() => {
                      const details = calculateLoanDetails(selectedLoan);
                      return (
                        <>
                          <div className="flex gap-2">
                            <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-1  w-full">
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
                            <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-1  w-full">
                              <span className="text-xl">📅</span>
                              <div className="flex flex-col gap-0 text-sm">
                                <span className="text-gray-700">First EMI Date</span>
                                <span className="font-semibold text-gray-800">
                                  {details.firstEMIDate.toLocaleDateString(
                                    undefined, {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-1  w-full">
                              <span className="text-xl">📅</span>
                              <div className="flex flex-col gap-0 text-sm">
                                <span className="text-gray-700">Last EMI Date</span>
                                <span className="font-semibold text-gray-800">
                                  {new Date(selectedLoan.closed_on).toLocaleDateString(
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
                          <div className="flex items-center justify-between border border-gray-200 rounded-lg py-1 px-2 w-full">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">💰</span>
                              <span className="text-gray-700">Principal Disbursed</span>
                            </div>
                            <span className="font-semibold text-gray-800">
                              € {selectedLoan.principal.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border border-gray-200 rounded-lg py-1 px-2 w-full">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">💵</span>
                              <span className="text-gray-700">EMI Paid Monthly</span>
                            </div>
                            <div className="flex flex-col gap-0">
                              <span className="font-semibold text-gray-800">
                                € {selectedLoan.emi}
                              </span>
                              <span className="text-xs">{selectedLoan.total_months ?? 'N/A'} {t("adminLoans.months")}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border border-gray-200 rounded-lg py-1 px-2 w-full">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">💶</span>
                              <span className="text-gray-700">Principal Paid</span>
                            </div>
                            <span className="font-semibold text-gray-800">
                              € {details.principalPaid.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border border-gray-200 rounded-lg py-1 px-2 w-full">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">💷</span>
                              <span className="text-gray-700">Outstanding Balance</span>
                            </div>
                            <span className="font-semibold text-yellow-600">
                              € {details.outstandingBalance.toFixed(2)}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-gray-600 py-2">EMI Schedule</span>
                          <div className="h-40 overflow-y-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left whitespace-nowrap">EMI Number</th>
                                  <th className="px-3 py-2 text-left whitespace-nowrap">Date</th>
                                  <th className="px-3 py-2 text-right whitespace-nowrap">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {details.emiList.map((emi) => (
                                  <tr key={emi.emiNumber} className="border-t border-gray-100">
                                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                      EMI {emi.emiNumber}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-800">
                                      {emi.date.toLocaleDateString(undefined, {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap font-semibold text-gray-800">
                                      € {emi.amount.toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
                    {t("common.cancel")}
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
                <DrawerTitle>{t("adminLoans.loanDetails")}</DrawerTitle>
                <DrawerDescription>{t("adminLoans.summaryOfTheLoan")}</DrawerDescription>
              </DrawerHeader>
              {selectedLoan &&
                <>
                  <div className="flex flex-col gap-4 p-4 ">
                    {(() => {
                      const details = calculateLoanDetails(selectedLoan);
                      return (
                        <>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-1 w-full">
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
                            <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-1 w-full">
                              <span className="text-xl">📅</span>
                              <div className="flex flex-col gap-0 text-sm">
                                <span className="text-gray-700">First EMI Date</span>
                                <span className="font-semibold text-gray-800">
                                  {details.firstEMIDate.toLocaleDateString(
                                    undefined, {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-1 w-full">
                              <span className="text-xl">📅</span>
                              <div className="flex flex-col gap-0 text-sm">
                                <span className="text-gray-700">Last EMI Date</span>
                                <span className="font-semibold text-gray-800">
                                  {new Date(selectedLoan.closed_on).toLocaleDateString(
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
                              € {selectedLoan.principal.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">💵</span>
                              <span className="text-gray-700">EMI Paid Monthly</span>
                            </div>
                            <div className="flex flex-col gap-0">
                              <span className="font-semibold text-gray-800">
                                € {selectedLoan.emi}
                              </span>
                              <span className="text-xs">{selectedLoan.total_months} months</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">💶</span>
                              <span className="text-gray-700">Principal Paid</span>
                            </div>
                            <span className="font-semibold text-gray-800">
                              € {details.principalPaid.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">💷</span>
                              <span className="text-gray-700">Outstanding Balance</span>
                            </div>
                            <span className="font-semibold text-yellow-600">
                              € {details.outstandingBalance.toFixed(2)}
                            </span>
                          </div>

                          <span className="text-xs font-medium text-gray-600 py-2">EMI Schedule</span>
                          <div className="h-40 overflow-y-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left whitespace-nowrap">EMI Number</th>
                                  <th className="px-3 py-2 text-left whitespace-nowrap">Date</th>
                                  <th className="px-3 py-2 text-right whitespace-nowrap">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {details.emiList.map((emi) => (
                                  <tr key={emi.emiNumber} className="border-t border-gray-100">
                                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                      EMI {emi.emiNumber}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-800">
                                      {emi.date.toLocaleDateString(undefined, {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap font-semibold text-gray-800">
                                      € {emi.amount.toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                </>
              }
              <DrawerFooter>
                <Button size="sm" type="button" variant="outline" onClick={() => setOpenView(false)}>
                  {t("common.cancel")}
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        }


        <div className="flex flex-col lg:flex-row gap-2">
          <div className="w-full bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <div className="p-1 rounded-lg bg-white border border-gray-200 overflow-hidden">
              <div className="overflow-auto rounded-lg max-h-[calc(100vh-21rem)] thin-scroll">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminLoans.priestColumn")}</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">{t("adminLoans.principalColumn")}</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">{t("adminLoans.emiColumn")}</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminLoans.issuedOnColumn")}</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminLoans.notesColumn")}</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">{t("common.actions")}</th>
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
                            {t("common.edit")}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={(e) => handleView(loan)}>
                            {t("adminLoans.view")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!filteredLoans.length && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                          {t("adminLoans.noLoanEntries")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

