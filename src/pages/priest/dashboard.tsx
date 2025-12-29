import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, Mail, MapPin, Phone, ShieldCheck, Wallet, XIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useUser } from "../../hooks/useUser";
import { supabase } from "../../lib/supabaseClient";
import { useUserDetails } from "../../components/PriestLayout";

export default function PriestDashboard() {
  const { user, loading } = useUser();
  const { userDetails, loading: loadingDetails } = useUserDetails();
  const router = useRouter();

  const [salary, setSalary] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

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
        { data: announcementRows }
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
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setSalary(salaryRows ?? []);
      setInsurance(insuranceRows ?? []);
      setLoans(loanRows ?? []);
      setAnnouncements(
        (announcementRows ?? []).map((a: any) => ({
          id: a.id,
          title: a.title_en ?? "",
          body: a.body_en ?? "",
          created_at: a.created_at,
        }))
      );
      setDataLoading(false);
    };

    load();
  }, [user, loading]);

  if (loading || loadingDetails || !user || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
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
        <p className="text-xs text-muted-foreground">{date}</p>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* 🔔 Announcement Banner */}
      <Alert className="flex  gap-4 bg-blue-50 border-blue-200">
        <Image src="/announcement.png" alt="Announcement" width={48} height={48} className="object-contain" />
        <div className="flex w-full flex-1 justify-between items-center">
          <div className="flex flex-col">
            <AlertTitle className="text-blue-900">
              Upcoming Annual Meeting
            </AlertTitle>
            <AlertDescription className="text-blue-800">
              The annual meeting will be held on December 10th, 2025 in the church
              hall. Please arrive by 9:00 AM.
            </AlertDescription>
          </div>
          <XIcon className="h-12 w-12 md:h-5 md:w-5 text-blue-600" />
        </div>
      </Alert>

      <div className="flex flex-col-reverse md:flex-row gap-3">

        {/* 💳 Summary Cards */}
        <div className="w-full md:w-1/4 flex flex-col gap-3">
          <SummaryCard
            title="Monthly Salary"
            value="€ 25,000"
            subtitle="December 2025"
            icon={<Wallet className="text-indigo-600" />}
          />

          <SummaryCard
            title="Insurance Details"
            value="€ 1,500"
            subtitle="December 2025"
            icon={<ShieldCheck className="text-green-600" />}
          />

          <SummaryCard
            title="Loan Summary"
            value="€ 4,000 EMI"
            subtitle="₹50,000 Outstanding Balance"
            icon={<Landmark className="text-yellow-600" />}
          />
        </div>

        {/* 📢 Announcements List */}
        <div className="w-full md:w-2/4">
          <Card >
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnnouncementItem
                date="April 25, 2024"
                title="Volunteer Event This Sunday"
                description="We are organizing a volunteer event this Sunday after the morning service."
              />

              <AnnouncementItem
                date="April 18, 2024"
                title="Bible Study Meeting"
                description="Weekly Bible study scheduled for Friday at 6:00 PM in the church hall."
              />
            </CardContent>
          </Card>
        </div>

        <div className="w-full md:w-1/4">
          {/* 👤 Personal Profile */}
          <Card>
            <CardContent className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-start gap-2 w-full">
                <div className="flex justify-center w-full pt-4 pb-2 relative">
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

      <div>
        {/* <Dialog
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
              <DialogTitle>Profile</DialogTitle>
            </DialogHeader>
          
            
            <DialogFooter>
              <div className="flex justify-end gap-2 items-center w-full">
                <Button size="sm" type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="btn" onClick={handleAdd}>
                  {editingId ? "Update salary" : "Add salary"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog> */}
      </div>




    </div>
  );
}
