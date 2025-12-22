import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useUser } from "../../hooks/useUser";
import { supabase } from "../../lib/supabaseClient";

type AnnouncementRow = {
  id: string;
  title_en: string | null;
  title_de: string | null;
  body_en: string | null;
  body_de: string | null;
  created_at: string;
  is_published: boolean;
};

export default function AdminAnnouncements() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [titleEn, setTitleEn] = useState("");
  const [titleDe, setTitleDe] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyDe, setBodyDe] = useState("");
  const [published, setPublished] = useState(true);

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

      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      setItems((data ?? []) as any);
      setLoadingData(false);
    };

    load();
  }, [user, loading, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn && !titleDe) return;

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        title_en: titleEn || null,
        title_de: titleDe || null,
        body_en: bodyEn || null,
        body_de: bodyDe || null,
        is_published: published,
      })
      .select("*")
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setItems((prev) => [data as any, ...prev]);
      setTitleEn("");
      setTitleDe("");
      setBodyEn("");
      setBodyDe("");
      setPublished(true);
    }
  };

  const togglePublish = async (id: string, value: boolean) => {
    const { data, error } = await supabase
      .from("announcements")
      .update({ is_published: value })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setItems((prev) => prev.map((a) => (a.id === id ? (data as any) : a)));
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
        Announcements
      </h1>

      <form
        onSubmit={handleCreate}
        className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
      >
        <h2 className="text-sm font-semibold text-gray-700">
          New announcement
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Title (English)
            </label>
            <input
              className="input"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Title (German)
            </label>
            <input
              className="input"
              value={titleDe}
              onChange={(e) => setTitleDe(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Body (English)
            </label>
            <textarea
              className="input min-h-[80px]"
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Body (German)
            </label>
            <textarea
              className="input min-h-[80px]"
              value={bodyDe}
              onChange={(e) => setBodyDe(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <input
            id="published"
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <label htmlFor="published">Published</label>
        </div>

        <button className="btn" type="submit">
          Create announcement
        </button>
      </form>

      <div className="bg-white border border-gray-200 rounded-lg">
        <ul className="divide-y divide-gray-100">
          {items.map((a) => (
            <li key={a.id} className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800">
                    {a.title_en || "(no English title)"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={a.is_published}
                      onChange={(e) => togglePublish(a.id, e.target.checked)}
                    />
                    <span>Published</span>
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-1 line-clamp-3">
                {a.body_en || "(no English body)"}
              </p>
            </li>
          ))}
          {!items.length && (
            <li className="p-6 text-center text-sm text-gray-500">
              No announcements yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
