import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useUser } from "../../../../hooks/useUser";
import { supabase } from "../../../../lib/supabaseClient";
import { TabsTrigger, TabsList, TabsContent } from "@/components/ui/tabs";
import { Tabs } from "@/components/ui/tabs";
import Loader from "@/components/ui/loader";
import { useTranslation } from "../../../../i18n/languageContext";

type AnnouncementRow = {
  id: string;
  title: string | null;
  body: string | null;
  lang: string; // 'en' or 'de'
  created_at: string;
  validity_days?: number | null;
  visible_until?: string | null;
  priest_id: string;
  profiles?: { full_name: string | null; email: string | null };
};

type PriestOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

// Constants
const INITIAL_FORM_STATE = {
  title: "",
  body: "",
  lang: "en",
  validityDays: "1",
  priestId: "",
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

export default function AnnIndividual() {
  const { t } = useTranslation();
  const { user, loading } = useUser();
  const router = useRouter();
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [priests, setPriests] = useState<PriestOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<Record<string, any>>(INITIAL_FORM_STATE);

  // Update individual field value
  const updateField = (fieldName: string, value: string | boolean) => {
    setAnnouncementForm((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Load announcements data
  const loadAnnouncementData = useCallback(async () => {
    const { data } = await supabase
      .from("announcements_individual")
      .select("*, profiles!announcements_individual_priest_id_fkey(full_name, email)")
      .order("created_at", { ascending: false });

    setItems((data ?? []) as AnnouncementRow[]);
  }, []);

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

      // Load priests list
      const { data: priestRows } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "priest")
        .order("full_name", { ascending: true });
      setPriests((priestRows ?? []) as PriestOption[]);

      setLoadingData(false);
      await loadAnnouncementData();
    };

    load();
  }, [user, loading, router, loadAnnouncementData]);

  const resetForm = () => {
    setAnnouncementForm(INITIAL_FORM_STATE);
    setEditingId(null);
    setError(null);
  };

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!announcementForm.title || announcementForm.title.trim() === "") {
      showToast("Please enter a title", "error");
      return;
    }

    if (!announcementForm.priestId || announcementForm.priestId.trim() === "") {
      showToast("Please select a priest", "error");
      return;
    }

    // Validate validity days if provided
    if (announcementForm.validityDays && announcementForm.validityDays.trim() !== "") {
      const validityDays = Number(announcementForm.validityDays);
      if (isNaN(validityDays) || validityDays < 1) {
        showToast("Validity days must be at least 1", "error");
        return;
      }
    }

    // Calculate visible_until from validity_days if provided
    let visibleUntil: string | null = null;
    if (announcementForm.validityDays && announcementForm.validityDays.trim() !== "" && !isNaN(Number(announcementForm.validityDays)) && Number(announcementForm.validityDays) >= 1) {
      const validityDays = Number(announcementForm.validityDays);
      const now = new Date();
      const untilDate = new Date(now);
      untilDate.setDate(untilDate.getDate() + validityDays);
      visibleUntil = untilDate.toISOString();
    }

    const announcementData: Record<string, any> = {
      title: announcementForm.title || null,
      body: announcementForm.body || null,
      lang: announcementForm.lang || "en",
      visible_until: visibleUntil,
      priest_id: announcementForm.priestId,
    };

    const query = editingId
      ? supabase.from("announcements_individual").update(announcementData).eq("id", editingId)
      : supabase.from("announcements_individual").insert(announcementData);

    const { error, data } = await query.select("*, profiles!announcements_individual_priest_id_fkey(full_name, email)").maybeSingle();

    if (error) {
      console.error(error);
      setError("Failed to save announcement. Please try again.");
      showToast("Failed to save announcement", "error");
      return;
    }

    if (data) {
      setItems((prev) =>
        editingId
          ? prev.map((a) => (a.id === editingId ? (data as AnnouncementRow) : a))
          : [data as AnnouncementRow, ...prev]
      );
      showToast(editingId ? "Announcement updated successfully" : "Announcement created successfully", "success");
      await loadAnnouncementData();
      resetForm();
      setOpen(false);
    }
  };

  const handleEdit = async (announcement: AnnouncementRow) => {
    // Calculate validity_days from visible_until if it exists
    let validityDays = "1"; // Default to 1
    if (announcement.visible_until) {
      const untilDate = new Date(announcement.visible_until);
      const createdDate = new Date(announcement.created_at);
      const diffTime = untilDate.getTime() - createdDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        validityDays = diffDays.toString();
      }
    }

    setAnnouncementForm({
      title: announcement.title || "",
      body: announcement.body || "",
      lang: announcement.lang || "en",
      validityDays: validityDays,
      priestId: announcement.priest_id || "",
    });
    setEditingId(announcement.id);
    setOpen(true);
  };

  // Calculate if announcement is published based on visible_until
  const isPublished = (announcement: AnnouncementRow): boolean => {
    if (!announcement.visible_until) {
      // No expiration date means it's always published
      return true;
    }
    const untilDate = new Date(announcement.visible_until);
    const now = new Date();
    // Published if visible_until is in the future or null
    return untilDate >= now;
  };

  const filteredItems = items.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (a.title ?? "").toLowerCase().includes(q) ||
      (a.body ?? "").toLowerCase().includes(q)
    );
  });

  // Calculate validity days from visible_until for display
  const getValidityDays = (announcement: AnnouncementRow): number | null => {
    if (!announcement.visible_until) return null;
    const untilDate = new Date(announcement.visible_until);
    const createdDate = new Date(announcement.created_at);
    const diffTime = untilDate.getTime() - createdDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  if (loading || loadingData) {
    return (
      <Loader />
    );
  }

  return (
    <div className="flex-1 space-y-4 bg-gradient-to-b from-[#f3e7e9] to-[#e3eeff] rounded-lg min-h-[calc(100vh-17.5rem)]">
      <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex flex-col md:flex-row justify-between md:items-end gap-2">
        <div className="flex flex-col flex-1 md:flex-none gap-1">
          <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.individual.searchLabel")}</label>
          <input
            className="input w-full md:max-w-xs"
            placeholder={t("adminAnnouncements.individual.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge className="text-xs font-medium text-white bg-green-500 w-fit">
          {filteredItems.length} {t("adminAnnouncements.individual.announcementsCount")}
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
          <Plus /> {t("adminAnnouncements.individual.individualAnnouncement")}
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
              <DialogTitle>{editingId ? t("adminAnnouncements.individual.editAnnouncement") : t("adminAnnouncements.individual.createAnnouncement")}</DialogTitle>
            </DialogHeader>
            {error && (
              <div className="bg-red-50 border text-sm border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                {error}
                <button className="text-red-700" onClick={() => setError(null)}> x</button>
              </div>
            )}
            <form onSubmit={handleCreate} className="bg-white flex flex-col gap-3">
              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg p-2">
                <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.individual.priest")}</label>
                <Select
                  value={announcementForm.priestId}
                  onValueChange={(value) => updateField("priestId", value)}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("adminAnnouncements.individual.selectPriest")} />
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

              <Tabs
                value={announcementForm.lang}
                onValueChange={(value) => updateField("lang", value)}
                className="w-full"
              >
                <TabsList>
                  <TabsTrigger value="en">{t("common.language.en")}</TabsTrigger>
                  <TabsTrigger value="de">{t("common.language.de")}</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <div className="flex flex-col border border-gray-200 rounded-lg">
                    <div className="flex flex-col gap-2 rounded-lg p-2">
                      <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.individual.titleEnglish")}</label>
                      <input
                        type="text"
                        className="input"
                        value={announcementForm.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder={t("adminAnnouncements.individual.enterTitle")}
                      />
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg p-2">
                      <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.individual.bodyEnglish")}</label>
                      <textarea
                        className="input min-h-[80px]"
                        value={announcementForm.body}
                        onChange={(e) => updateField("body", e.target.value)}
                        placeholder={t("adminAnnouncements.individual.enterBody")}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="de">
                  <div className="flex flex-col border border-gray-200 rounded-lg">
                    <div className="flex flex-col gap-2 rounded-lg p-2">
                      <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.individual.titleGerman")}</label>
                      <input
                        type="text"
                        className="input"
                        value={announcementForm.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder={t("adminAnnouncements.individual.enterTitle")}
                      />
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg p-2">
                      <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.individual.bodyGerman")}</label>
                      <textarea
                        className="input min-h-[80px]"
                        value={announcementForm.body}
                        onChange={(e) => updateField("body", e.target.value)}
                        placeholder={t("adminAnnouncements.individual.enterBody")}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg p-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.individual.validityDays")}</label>
                  <input
                    type="number"
                    className="input"
                    value={announcementForm.validityDays}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || (Number(value) >= 1)) {
                        updateField("validityDays", value);
                      }
                    }}
                    placeholder={t("adminAnnouncements.individual.validityDaysPlaceholder")}
                    min="1"
                    step="1"
                  />
                  <p className="text-xs text-gray-500">
                    {t("adminAnnouncements.individual.validityDaysDescription")}
                  </p>
                </div>
              </div>
            </form>
            <DialogFooter>
              <div className="flex justify-end gap-2 items-center w-full">
                <Button size="sm" type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button size="sm" type="submit" className="btn" onClick={handleCreate}>
                  {editingId ? t("adminAnnouncements.individual.updateAnnouncement") : t("adminAnnouncements.individual.createAnnouncementButton")}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <div className="overflow-auto rounded-lg max-h-[calc(100vh-21rem)] thin-scroll">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminAnnouncements.individual.titleColumn")}</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminAnnouncements.individual.priestColumn")}</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminAnnouncements.individual.languageColumn")}</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminAnnouncements.individual.createdDateColumn")}</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminAnnouncements.individual.validityDaysColumn")}</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminAnnouncements.individual.publishedColumn")}</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((a) => {
                  const validityDays = getValidityDays(a);
                  return (
                    <tr key={a.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <p className="font-semibold text-gray-800">
                            {a.title || "-"}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                            {a.body || "-"}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {a.profiles?.full_name || a.profiles?.email || "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {a.lang?.toUpperCase() || "EN"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(a.created_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {validityDays ? `${validityDays} ${t("adminAnnouncements.individual.days")}` : "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge
                          variant={isPublished(a) ? "default" : "outline"}
                          className={isPublished(a) ? "bg-green-500 text-white" : ""}
                        >
                          {isPublished(a) ? t("adminAnnouncements.individual.published") : t("adminAnnouncements.individual.unpublished")}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(a)}>
                            {t("common.edit")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredItems.length && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                      {search ? t("adminAnnouncements.individual.noAnnouncementsFound") : t("adminAnnouncements.individual.noAnnouncementsYet")}
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
