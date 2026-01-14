import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, XIcon } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useUser } from "../../../hooks/useUser";
import { supabase } from "../../../lib/supabaseClient";

type FundTransferRow = {
  id: string;
  province_id: string;
  transfer_date: string;
  transferred_account: string;
  amount: number;
  notes: string | null;
  provinces?: { province_name: string | null };
};

type ProvinceOption = {
  id: string;
  province_name: string;
};

type FundTransferSummary = {
  total_amount: number;
  transfer_count: number;
};

// Constants
const FUND_TRANSFER_QUERY = "id, province_id, transfer_date, transferred_account, amount, notes, provinces!fund_transfer_province_id_fkey(province_name)";
const INITIAL_FORM_STATE = {
  transferred_account: "",
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

export default function AdminFundTransfer() {
  const { user, loading } = useUser();
  const router = useRouter();
  const currentDate = new Date().toISOString().split('T')[0];
  const [fundTransfers, setFundTransfers] = useState<FundTransferRow[]>([]);
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [provinceId, setProvinceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fundTransferSummary, setFundTransferSummary] = useState<FundTransferSummary>({
    total_amount: 0,
    transfer_count: 0,
  });
  const [fundTransferForm, setFundTransferForm] = useState<Record<string, string>>(INITIAL_FORM_STATE);

  // Update individual field value
  const updateField = (fieldName: string, value: string) => {
    setFundTransferForm((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Load Fund Transfer and summary data
  const loadFundTransferData = useCallback(async () => {
    let query = supabase
      .from("fund_transfer")
      .select(FUND_TRANSFER_QUERY)
      .order("transfer_date", { ascending: false })
      .limit(100);

    if (startDate) {
      query = query.gte("transfer_date", startDate);
    }
    if (endDate) {
      query = query.lte("transfer_date", endDate);
    }

    const { data: fundTransferResult } = await query;

    const transfers = (fundTransferResult ?? []) as unknown as FundTransferRow[];
    setFundTransfers(transfers);

    // Calculate summary
    const summary = transfers.reduce(
      (acc, curr) => ({
        total_amount: acc.total_amount + (curr.amount || 0),
        transfer_count: acc.transfer_count + 1,
      }),
      { total_amount: 0, transfer_count: 0 }
    );

    setFundTransferSummary(summary);
  }, [startDate, endDate]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const loadProvinces = async () => {
      const { data: provinceRows } = await supabase
        .from("provinces")
        .select("id, province_name")
        .order("province_name", { ascending: true });
      setProvinces((provinceRows ?? []) as ProvinceOption[]);
      setLoadingData(false);
    };

    loadProvinces();
    loadFundTransferData();
  }, [user, loading, router, loadFundTransferData]);

  // Reload data when date range changes
  useEffect(() => {
    if (!user || loading) return;
    loadFundTransferData();
  }, [startDate, endDate, loadFundTransferData, user, loading]);

  const resetForm = () => {
    setProvinceId("");
    setTransferDate(currentDate);
    setFundTransferForm(INITIAL_FORM_STATE);
    setEditingId(null);
    setError(null);
  };

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!provinceId || !transferDate || !fundTransferForm.transferred_account || !fundTransferForm.amount) {
      showToast("Please enter all required fields", "error");
      return;
    }

    // Prepare fund transfer data
    const fundTransferData: Record<string, any> = {
      province_id: provinceId,
      transfer_date: transferDate,
      transferred_account: fundTransferForm.transferred_account,
      amount: parseFloat(fundTransferForm.amount) || 0,
      notes: fundTransferForm.notes || null,
    };

    const query = editingId
      ? supabase.from("fund_transfer").update(fundTransferData).eq("id", editingId)
      : supabase.from("fund_transfer").insert(fundTransferData);

    const { error, data } = await query.select(FUND_TRANSFER_QUERY).maybeSingle();

    if (error) {
      console.error(error);
      setError("Failed to save fund transfer entry. Please try again.");
      return;
    }

    if (data) {
      setFundTransfers((prev) =>
        editingId
          ? prev.map((s) => (s.id === editingId ? (data as unknown as FundTransferRow) : s))
          : [data as unknown as FundTransferRow, ...prev]
      );
      showToast(editingId ? "Fund transfer updated successfully" : "Fund transfer added successfully", "success");
      await loadFundTransferData();
      resetForm();
      setOpen(false);
    }
  };

  const handleEdit = async (id: string) => {
    const { data: currentTransfer } = await supabase.from("fund_transfer").select("*").eq("id", id).maybeSingle();
    if (currentTransfer) {
      const formData: Record<string, string> = {
        transferred_account: currentTransfer.transferred_account || "",
        amount: currentTransfer.amount != null ? String(currentTransfer.amount) : "",
        notes: currentTransfer.notes || "",
      };
      setFundTransferForm(formData);
      setProvinceId(currentTransfer.province_id || "");
      setTransferDate(currentTransfer.transfer_date || "");
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
    <div className="flex-1 space-y-4 bg-gradient-to-b from-[#f3e7e9] to-[#e3eeff] rounded-lg p-4 min-h-[calc(100vh-9.5rem)]">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">
        Fund Transfer Management
      </h1>

      <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex flex-col md:flex-row justify-between md:items-end gap-2">
        <div className="flex w-full gap-2">
          <div className="flex flex-col flex-1 md:flex-none">
            <label className="text-xs font-medium text-gray-600">Start Date</label>
            <input
              type="date"
              className="input"
              onChange={(e) => setStartDate(e.target.value)}
              value={startDate}
            />
          </div>
          <div className="flex flex-col flex-1 md:flex-none">
            <label className="text-xs font-medium text-gray-600">End Date</label>
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
                loadFundTransferData();
              }}
              className="w-full md:w-auto"
            >
              Clear
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
          <Plus /> Add fund transfer
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
              <DialogTitle>{editingId ? "Edit Fund Transfer" : "Add Fund Transfer"}</DialogTitle>
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
                  <label className="text-xs font-medium text-gray-600 mb-1">Province</label>
                  <Select value={provinceId} onValueChange={setProvinceId} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.province_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    className="input"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg w-full max-h-[400px] p-2">
                <label className="text-xs font-medium w-full">Account Details</label>
                <input
                  type="text"
                  className="input"
                  onChange={(e) => updateField("transferred_account", e.target.value)}
                  value={fundTransferForm.transferred_account}
                  required
                  placeholder="Enter account details"
                />

                <label className="text-xs font-medium w-full">Amount</label>
                <input
                  type="number"
                  className="input"
                  onChange={(e) => updateField("amount", e.target.value)}
                  value={fundTransferForm.amount}
                  required
                  step="0.01"
                  placeholder="Enter amount"
                />

                <label className="text-xs font-medium w-full">
                  Notes <span className="font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  className="input"
                  onChange={(e) => updateField("notes", e.target.value)}
                  value={fundTransferForm.notes}
                  placeholder="Enter notes"
                />
              </div>
            </form>
            <DialogFooter>
              <div className="flex justify-end gap-2 items-center w-full">
                <Button size="sm" type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="btn" onClick={handleAdd}>
                  {editingId ? "Update fund transfer" : "Add fund transfer"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex flex-col lg:flex-row gap-2">
          <div className="block md:hidden w-full h-fit bg-white border border-gray-200 rounded-lg">
            <div className="py-2 px-3 border rounded-lg border-indigo-100 bg-indigo-100 text-indigo-600 flex justify-between items-center">
              <h2 className="font-normal ">Fund Transfer Summary </h2>
              <span className="font-semibold">€ {fundTransferSummary?.total_amount ?? "N/A"}</span>
            </div>
          </div>
          <div className="w-full lg:w-2/3 bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Province Name</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Date</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Account Details</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Amount</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fundTransfers.map((transfer) => (
                  <tr key={transfer.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {transfer.provinces?.province_name || transfer.province_id}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(transfer.transfer_date).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {transfer.transferred_account}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">€ {transfer.amount}</td>
                    <td className="px-3 py-2 flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(transfer.id)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
                {!fundTransfers.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                      No fund transfer entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="hidden md:block w-1/3 h-fit bg-white border border-gray-200 rounded-lg">
            <div className="p-2 border-b border-gray-200">
              <h2 className="font-semibold">Fund Transfer Summary</h2>
            </div>
            <div className="flex flex-col gap-2 p-2">
              <p className="text-sm text-gray-500">
                {startDate && endDate
                  ? `From ${new Date(startDate).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })} - ${new Date(endDate).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}`
                  : startDate
                    ? `From ${new Date(startDate).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`
                    : endDate
                      ? `Until ${new Date(endDate).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`
                      : "All time"}
              </p>
              <h1 className="font-bold text-2xl">€ {fundTransferSummary?.total_amount ?? "N/A"}</h1>
              <p className="text-sm text-gray-500">{fundTransferSummary?.transfer_count ?? 0} transfers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
