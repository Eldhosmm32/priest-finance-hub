import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
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
};

// Constants
const INITIAL_FORM_STATE = {
  title: "",
  body: "",
  lang: "en",
  validityDays: "1",
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

export default function AnnCommon() {
  const { t } = useTranslation();
  const { user, loading } = useUser();
  const router = useRouter();
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<Record<string, any>>(INITIAL_FORM_STATE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Update individual field value
  const updateField = (fieldName: string, value: string | boolean) => {
    setAnnouncementForm((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Load announcements data
  const loadAnnouncementData = useCallback(async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
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
    };

    const query = editingId
      ? supabase.from("announcements").update(announcementData).eq("id", editingId)
      : supabase.from("announcements").insert(announcementData);

    const { error, data } = await query.select("*").maybeSingle();

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
    });
    setEditingId(announcement.id);
    setOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", deletingId);

      if (error) {
        console.error(error);
        showToast(t("adminAnnouncements.common.failedToDeleteAnnouncement") || "Failed to delete announcement", "error");
        setDeleting(false);
        return;
      }

      setItems((prev) => prev.filter((a) => a.id !== deletingId));
      showToast(t("adminAnnouncements.common.announcementDeleted") || "Announcement deleted successfully", "success");
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (err) {
      console.error(err);
      showToast(t("adminAnnouncements.common.failedToDeleteAnnouncement") || "Failed to delete announcement", "error");
    } finally {
      setDeleting(false);
    }
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
      <div className="flex justify-center items-center h-[calc(100vh-17.5rem)] overflow-hidden">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 bg-gradient-to-b from-[#f3e7e9] to-[#e3eeff] rounded-lg min-h-[calc(100vh-17.5rem)]">
      <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex flex-col md:flex-row justify-between md:items-end gap-2">
        <div className="flex flex-col flex-1 md:flex-none gap-1">
          <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.common.searchLabel")}</label>
          <input
            className="input w-full md:max-w-xs"
            placeholder={t("adminAnnouncements.common.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge className="text-xs font-medium text-white bg-green-500 w-fit">
          {filteredItems.length} {t("adminAnnouncements.common.announcementsCount")}
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
          <Plus /> {t("adminAnnouncements.common.commonAnnouncement")}
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
              <DialogTitle>{editingId ? t("adminAnnouncements.common.editAnnouncement") : t("adminAnnouncements.common.createAnnouncement")}</DialogTitle>
            </DialogHeader>
            {error && (
              <div className="bg-red-50 border text-sm border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                {error}
                <button className="text-red-700" onClick={() => setError(null)}> x</button>
              </div>
            )}
            <form onSubmit={handleCreate} className="bg-white flex flex-col gap-3">
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
                      <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.common.titleEnglish")}</label>
                      <input
                        type="text"
                        className="input"
                        value={announcementForm.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder={t("adminAnnouncements.common.enterTitle")}
                      />
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg p-2">
                      <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.common.bodyEnglish")}</label>
                      <textarea
                        className="input min-h-[80px]"
                        value={announcementForm.body}
                        onChange={(e) => updateField("body", e.target.value)}
                        placeholder={t("adminAnnouncements.common.enterBody")}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="de">
                  <div className="flex flex-col border border-gray-200 rounded-lg">
                    <div className="flex flex-col gap-2 rounded-lg p-2">
                      <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.common.titleGerman")}</label>
                      <input
                        type="text"
                        className="input"
                        value={announcementForm.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder={t("adminAnnouncements.common.enterTitle")}
                      />
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg p-2">
                      <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.common.bodyGerman")}</label>
                      <textarea
                        className="input min-h-[80px]"
                        value={announcementForm.body}
                        onChange={(e) => updateField("body", e.target.value)}
                        placeholder="Enter body"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg p-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-gray-600">{t("adminAnnouncements.common.validityDays")}</label>
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
                    placeholder={t("adminAnnouncements.common.validityDaysPlaceholder")}
                    min="1"
                    step="1"
                  />
                  <p className="text-xs text-gray-500">
                    {t("adminAnnouncements.common.validityDaysDescription")}
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
                  {editingId ? t("adminAnnouncements.common.updateAnnouncement") : t("adminAnnouncements.common.createAnnouncementButton")}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="p-1 rounded-lg bg-white border border-gray-200 overflow-hidden">
          <div className="overflow-auto rounded-lg max-h-[calc(100vh-21rem)] thin-scroll">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminAnnouncements.common.titleColumn")}</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminAnnouncements.common.languageColumn")}</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminAnnouncements.common.createdDateColumn")}</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminAnnouncements.common.validityDaysColumn")}</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminAnnouncements.common.publishedColumn")}</th>
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
                        {validityDays ? `${validityDays} ${t("adminAnnouncements.common.days")}` : "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge
                          variant={isPublished(a) ? "default" : "outline"}
                          className={isPublished(a) ? "bg-green-500 text-white" : ""}
                        >
                          {isPublished(a) ? t("adminAnnouncements.common.published") : t("adminAnnouncements.common.unpublished")}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(a)}>
                            {t("common.edit")}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(a.id)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredItems.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                      {search ? t("adminAnnouncements.common.noAnnouncementsFound") : t("adminAnnouncements.common.noAnnouncementsYet")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminAnnouncements.common.deleteAnnouncement") || "Delete Announcement"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {t("adminAnnouncements.common.deleteConfirmation") || "Are you sure you want to delete this announcement? This action cannot be undone."}
          </p>
          <DialogFooter>
            <div className="flex justify-end gap-2 items-center w-full">
              <Button size="sm" type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" type="button" className="bg-red-600 hover:bg-red-700" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? t("common.deleting") || "Deleting..." : t("common.delete") || "Delete"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
