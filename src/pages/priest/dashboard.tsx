import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Landmark, Mail, MapPin, Phone, Wallet, XIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useUserDetails } from "../../components/PriestLayout";
import { useUser } from "../../hooks/useUser";
import { useTranslation } from "../../i18n/languageContext";
import { supabase } from "../../lib/supabaseClient";

export default function PriestDashboard() {
  const { user, loading } = useUser();
  const { userDetails, loading: loadingDetails } = useUserDetails();
  const router = useRouter();
  const { t } = useTranslation();

  const [salary, setSalary] = useState<any[]>([]);
  const [allSalary, setAllSalary] = useState<any[]>([]);
  const [detailedSalary, setDetailedSalary] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [priestAnnouncements, setPriestAnnouncements] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showProfileAlert, setShowProfileAlert] = useState(false);
  const startYear = 2023;
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  const getLastDate = (month: string, year: string) => {
    switch (Number(month)) {
      case 1:
      case 3:
      case 5:
      case 7:
      case 8:
      case 10:
      case 12:
        return 31;
      case 4:
      case 6:
      case 9:
      case 11:
        return 30;
      case 2:
        return 28 + (Number(year) % 4 === 0 ? 1 : 0);
      default:
        return 31;
    }
  };

  const loadDetailedSalary = useCallback(async (salaryData: any[]) => {
    if (!user || !salaryData.length) {
      setDetailedSalary([]);
      return;
    }

    // Merge salary with insurance and house rent data
    const sal_ins_rent = await Promise.all(
      salaryData.map(async (s) => {
        // Initialize insurance and rent fields
        const salaryWithInsuranceAndRent = {
          ...s,
          insurance_paid: 0,
          house_rent_paid: 0,
          health: 0,
          vehicle_insurance: 0,
          kfz_unfall_private: 0,
          lebens_und: 0,
          insurance_other_1: 0,
          insurance_other_2: 0,
          total: 0,
        };

        const monthYear = s.month.split('-')[0];
        const monthMonth = s.month.split('-')[1];
        const monthStart = `${monthYear}-${monthMonth}-01`;
        const monthEnd = `${monthYear}-${monthMonth}-${getLastDate(monthMonth, monthYear)}`;

        // Fetch insurance data
        const { data: insurance } = await supabase
          .from("insurance")
          .select("*")
          .eq("priest_id", user.id)
          .gte("month", monthStart)
          .lte("month", monthEnd);

        // Fetch house rent data
        const { data: houseRent } = await supabase
          .from("house_rent")
          .select("*")
          .eq("priest_id", user.id)
          .gte("month", monthStart)
          .lte("month", monthEnd)
          .maybeSingle();

        // Merge house rent data
        if (houseRent?.rent_amount) {
          salaryWithInsuranceAndRent.house_rent_paid = houseRent.rent_amount ?? 0;
        }

        // Merge insurance data
        const insuranceData = insurance ?? [];
        insuranceData?.forEach((ins: any) => {
          if (ins.type == 1) {
            salaryWithInsuranceAndRent.health = ins.amount;
          }
          if (ins.type == 2) {
            salaryWithInsuranceAndRent.vehicle_insurance = ins.amount;
          }
          if (ins.type == 3) {
            salaryWithInsuranceAndRent.kfz_unfall_private = ins.amount;
          }
          if (ins.type == 4) {
            salaryWithInsuranceAndRent.lebens_und = ins.amount;
          }
          if (ins.type == 5) {
            salaryWithInsuranceAndRent.insurance_other_1 = ins.amount;
          }
          if (ins.type == 6) {
            salaryWithInsuranceAndRent.insurance_other_2 = ins.amount;
          }
        });
        salaryWithInsuranceAndRent.insurance_paid = 
          salaryWithInsuranceAndRent.health + 
          salaryWithInsuranceAndRent.vehicle_insurance + 
          salaryWithInsuranceAndRent.kfz_unfall_private + 
          salaryWithInsuranceAndRent.lebens_und + 
          salaryWithInsuranceAndRent.insurance_other_1 + 
          salaryWithInsuranceAndRent.insurance_other_2;
        const salaryAmount = salaryWithInsuranceAndRent.salary_amount || salaryWithInsuranceAndRent.amount || 0;
        salaryWithInsuranceAndRent.total = 
          salaryAmount + 
          salaryWithInsuranceAndRent.house_rent_paid + 
          salaryWithInsuranceAndRent.insurance_paid;
        return salaryWithInsuranceAndRent;
      })
    );

    setDetailedSalary(sal_ins_rent);
  }, [user]);

  const changeYear = useCallback(async (year: string) => {
    if (!user) return;
    
    setSelectedYear(year);
    const { data: salaryData } = await supabase
      .from("salary")
      .select("*")
      .eq("priest_id", user.id)
      .gte("month", `${year}-01-01`)
      .lte("month", `${year}-12-31`)
      .order("month", { ascending: false });

    if (salaryData && salaryData.length > 0) {
      await loadDetailedSalary(salaryData);
    } else {
      setDetailedSalary([]);
    }
  }, [user, loadDetailedSalary]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      const [
        { data: salaryRows },
        { data: currentMonthSalary },
        { data: loanRows },
        { data: announcementRows },
        { data: priestAnnouncements },
        { data: priestData, error: priestError }
      ] = await Promise.all([
        supabase
          .from("salary")
          .select("*")
          .eq("priest_id", user.id)
          .order("month", { ascending: false }),
        supabase
          .from("salary")
          .select("*")
          .eq("priest_id", user.id)
          .eq("month", new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-01')
          .order("month", { ascending: false }),
        supabase
          .from("loans")
          .select("id, priest_id, principal, emi, issued_on, created_at, loan_notes, closed_on, last_emi_amount, total_months")
          .eq("priest_id", user.id)
          .order("issued_on", { ascending: false }),
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

      setSalary(currentMonthSalary ?? []);
      setAllSalary(salaryRows ?? []);
      setInsurance([]);
      setLoans(loanRows ?? []);
      
      // Load detailed salary for current year
      await changeYear(currentYear.toString());
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
  }, [user, loading, changeYear, currentYear]);

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
      <Card className="w-full">
        <CardContent className="px-6 py-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-muted">
              {icon}
            </div>
            <div className="flex flex-col items-start gap-2">
              <h3 className="font-medium">{title}</h3>
              <div className="text-2xl font-medium">€ {value}</div>
              <p className="text-sm text-muted-foreground">{subtitle?.split('\n').map((line, index) => (
                <span key={index}>{line}<br /></span>
              ))}</p>
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
        <div className="w-full md:w-3/4 flex flex-col gap-3">
          <Tabs
            defaultValue="dashboard"
            className="w-full"
          >
            <TabsList className="w-full flex justify-start !bg-indigo-100">
              <TabsTrigger value="dashboard">{t("adminDashboard.title")}</TabsTrigger>
              <TabsTrigger value="salary">{t("priestDashboard.financialSummary")}</TabsTrigger>
              <TabsTrigger value="loan">{t("priestDashboard.loanSummary")}</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard" className="flex flex-col gap-2">
              <div className="flex flex-col md:flex-row gap-2">
                <SummaryCard
                  title={t("priestDashboard.salaryDetails")}
                  value={salary.length > 0 ? (salary[0].salary_amount || salary[0].amount || "0") : "0"}
                  subtitle={salary.length > 0 ? new Date(salary[0].month).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : t("priestDashboard.noSalaryDetails")}
                  icon={<Wallet className="text-indigo-600" />}
                />
                <SummaryCard
                  title={t("priestDashboard.loanDetails")}
                  value={loans.length > 0 ? loans[0].principal : 0}
                  subtitle={loans.length > 0 ? 'Completed by ' + new Date(loans[0].closed_on).toLocaleDateString(undefined, { month: "long", year: "numeric" }) + '\n' + '€ ' + loans[0].emi.toString() + ' for ' + loans[0].total_months + ' Months' : t("priestDashboard.noLoanDetails")}
                  icon={<Landmark className="text-yellow-600" />}
                />
              </div>
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
            </TabsContent>
            <TabsContent value="salary" className="flex flex-col gap-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("priestDashboard.financialSummary")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full border border-gray-200 rounded-lg p-2 mb-4">
                    <div className="flex gap-3 items-end">
                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-600 mb-1">
                          Year
                        </label>
                        <Select
                          value={selectedYear}
                          onValueChange={(value) => changeYear(value)}
                          required
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: currentYear - startYear + 1 }, (_, i: any) => (
                              <SelectItem key={i} value={String(currentYear - i)} className="text-xs">
                                {currentYear - i}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  {detailedSalary.length > 0 ? (
                    <div className="w-full space-y-2">
                      {detailedSalary.map((s) => (
                        <Accordion key={s.id} type="multiple" className="w-full border border-gray-200 rounded-lg">
                          <AccordionItem key={s.id} value={`item-${s.id}`}>
                            <AccordionTrigger className="py-2">
                              <div className="flex gap-2">
                                <Image src="/bank.svg" alt="arrow" width={26} height={26} />
                                <div className="flex flex-col items-start text-xs">
                                  <span>
                                    {new Date(s.month).toLocaleDateString(undefined, {
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                  <span className="text-xs">€ {s.salary_amount || s.amount || "0.00"}</span>
                                </div>
                              </div>
                            </AccordionTrigger>

                            <AccordionContent className="p-2">
                              <section className="border border-gray-200 rounded-lg">
                                <Table className="w-full">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-3/4">Item</TableHead>
                                      <TableHead className="text-right pr-4">Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow>
                                      <TableCell className="text-[1rem]">Salary Paid</TableCell>
                                      <TableCell className="text-right text-[1rem] pr-4">
                                        € {s.salary_amount || s.amount || "0.00"}
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell className="text-[1rem]">House Rent Paid</TableCell>
                                      <TableCell className="text-right text-[1rem] pr-4">
                                        € {s.house_rent_paid || "0.00"}
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell className="text-[1rem]">Insurance Paid</TableCell>
                                      <TableCell className="text-right text-[1rem] pr-4">
                                        € {s.insurance_paid || "0.00"}
                                      </TableCell>
                                    </TableRow>

                                    <TableRow>
                                      <TableCell colSpan={2}>
                                        <Table className="">
                                          <TableBody>
                                            <TableRow>
                                              <TableCell>Health</TableCell>
                                              <TableCell className="text-right">€ {s.health || "0.00"}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                              <TableCell>Vehicle Insurance</TableCell>
                                              <TableCell className="text-right">€ {s.vehicle_insurance || "0.00"}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                              <TableCell>KFZ Unfall & private</TableCell>
                                              <TableCell className="text-right">€ {s.kfz_unfall_private || "0.00"}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                              <TableCell>Lebens- und</TableCell>
                                              <TableCell className="text-right">€ {s.lebens_und || "0.00"}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                              <TableCell>Insurance other 1</TableCell>
                                              <TableCell className="text-right">€ {s.insurance_other_1 || "0.00"}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                              <TableCell>Insurance other 2</TableCell>
                                              <TableCell className="text-right">€ {s.insurance_other_2 || "0.00"}</TableCell>
                                            </TableRow>
                                          </TableBody>
                                        </Table>
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                  <TableFooter>
                                    <TableRow>
                                      <TableCell className="text-xl">Total</TableCell>
                                      <TableCell className="text-right text-xl pr-4">€ {s.total || "0.00"}</TableCell>
                                    </TableRow>
                                  </TableFooter>
                                </Table>
                              </section>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      {t("priestDashboard.noSalaryDetails")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="loan" className="flex flex-col gap-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("priestDashboard.loanSummary")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loans.length > 0 ? (
                    <div className="space-y-4">
                      {loans.map((loan) => {
                        const closedDate = new Date(loan.closed_on);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        closedDate.setHours(0, 0, 0, 0);
                        const isActive = closedDate >= today;

                        return (
                          <Card key={loan.id} className="border-l-4 border-l-indigo-500">
                            <CardContent className="pt-4">
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col">
                                    <span className="text-sm text-muted-foreground">Principal</span>
                                    <span className="text-lg font-semibold">€ {loan.principal?.toFixed(2) || "0.00"}</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <span className={`text-sm font-medium ${isActive ? "text-green-600" : "text-red-600"}`}>
                                      {isActive ? "Active" : "Closed"}
                                    </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Monthly EMI</span>
                                    <span className="text-sm font-medium">€ {loan.emi?.toFixed(2) || "0.00"}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Total Months</span>
                                    <span className="text-sm font-medium">{loan.total_months || "N/A"}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Issued On</span>
                                    <span className="text-sm font-medium">
                                      {new Date(loan.issued_on).toLocaleDateString(undefined, {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Closed On</span>
                                    <span className="text-sm font-medium">
                                      {new Date(loan.closed_on).toLocaleDateString(undefined, {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>
                                </div>
                                {loan.loan_notes && (
                                  <div className="pt-2 border-t border-gray-100">
                                    <span className="text-xs text-muted-foreground">Notes</span>
                                    <p className="text-sm mt-1">{loan.loan_notes}</p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      {t("priestDashboard.noLoanDetails")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
