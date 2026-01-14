import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useUser } from "../../../../hooks/useUser";
import { supabase } from "../../../../lib/supabaseClient";
import { TabsTrigger, TabsList, TabsContent } from "@/components/ui/tabs";
import { Tabs } from "@/components/ui/tabs";

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

  const { user, loading } = useUser();
  const router = useRouter();
  const [items, setItems] = useState<AnnouncementRow[]>([]);
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
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 bg-gradient-to-b from-[#f3e7e9] to-[#e3eeff] rounded-lg p-4 min-h-[calc(100vh-9.5rem)]">
      <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex flex-col md:flex-row justify-between md:items-end gap-2">
        <div className="flex flex-col flex-1 md:flex-none">
          <label className="text-xs font-medium text-gray-600">Search by title or body</label>
          <input
            className="input w-full md:max-w-xs"
            placeholder="Search by title or body"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge className="text-xs font-medium text-white bg-green-500 w-fit">
          {filteredItems.length} announcements
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
          <Plus /> Common Announcement
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
              <DialogTitle>{editingId ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
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
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="de">German</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <div className="flex flex-col border border-gray-200 rounded-lg">
                    <div className="flex flex-col gap-2 rounded-lg p-2">
                      <label className="text-xs font-medium text-gray-600">Title (English)</label>
                      <input
                        type="text"
                        className="input"
                        value={announcementForm.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="Enter title"
                      />
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg p-2">
                      <label className="text-xs font-medium text-gray-600">Body (English)</label>
                      <textarea
                        className="input min-h-[80px]"
                        value={announcementForm.body}
                        onChange={(e) => updateField("body", e.target.value)}
                        placeholder="Enter body"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="de">
                  <div className="flex flex-col border border-gray-200 rounded-lg">
                    <div className="flex flex-col gap-2 rounded-lg p-2">
                      <label className="text-xs font-medium text-gray-600">Title (German)</label>
                      <input
                        type="text"
                        className="input"
                        value={announcementForm.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="Enter title"
                      />
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg p-2">
                      <label className="text-xs font-medium text-gray-600">Body (German)</label>
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
                  <label className="text-xs font-medium text-gray-600">Validity Days</label>
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
                    placeholder="Enter number of days (optional)"
                    min="1"
                    step="1"
                  />
                  <p className="text-xs text-gray-500">
                    Number of days the announcement will be visible (minimum 1 day). Leave empty for no expiration.
                  </p>
                </div>
              </div>
            </form>
            <DialogFooter>
              <div className="flex justify-end gap-2 items-center w-full">
                <Button size="sm" type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="btn" onClick={handleCreate}>
                  {editingId ? "Update announcement" : "Create announcement"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left whitespace-nowrap">Title</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Language</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Created Date</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Validity Days</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Published</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Actions</th>
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
                      {validityDays ? `${validityDays} days` : "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Badge
                        variant={isPublished(a) ? "default" : "outline"}
                        className={isPublished(a) ? "bg-green-500 text-white" : ""}
                      >
                        {isPublished(a) ? "Published" : "Unpublished"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(a)}>
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredItems.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    {search ? "No announcements found matching your search." : "No announcements yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
