import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useUser } from "../../../hooks/useUser";
import { supabase } from "../../../lib/supabaseClient";
import Loader from "@/components/ui/loader";
import { useTranslation } from "../../../i18n/languageContext";

type DonationRow = {
  id: string;
  sender: string;
  amount: number;
  credited_date: string;
  notes: string | null;
};

type DonationSummary = {
  total_amount: number;
  donation_count: number;
};

// Constants
const DONATION_QUERY = "id, sender, amount, credited_date, notes";
const INITIAL_FORM_STATE = {
  sender: "",
  amount: "",
  notes: "",
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

export default function AdminDonation() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const currentDate = new Date().toISOString().split('T')[0];
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creditedDate, setCreditedDate] = useState(currentDate);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [donationSummary, setDonationSummary] = useState<DonationSummary>({
    total_amount: 0,
    donation_count: 0,
  });
  const [donationForm, setDonationForm] = useState<Record<string, string>>(INITIAL_FORM_STATE);

  // Update individual field value
  const updateField = (fieldName: string, value: string) => {
    setDonationForm((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Load Donations and summary data
  const loadDonationData = useCallback(async () => {
    let query = supabase
      .from("donations")
      .select(DONATION_QUERY)
      .order("credited_date", { ascending: false })
      .limit(100);

    if (startDate) {
      query = query.gte("credited_date", startDate);
    }
    if (endDate) {
      query = query.lte("credited_date", endDate);
    }

    const { data: donationResult } = await query;

    const donationList = (donationResult ?? []) as unknown as DonationRow[];
    setDonations(donationList);

    // Calculate summary
    const summary = donationList.reduce(
      (acc, curr) => ({
        total_amount: acc.total_amount + (curr.amount || 0),
        donation_count: acc.donation_count + 1,
      }),
      { total_amount: 0, donation_count: 0 }
    );

    setDonationSummary(summary);
  }, [startDate, endDate]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    setLoadingData(false);
    loadDonationData();
  }, [user, loading, router, loadDonationData]);

  // Reload data when date range changes
  useEffect(() => {
    if (!user || loading) return;
    loadDonationData();
  }, [startDate, endDate, loadDonationData, user, loading]);

  const resetForm = () => {
    setCreditedDate(currentDate);
    setDonationForm(INITIAL_FORM_STATE);
    setEditingId(null);
    setError(null);
  };

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!creditedDate || !donationForm.sender || !donationForm.amount) {
      showToast(t("toasts.enterAllRequiredFields"), "error");
      return;
    }

    // Prepare donation data
    const donationData: Record<string, any> = {
      sender: donationForm.sender,
      amount: parseFloat(donationForm.amount) || 0,
      credited_date: creditedDate,
      notes: donationForm.notes || null,
    };

    const query = editingId
      ? supabase.from("donations").update(donationData).eq("id", editingId)
      : supabase.from("donations").insert(donationData);

    const { error, data } = await query.select(DONATION_QUERY).maybeSingle();

    if (error) {
      console.error(error);
      setError(t("toasts.failedToSaveDonation"));
      return;
    }

    if (data) {
      setDonations((prev) =>
        editingId
          ? prev.map((s) => (s.id === editingId ? (data as unknown as DonationRow) : s))
          : [data as unknown as DonationRow, ...prev]
      );
      showToast(editingId ? t("toasts.donationUpdated") : t("toasts.donationAdded"), "success");
      await loadDonationData();
      resetForm();
      setOpen(false);
    }
  };

  const handleEdit = async (id: string) => {
    const { data: currentDonation } = await supabase.from("donations").select("*").eq("id", id).maybeSingle();
    if (currentDonation) {
      const formData: Record<string, string> = {
        sender: currentDonation.sender || "",
        amount: currentDonation.amount != null ? String(currentDonation.amount) : "",
        notes: currentDonation.notes || "",
      };
      setDonationForm(formData);
      setCreditedDate(currentDonation.credited_date || currentDate);
      setEditingId(id);
      setOpen(true);
    }
  };

  if (loading || loadingData) {
    return (
      <Loader />
    );
  }

  return (
    <div className="flex-1 space-y-4 bg-gradient-to-b from-[#f3e7e9] to-[#e3eeff] rounded-lg p-2 md:p-4 min-h-[calc(100vh-9.5rem)]">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">
        {t("adminDonation.title")}
      </h1>

      <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex flex-col md:flex-row justify-between md:items-end gap-2">
        <div className="flex w-full gap-2">
          <div className="flex flex-col flex-1 md:flex-none gap-1">
            <label className="text-xs font-medium text-gray-600">{t("common.startDate")}</label>
            <input
              type="date"
              className="input"
              onChange={(e) => setStartDate(e.target.value)}
              value={startDate}
            />
          </div>
          <div className="flex flex-col flex-1 md:flex-none gap-1">
            <label className="text-xs font-medium text-gray-600">{t("common.endDate")}</label>
            <input
              type="date"
              className="input"
              onChange={(e) => setEndDate(e.target.value)}
              value={endDate}
            />
          </div>
          {(startDate || endDate) && <div className="flex flex-col justify-end flex-1 md:flex-none">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                loadDonationData();
              }}
              className="w-full md:w-auto"
            >
              {t("common.clear")}
            </Button>
          </div>
          }
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
          <Plus /> {t("adminDonation.addDonation")}
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
              <DialogTitle>{editingId ? t("adminDonation.editDonation") : t("adminDonation.addDonationTitle")}</DialogTitle>
            </DialogHeader>
            {error && (
              <div className="bg-red-50 border text-sm border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center " >
                {error}
                <button className="text-red-700" onClick={() => setError(null)}> x</button>
              </div>
            )}
            <form onSubmit={handleAdd} className="bg-white flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg px-2 py-3 w-full">
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-600 mb-1">{t("adminDonation.dateCredited")}</label>
                  <input
                    type="date"
                    className="input"
                    value={creditedDate}
                    onChange={(e) => setCreditedDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg w-full max-h-[400px] p-2">
                <label className="text-xs font-medium w-full">{t("adminDonation.donationReceivedFrom")}</label>
                <input
                  type="text"
                  className="input"
                  onChange={(e) => updateField("sender", e.target.value)}
                  value={donationForm.sender}
                  required
                  placeholder={t("adminDonation.senderNamePlaceholder")}
                />

                <label className="text-xs font-medium w-full">{t("adminDonation.amountReceived")}</label>
                <input
                  type="number"
                  className="input"
                  onChange={(e) => updateField("amount", e.target.value)}
                  value={donationForm.amount}
                  required
                  step="0.01"
                  placeholder={t("adminDonation.amountPlaceholder")}
                />

                <label className="text-xs font-medium w-full">
                  {t("common.notes")} <span className="font-normal">{t("common.optional")}</span>
                </label>
                <input
                  type="text"
                  className="input"
                  onChange={(e) => updateField("notes", e.target.value)}
                  value={donationForm.notes}
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
                  {editingId ? t("adminDonation.updateDonation") : t("adminDonation.addDonation")}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex flex-col lg:flex-row gap-2">
          <div className="block md:hidden w-full h-fit bg-white border border-gray-200 rounded-lg">
            <div className="py-2 px-3 border rounded-lg border-indigo-100 bg-indigo-100 text-indigo-600 flex justify-between items-center">
              <h2 className="font-normal ">{t("adminDonation.donationSummary")} </h2>
              <span className="font-semibold">€ {donationSummary?.total_amount ?? "N/A"}</span>
            </div>
          </div>
          <div className="w-full lg:w-2/3 bg-white border border-gray-200 rounded-lg overflow-x-auto p-1">
            <div className="overflow-auto rounded-lg max-h-[calc(100vh-21rem)] thin-scroll">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminDonation.senderColumn")}</th>
                    <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminDonation.dateCreditedColumn")}</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">{t("common.amount")}</th>
                    <th className="px-3 py-2 text-left whitespace-nowrap">{t("common.notes")}</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((donation) => (
                    <tr key={donation.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {donation.sender}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(donation.credited_date).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">€ {donation.amount}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {donation.notes || "N/A"}
                      </td>
                      <td className="px-3 py-2 flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(donation.id)}>
                          {t("common.edit")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!donations.length && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                        {t("adminDonation.noDonationEntries")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="hidden md:block w-1/3 h-fit bg-white border border-gray-200 rounded-lg">
            <div className="p-2 border-b border-gray-200">
              <h2 className="font-semibold">{t("adminDonation.donationSummary")}</h2>
            </div>
            <div className="flex flex-col gap-2 p-2">
              <p className="text-sm text-gray-500">
                {startDate && endDate
                  ? `${t("common.from")} ${new Date(startDate).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })} - ${new Date(endDate).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}`
                  : startDate
                    ? `${t("common.from")} ${new Date(startDate).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`
                    : endDate
                      ? `${t("common.until")} ${new Date(endDate).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`
                      : t("common.allTime")}
              </p>
              <h1 className="font-bold text-2xl">€ {donationSummary?.total_amount ?? "N/A"}</h1>
              <p className="text-sm text-gray-500">{donationSummary?.donation_count ?? 0} donations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
