import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Landmark, Mail, MapPin, PencilIcon, Phone, ShieldCheck, SquarePenIcon, Wallet, XIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useUser } from "../../hooks/useUser";
import { supabase } from "../../lib/supabaseClient";
import { useUserDetails } from "../../components/PriestLayout";
import { useTranslation } from "../../i18n/languageContext";

export default function PriestDashboard() {
  const { user, loading } = useUser();
  const { userDetails, loading: loadingDetails } = useUserDetails();
  const router = useRouter();
  const { t } = useTranslation();

  const [salary, setSalary] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [priestAnnouncements, setPriestAnnouncements] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showProfileAlert, setShowProfileAlert] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      const [
        { data: salaryRows },
        { data: insuranceRows },
        { data: loanRows },
        { data: announcementRows },
        { data: priestAnnouncements },
        { data: priestData, error: priestError }
      ] = await Promise.all([
        supabase
          .from("salary")
          .select("*")
          .eq("priest_id", user.id)
          .eq("month", new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-01')
          .order("month", { ascending: false }),
        supabase.from("insurance").select("*").eq("priest_id", user.id),
        supabase.from("loans").select("*").eq("priest_id", user.id),
        supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("announcements_individual")
          .select("*")
          .eq("priest_id", user.id)
          .gt("visible_until", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("priests")
          .select("id")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      setSalary(salaryRows ?? []);
      setInsurance(insuranceRows ?? []);
      setLoans(loanRows ?? []);
      setAnnouncements(
        (announcementRows ?? []).map((a: any) => ({
          id: a.id,
          title: a.title ?? "",
          body: a.body ?? "",
          lang: a.lang ?? "",
          created_at: a.created_at,
          isRead: false,
        }))
      );
      setPriestAnnouncements(priestAnnouncements ?? []);

      // Check if priest has data in priests table
      // If no data exists (no record found and no error), show alert
      if (!priestData && !priestError) {
        setShowProfileAlert(true);
      }

      setDataLoading(false);
    };

    load();
  }, [user, loading]);

  if (loading || loadingDetails || !user || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        {t("common.loading")}
      </div>
    );
  }

  function SummaryCard({
    title,
    value,
    subtitle,
    icon,
  }: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
  }) {
    return (
      <Card>
        <CardContent className="px-6 py-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-muted">
              {icon}
            </div>
            <div className="flex flex-col items-start gap-2">
              <h3 className="font-medium">{title}</h3>
              <div className="text-2xl font-medium">{value}</div>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function AnnouncementItem({
    date,
    title,
    description,
  }: {
    date: string;
    title: string;
    description: string;
  }) {
    return (
      <div>
        <p className="text-xs text-muted-foreground">{new Date(date).toDateString()}</p>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    );
  }


  function handleRead(id: string) {
    setPriestAnnouncements((prev: any) => prev.map((a: any) => a.id === id ? { ...a, isRead: true } : a));
  }

  return (
    <div className="space-y-6 transition-all duration-300 ease-in">
      {/* 🔔 Announcement Banner */}
      {priestAnnouncements?.map((a: any) => (
        !a.isRead && (
          <Alert key={a.id} className="flex items-center w-full bg-blue-50 border-blue-200 transition-all duration-300">
            <div className="flex gap-4 w-[97%]">
              <Image src="/announcement.png" alt="Announcement" width={48} height={48} className="object-contain" />
              <div className="flex w-full flex-1 justify-between items-center">
                <div className="flex flex-col">
                  <AlertTitle className="text-blue-900">
                    {a.title}
                  </AlertTitle>
                  <AlertDescription className="text-blue-800">
                    {a.body}
                  </AlertDescription>
                </div>
              </div>
            </div>
            <div className="w-[3%]">
              <XIcon onClick={() => handleRead(a.id)} className="h-5 w-5 text-blue-600 cursor-pointer" />
            </div>
          </Alert>
        )
      ))}

      <div className="flex flex-col-reverse md:flex-row gap-3">

        {/* 💳 Summary Cards */}
        <div className="w-full md:w-1/4 flex flex-col gap-3">
          <SummaryCard
            title={t("priestDashboard.monthlySalary")}
            value="€ 25,000"
            subtitle="December 2025"
            icon={<Wallet className="text-indigo-600" />}
          />

          <SummaryCard
            title={t("priestDashboard.insuranceDetails")}
            value="€ 1,500"
            subtitle="December 2025"
            icon={<ShieldCheck className="text-green-600" />}
          />

          <SummaryCard
            title={t("priestDashboard.loanSummary")}
            value="€ 4,000 EMI"
            subtitle="₹50,000 Outstanding Balance"
            icon={<Landmark className="text-yellow-600" />}
          />
        </div>

        {/* 📢 Announcements List */}
        <div className="w-full md:w-2/4">
          <Card >
            <CardHeader>
              <CardTitle>{t("priestDashboard.announcements")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {announcements.map((a) => (
                <AnnouncementItem
                  key={a.id}
                  date={a.created_at}
                  title={a.title}
                  description={a.body}
                />
              ))}


            </CardContent>
          </Card>
        </div>

        <div className="w-full md:w-1/4">
          {/* 👤 Personal Profile */}
          <Card>
            <CardContent className="flex flex-col md:flex-row gap-6 relative">
              <ArrowRight className="text-indigo-600 absolute top-3 right-3 h-5 w-5 cursor-pointer" onClick={() => router.push("/priest/profile")} />
              <div className="flex flex-col items-start gap-2 w-full ">
                <div className="flex justify-center w-full pt-4 pb-2 ">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={userDetails?.photo ?? "/priest.svg"} />
                    {/* <AvatarFallback className="text-2xl">EM</AvatarFallback> */}
                  </Avatar>
                </div>

                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{userDetails?.full_name ?? user.full_name}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm w-[80%]"> {userDetails?.email ?? user.email}</span>
                </div>

                {userDetails?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm  w-[80%]"> {userDetails.phone}</span>
                  </div>
                )}

                {userDetails?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <span className="text-sm text-muted-foreground w-[80%]"> {userDetails.address}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Profile Data Alert Dialog */}
      <Dialog
        open={showProfileAlert}
        onOpenChange={(open) => {
          // Prevent closing by clicking outside or pressing escape
          // Only allow closing via OK or Cancel buttons
          if (!open) {
            // If user tries to close, just close the dialog
            setShowProfileAlert(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("priestDashboard.profileInformationRequired")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              {t("priestDashboard.profileIncompleteMessage")}
            </p>
          </div>
          <DialogFooter>
            <div className="flex justify-end gap-2 items-center w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowProfileAlert(false);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  setShowProfileAlert(false);
                  router.push("/priest/profile");
                }}
              >
                {t("common.ok")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
