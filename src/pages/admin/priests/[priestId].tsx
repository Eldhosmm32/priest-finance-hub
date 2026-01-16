import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useUser } from "../../../hooks/useUser";
import { supabase } from "../../../lib/supabaseClient";
import { Table, TableCaption, TableHeader, TableBody, TableFooter, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { useRouter } from "next/router";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import useMediaQuery from "@/hooks/useMediaQuery";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/languageContext";

type PriestProfile = {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    address: string | null;
    active: boolean;
    photo: string | null;
    date_of_birth: string | null;
    province: string | null;
    diocese: string | null;
    visa_number: string | null;
    visa_category: string | null;
    visa_expiry_date: string | null;
    passport_number: string | null;
};

type Salary = {
    id: string;
    priest_id: string;
    salary_amount: number;
    month: string;
    house_rent_paid: number;
    insurance_paid: number;
    health: number;
    vehicle_insurance: number;
    kfz_unfall_private: number;
    lebens_und: number;
    insurance_other_1: number;
    insurance_other_2: number;
    other_expenses: number;
    total: number;
    created_by: string;
    created_at: string;
};

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

const LOAN_QUERY = "id, priest_id, principal, emi, issued_on, created_at, loan_notes, profiles!loans_priest_id_fkey(full_name, email), closed_on, last_emi_amount, total_months";

export default function AdminPriestDetail() {
    const router = useRouter();
    const startYear: any = 2023;
    const currentYear: any = new Date().getFullYear();
    const { priestId } = router.query;
    const { user, loading } = useUser();
    const [priest, setPriest] = useState<PriestProfile | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [year, setYear] = useState(currentYear.toString());
    const [salary, setSalary] = useState<Salary[]>([]);
    const [loans, setLoans] = useState<LoanRow[]>([]);
    const [openView, setOpenView] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<LoanRow | null>(null);
    const [openEdit, setOpenEdit] = useState(false);
    const [openEditName, setOpenEditName] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingName, setSavingName] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nameError, setNameError] = useState<string | null>(null);
    const [nameValue, setNameValue] = useState("");
    const [formData, setFormData] = useState({
        date_of_birth: "",
        photo: "",
        address: "",
        phone: "",
        province: "",
        diocese: "",
        visa_number: "",
        visa_category: "",
        visa_expiry_date: "",
        passport_number: "",
    });
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const { t } = useTranslation();

    const changeYear = async (value: any) => {
        setYear(value);
        const { data: salary } = await supabase
            .from("salary")
            .select("*")
            .eq("priest_id", priestId)
            .gte("month", `${value}-01-01`)
            .lte("month", `${value}-12-31`)
            .order("month", { ascending: false })
        const salaryData = salary ?? [];

        // Wait for all insurance and rent data to be fetched and merged
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
                    .eq("priest_id", priestId)
                    .gte("month", monthStart)
                    .lte("month", monthEnd);

                // Fetch house rent data
                const { data: houseRent } = await supabase
                    .from("house_rent")
                    .select("*")
                    .eq("priest_id", priestId)
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
                salaryWithInsuranceAndRent.insurance_paid = salaryWithInsuranceAndRent.health + salaryWithInsuranceAndRent.vehicle_insurance + salaryWithInsuranceAndRent.kfz_unfall_private + salaryWithInsuranceAndRent.lebens_und + salaryWithInsuranceAndRent.insurance_other_1 + salaryWithInsuranceAndRent.insurance_other_2;
                salaryWithInsuranceAndRent.total = salaryWithInsuranceAndRent.salary_amount + salaryWithInsuranceAndRent.house_rent_paid + salaryWithInsuranceAndRent.insurance_paid;
                return salaryWithInsuranceAndRent;
            })

        );

        setSalary(sal_ins_rent as Salary[] ?? []);
    }

    const getLastDate = (month: number, year: number) => {
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
    }

    // Load loans data for the priest
    const loadLoanData = useCallback(async () => {
        if (!priestId || Array.isArray(priestId)) return;
        const { data: loanResult } = await supabase
            .from("loans")
            .select(LOAN_QUERY)
            .eq("priest_id", priestId)
            .order("issued_on", { ascending: false })
            .limit(100);

        setLoans((loanResult ?? []) as unknown as LoanRow[]);
    }, [priestId]);

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

    const handleView = (loan: LoanRow) => {
        setSelectedLoan(loan);
        setOpenView(true);
    };

    const handleOpenEditName = async () => {
        setOpenEditName(true);
        setNameError(null);
        setNameValue(priest?.full_name ?? "");
    };

    const handleCloseEditName = () => {
        setOpenEditName(false);
        setNameError(null);
        setNameValue("");
    };

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!priestId || Array.isArray(priestId)) return;

        if (!nameValue.trim()) {
            setNameError(t("common.nameRequired") || "Name is required");
            return;
        }

        setSavingName(true);
        setNameError(null);

        try {
            // Update full_name in profiles table
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ full_name: nameValue.trim() })
                .eq("id", priestId);

            if (updateError) throw updateError;

            // Refresh priest data
            const { data: priestProfile } = await supabase
                .from("profiles")
                .select("id, full_name, email, active")
                .eq("id", priestId)
                .maybeSingle();

            const { data: priestData } = await supabase
                .from("priests")
                .select("address, date_of_birth, province, diocese, visa_number, visa_category, visa_expiry_date, passport_number, phone, photo")
                .eq("id", priestId)
                .maybeSingle();

            const mergedPriestData: PriestProfile = {
                ...(priestProfile ?? {}),
                ...(priestData ?? {}),
                photo: priestData?.photo ?? null,
            } as PriestProfile;

            setPriest(mergedPriestData);
            showToast(t("common.updated"), "success");
            handleCloseEditName();
        } catch (err: any) {
            console.error("Error updating name:", err);
            setNameError(err.message || "Failed to update name");
        } finally {
            setSavingName(false);
        }
    };

    const handleOpenEdit = async () => {
        setOpenEdit(true);
        setError(null);

        // Fetch current data from priests table
        if (priestId && !Array.isArray(priestId)) {
            try {
                const { data: priestData } = await supabase
                    .from("priests")
                    .select("*")
                    .eq("id", priestId)
                    .maybeSingle();

                // Populate form with existing data
                setFormData({
                    date_of_birth: priestData?.date_of_birth ? new Date(priestData.date_of_birth).toISOString().split('T')[0] : "",
                    photo: priestData?.photo ?? "",
                    address: priestData?.address ?? "",
                    phone: priestData?.phone ?? "",
                    province: priestData?.province ?? "",
                    diocese: priestData?.diocese ?? "",
                    visa_number: priestData?.visa_number ?? "",
                    visa_category: priestData?.visa_category ?? "",
                    visa_expiry_date: priestData?.visa_expiry_date ? new Date(priestData.visa_expiry_date).toISOString().split('T')[0] : "",
                    passport_number: priestData?.passport_number ?? "",
                });
            } catch (err) {
                console.error("Error fetching priest data:", err);
                setError("Failed to load profile data");
            }
        }
    };

    const handleCloseEdit = () => {
        setOpenEdit(false);
        setError(null);
        // Reset form
        setFormData({
            date_of_birth: "",
            photo: "",
            address: "",
            phone: "",
            province: "",
            diocese: "",
            visa_number: "",
            visa_category: "",
            visa_expiry_date: "",
            passport_number: "",
        });

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

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!priestId || Array.isArray(priestId)) return;

        setSaving(true);
        setError(null);

        try {
            // Prepare update data - include all fields, empty strings will be set to null
            const updateData: any = {
                date_of_birth: formData.date_of_birth || null,
                photo: formData.photo || null,
                address: formData.address || null,
                phone: formData.phone || null,
                province: formData.province || null,
                diocese: formData.diocese || null,
                visa_number: formData.visa_number || null,
                visa_category: formData.visa_category || null,
                visa_expiry_date: formData.visa_expiry_date || null,
                passport_number: formData.passport_number || null,
            };

            // Update existing record
            const { error: updateError } = await supabase
                .from("priests")
                .update(updateData)
                .eq("id", priestId);

            if (updateError) throw updateError;

            // Refresh priest data
            const { data: priestProfile } = await supabase
                .from("profiles")
                .select("id, full_name, email, active")
                .eq("id", priestId)
                .maybeSingle();

            const { data: priestData } = await supabase
                .from("priests")
                .select("address, date_of_birth, province, diocese, visa_number, visa_category, visa_expiry_date, passport_number, phone, photo")
                .eq("id", priestId)
                .maybeSingle();

            const mergedPriestData: PriestProfile = {
                ...(priestProfile ?? {}),
                ...(priestData ?? {}),
                photo: priestData?.photo ?? null,
            } as PriestProfile;

            setPriest(mergedPriestData);
            showToast(t("common.updated"), "success");
            handleCloseEdit();
        } catch (err: any) {
            console.error("Error updating profile:", err);
            setError(err.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (!priestId || Array.isArray(priestId)) return;
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

            // Fetch profile data
            const { data: priestProfile } = await supabase
                .from("profiles")
                .select("id, full_name, email, active")
                .eq("id", priestId)
                .maybeSingle();

            // Fetch priest metadata
            const { data: priestData } = await supabase
                .from("priests")
                .select("address, date_of_birth, province, diocese, visa_number, visa_category, visa_expiry_date, passport_number, phone, photo")
                .eq("id", priestId)
                .maybeSingle();

            // Merge profile and priest data, prioritizing priests.photo if available
            const mergedPriestData: PriestProfile = {
                ...(priestProfile ?? {}),
                ...(priestData ?? {}),
                photo: priestData?.photo ?? null,
            } as PriestProfile;

            setPriest(mergedPriestData);

            changeYear(year);
            loadLoanData();
            setLoadingData(false);
        };

        load();
    }, [priestId, user, loading, router, loadLoanData]);

    return (
        <div className="flex gap-6">
            <div className="flex-1 space-y-4 bg-gradient-to-b from-[#f3e7e9] to-[#e3eeff] rounded-lg p-2 md:p-4 min-h-[calc(100vh-9.5rem)]">
                <div className="flex gap-1 items-center cursor-pointer" onClick={() => router.push("/admin/priests")}>
                    <Image src="/back-arrow.svg" alt="Priest" width={10} height={10} />
                    <h2 className="text-sm font-semibold text-gray-800">
                        {t("adminPriestDetail.priestList")}
                    </h2>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg w-[calc(100vw-2rem)] md:w-full overflow-auto p-2">
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList>
                            <TabsTrigger value="details">{t("common.details")}</TabsTrigger>
                            <TabsTrigger value="salary">{t("adminPriestDetail.financialSummary")}</TabsTrigger>
                            <TabsTrigger value="loan">{t("adminPriestDetail.loanSummary")}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="p-4">
                            <Card className="w-full">
                                <CardHeader className="flex flex-row items-center gap-4 relative">
                                    <Avatar className="h-20 w-20 relative">
                                        <AvatarImage src={priest?.photo ?? '/priest.svg'} alt={priest?.full_name ?? ''} />
                                        <AvatarFallback>{priest?.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>

                                    <Badge
                                        className={`w-fit mt-1 absolute top-2 left-16 text-[10px] ${priest?.active ? "bg-green-600 text-white" : "bg-yellow-500 text-white"}`}>
                                        {priest?.active ? t("common.active") : t("common.inactive")}
                                    </Badge>

                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-xl font-semibold">{priest?.full_name}</h2>
                                        <div className="flex">
                                            <div
                                                className="px-2 py-1 w-auto  text-indigo-600 gap-1 rounded-sm flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                                                onClick={handleOpenEdit}
                                            >
                                                <span className="text-indigo-600 text-sm">{t("common.edit")} {t("common.details")}</span>
                                            </div>
                                            <span className="px-1 text-gray-500">|</span>
                                            <div
                                                className="px-2 py-1 w-auto text-indigo-600 gap-1 rounded-sm flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                                                onClick={handleOpenEditName}
                                            >
                                                <span className="text-indigo-600 text-sm">{t("common.edit")} {t("common.name")}</span>
                                            </div>
                                        </div>

                                    </div>


                                </CardHeader>

                                <CardContent className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {/* Email */}
                                    <div className="flex flex-col md:flex-row gap-2 col-span-2">
                                        <Label className="text-sm text-muted-foreground w-32">{t("common.email")}</Label>
                                        <span className="text-base font-medium truncate">{priest?.email ?? 'N/A'}</span>
                                    </div>

                                    {/* Current Address */}
                                    <div className="flex items-start gap-2 col-span-2">
                                        <Label className="text-sm text-muted-foreground w-32">{t("common.currentAddress")}</Label>
                                        <span className="text-base font-medium truncate">{priest?.address ?? 'N/A'}</span>
                                    </div>

                                    {/* Date of Birth */}
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <Label className="text-sm text-muted-foreground w-32">{t("common.dateOfBirth")}</Label>
                                        <span className="text-base font-medium">
                                            {priest?.date_of_birth
                                                ? new Date(priest.date_of_birth).toLocaleDateString(undefined, {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })
                                                : 'N/A'}
                                        </span>
                                    </div>

                                    {/* Phone Number */}
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <Label className="text-sm text-muted-foreground w-32">{t("common.phoneNumber")}</Label>
                                        <span className="text-base font-medium truncate">{priest?.phone ?? 'N/A'}</span>
                                    </div>

                                    {/* Province */}
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <Label className="text-sm text-muted-foreground w-32">{t("common.province")}</Label>
                                        <span className="text-base font-medium truncate">{priest?.province ?? 'N/A'}</span>
                                    </div>

                                    {/* Diocese */}
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <Label className="text-sm text-muted-foreground w-32">{t("common.diocese")}</Label>
                                        <span className="text-base font-medium truncate">{priest?.diocese ?? 'N/A'}</span>
                                    </div>

                                    {/* Visa Number */}
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <Label className="text-sm text-muted-foreground w-32">{t("common.visaNumber")}</Label>
                                        <span className="text-base font-medium truncate">{priest?.visa_number ?? 'N/A'}</span>
                                    </div>

                                    {/* Visa Category */}
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <Label className="text-sm text-muted-foreground w-32">{t("common.visaCategory")}</Label>
                                        <span className="text-base font-medium truncate">{priest?.visa_category ?? 'N/A'}</span>
                                    </div>

                                    {/* Visa Expiry Date */}
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <Label className="text-sm text-muted-foreground w-32">{t("common.visaExpiryDate")}</Label>
                                        <span className="text-base font-medium">
                                            {priest?.visa_expiry_date
                                                ? new Date(priest.visa_expiry_date).toLocaleDateString(undefined, {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })
                                                : 'N/A'}
                                        </span>
                                    </div>

                                    {/* Passport Number */}
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <Label className="text-sm text-muted-foreground w-32">{t("common.passportNumber")}</Label>
                                        <span className="text-base font-medium truncate">{priest?.passport_number ?? 'N/A'}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="salary" className="p-4">
                            <div className="w-full border border-gray-200 rounded-lg p-2">
                                <div
                                    className="flex gap-3 items-end"
                                >
                                    <div className="flex flex-col">
                                        <label className="text-xs font-medium text-gray-600 mb-1">
                                            {t("adminPriestDetail.year")}
                                        </label>
                                        <div className="flex gap-2">
                                            <Select value={year}
                                                onValueChange={(value) => changeYear(value)}
                                                required
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder={t("adminPriestDetail.selectYear")} />
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
                                {salary.map((s) => (
                                    <Accordion key={s.id} type="multiple" className="w-full border border-gray-200 rounded-lg mt-2">
                                        <AccordionItem key={s.id} value={`item-${s.id}`}>
                                            <AccordionTrigger className="py-2">
                                                <div className="flex gap-2">
                                                    <Image src="/bank.svg" alt="arrow" width={26} height={26} />
                                                    <div className="flex flex-col items-start text-xs">
                                                        <span>{new Date(s.month).toLocaleDateString(undefined, {
                                                            month: "short",
                                                            year: "numeric",
                                                        })}</span>
                                                        <span className="text-xs">€ {s.salary_amount}</span>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>

                                            <AccordionContent className="p-2">
                                                <section className="border border-gray-200 rounded-lg">
                                                    <Table className="w-full">
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-3/4">{t("adminPriestDetail.item")}</TableHead>
                                                                <TableHead className="text-right pr-4">{t("common.amount")}</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            <TableRow>
                                                                <TableCell className="text-[1rem]" >{t("adminPriestDetail.salaryPaid")}</TableCell>
                                                                <TableCell className="text-right text-[1rem] pr-4">€ {s.salary_amount}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="text-[1rem]" >{t("adminPriestDetail.houseRentPaid")}</TableCell>
                                                                <TableCell className="text-right text-[1rem] pr-4">€ {s.house_rent_paid}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="text-[1rem]" >{t("adminPriestDetail.insurancePaid")}</TableCell>
                                                                <TableCell className="text-right text-[1rem] pr-4">€ {s.insurance_paid}</TableCell>
                                                            </TableRow>

                                                            <TableRow>
                                                                <TableCell colSpan={2}>
                                                                    <Table className="">
                                                                        <TableBody>
                                                                            <TableRow >
                                                                                <TableCell className="" >{t("adminPriestDetail.health")}</TableCell>
                                                                                <TableCell className="text-right">€ {s.health}</TableCell>
                                                                            </TableRow>
                                                                            <TableRow>
                                                                                <TableCell >{t("adminPriestDetail.vehcleInsurance")}</TableCell>
                                                                                <TableCell className="text-right">€ {s.vehicle_insurance}</TableCell>
                                                                            </TableRow>
                                                                            <TableRow>
                                                                                <TableCell >{t("adminPriestDetail.kfzUnfallPrivate")}</TableCell>
                                                                                <TableCell className="text-right">€ {s.kfz_unfall_private}</TableCell>
                                                                            </TableRow>
                                                                            <TableRow>
                                                                                <TableCell >{t("adminPriestDetail.lebensUnd")}</TableCell>
                                                                                <TableCell className="text-right">€ {s.lebens_und}</TableCell>
                                                                            </TableRow>
                                                                            <TableRow>
                                                                                <TableCell >{t("adminPriestDetail.insuranceOther1")}</TableCell>
                                                                                <TableCell className="text-right">€ {s.insurance_other_1}</TableCell>
                                                                            </TableRow>
                                                                            <TableRow>
                                                                                <TableCell >{t("adminPriestDetail.insuranceOther2")}</TableCell>
                                                                                <TableCell className="text-right">€ {s.insurance_other_2}</TableCell>
                                                                            </TableRow>
                                                                        </TableBody>
                                                                    </Table>
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                        <TableFooter>
                                                            <TableRow>
                                                                <TableCell className="text-xl">{t("adminPriestDetail.total")}</TableCell>
                                                                <TableCell className="text-right text-xl pr-4">€ {s.total}</TableCell>
                                                            </TableRow>
                                                        </TableFooter>
                                                    </Table>
                                                </section>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                ))}
                            </div>
                        </TabsContent>
                        <TabsContent value="loan" className="p-4">
                            <div className="p-1 rounded-lg bg-white border border-gray-200 overflow-hidden">
                                <div className="overflow-auto rounded-lg max-h-[calc(100vh-17rem)] thin-scroll">
                                    <div className="w-full bg-white border border-gray-200 rounded-lg overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminPriestDetail.principal")}</th>
                                                    <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminPriestDetail.emi")}</th>
                                                    <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminPriestDetail.issuedOn")}</th>
                                                    <th className="px-3 py-2 text-left whitespace-nowrap">{t("common.notes")}</th>
                                                    <th className="px-3 py-2 text-left whitespace-nowrap">{t("common.status")}</th>
                                                    <th className="px-3 py-2 text-right whitespace-nowrap">{t("common.actions")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loans.map((loan) => {
                                                    const closedDate = new Date(loan.closed_on);
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    closedDate.setHours(0, 0, 0, 0);
                                                    const isActive = closedDate >= today;

                                                    return (
                                                        <tr
                                                            key={loan.id}
                                                            className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${selectedLoan?.id === loan.id ? "bg-indigo-50" : ""
                                                                }`}
                                                            onClick={() => handleView(loan)}
                                                        >
                                                            <td className="px-3 py-2 text-left whitespace-nowrap">€ {loan.principal.toFixed(2)}</td>
                                                            <td className="px-3 py-2 text-left whitespace-nowrap">€ {loan.emi.toFixed(2)}</td>
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
                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                <Badge className={`text-xs font-medium text-white w-fit ${isActive ? "bg-green-500" : "bg-yellow-500"}`}>
                                                                    {isActive ? t("common.active") : t("common.inactive")}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-3 py-2 flex gap-2 justify-end">
                                                                <Button size="sm" variant="ghost" onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleView(loan);
                                                                }}>
                                                                    {t("common.view")}
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {!loans.length && (
                                                    <tr>
                                                        <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                                                            {t("adminPriestDetail.noLoanEntries")}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {isDesktop ?
                                <Dialog
                                    open={openView}
                                    onOpenChange={setOpenView}
                                    aria-describedby="loan-details"
                                >
                                    <DialogContent>
                                        <DialogHeader className="hidden">
                                            <DialogTitle></DialogTitle>
                                        </DialogHeader>
                                        {selectedLoan &&
                                            <>
                                                <div className="pb-4 border-b border-gray-200">
                                                    <h2 className="text-xl font-semibold text-gray-800">{t("adminPriestDetail.loanDetails")}</h2>
                                                    <p className="text-sm text-gray-500 mt-1">{t("adminPriestDetail.summaryOfActiveLoan")}</p>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    {(() => {
                                                        const details = calculateLoanDetails(selectedLoan);
                                                        return (
                                                            <>
                                                                <div className="flex gap-2">
                                                                    <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-1 w-full">
                                                                        <span className="text-xl">📅</span>
                                                                        <div className="flex flex-col gap-0 text-sm">
                                                                            <span className="text-gray-700">{t("adminPriestDetail.issuedOnLabel")}</span>
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
                                                                            <span className="text-gray-700">{t("adminPriestDetail.firstEmiDate")}</span>
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
                                                                            <span className="text-gray-700">{t("adminPriestDetail.lastEmiDate")}</span>
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
                                                                        <span className="text-gray-700">{t("adminPriestDetail.principalDisbursed")}</span>
                                                                    </div>
                                                                    <span className="font-semibold text-gray-800">
                                                                        € {selectedLoan.principal.toFixed(2)}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center justify-between border border-gray-200 rounded-lg py-1 px-2 w-full">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl">💵</span>
                                                                        <span className="text-gray-700">{t("adminPriestDetail.emiPaidMonthly")}</span>
                                                                    </div>
                                                                    <div className="flex flex-col gap-0">
                                                                        <span className="font-semibold text-gray-800">
                                                                            € {selectedLoan.emi}
                                                                        </span>
                                                                        <span className="text-xs">{selectedLoan.total_months ?? 'N/A'} {t("adminPriestDetail.months")}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center justify-between border border-gray-200 rounded-lg py-1 px-2 w-full">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl">💶</span>
                                                                        <span className="text-gray-700">{t("adminPriestDetail.principalPaid")}</span>
                                                                    </div>
                                                                    <span className="font-semibold text-gray-800">
                                                                        € {details.principalPaid.toFixed(2)}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center justify-between border border-gray-200 rounded-lg py-1 px-2 w-full">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl">💷</span>
                                                                        <span className="text-gray-700">{t("adminPriestDetail.outstandingBalance")}</span>
                                                                    </div>
                                                                    <span className="font-semibold text-yellow-600">
                                                                        € {details.outstandingBalance.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <span className="text-xs font-medium text-gray-600 py-2">{t("adminPriestDetail.emiSchedule")}</span>
                                                                <div className="h-40 overflow-y-auto border border-gray-200 rounded-lg">
                                                                    <table className="min-w-full text-sm">
                                                                        <thead className="bg-gray-50 sticky top-0">
                                                                            <tr>
                                                                                <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminPriestDetail.emiNumber")}</th>
                                                                                <th className="px-3 py-2 text-left whitespace-nowrap">{t("common.date")}</th>
                                                                                <th className="px-3 py-2 text-right whitespace-nowrap">{t("common.amount")}</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {details.emiList.map((emi) => (
                                                                                <tr key={emi.emiNumber} className="border-t border-gray-100">
                                                                                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                                                                        {t("adminPriestDetail.emi")} {emi.emiNumber}
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
                                    aria-describedby="loan-details">
                                    <DrawerContent>
                                        <DrawerHeader>
                                            <DrawerTitle>{t("adminPriestDetail.loanDetails")}</DrawerTitle>
                                            <DrawerDescription>{t("adminPriestDetail.summaryOfTheLoan")}</DrawerDescription>
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
                                                                            <span className="text-gray-700">{t("adminPriestDetail.issuedOnLabel")}</span>
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
                                                                            <span className="text-gray-700">{t("adminPriestDetail.firstEmiDate")}</span>
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
                                                                            <span className="text-gray-700">{t("adminPriestDetail.lastEmiDate")}</span>
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
                                                                        <span className="text-gray-700">{t("adminPriestDetail.principalDisbursed")}</span>
                                                                    </div>
                                                                    <span className="font-semibold text-gray-800">
                                                                        € {selectedLoan.principal.toFixed(2)}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl">💵</span>
                                                                        <span className="text-gray-700">{t("adminPriestDetail.emiPaidMonthly")}</span>
                                                                    </div>
                                                                    <div className="flex flex-col gap-0">
                                                                        <span className="font-semibold text-gray-800">
                                                                            € {selectedLoan.emi}
                                                                        </span>
                                                                        <span className="text-xs">{selectedLoan.total_months} {t("adminPriestDetail.months")}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl">💶</span>
                                                                        <span className="text-gray-700">{t("adminPriestDetail.principalPaid")}</span>
                                                                    </div>
                                                                    <span className="font-semibold text-gray-800">
                                                                        € {details.principalPaid.toFixed(2)}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl">💷</span>
                                                                        <span className="text-gray-700">{t("adminPriestDetail.outstandingBalance")}</span>
                                                                    </div>
                                                                    <span className="font-semibold text-yellow-600">
                                                                        € {details.outstandingBalance.toFixed(2)}
                                                                    </span>
                                                                </div>

                                                                <span className="text-xs font-medium text-gray-600 py-2">{t("adminPriestDetail.emiSchedule")}</span>
                                                                <div className="h-40 overflow-y-auto border border-gray-200 rounded-lg">
                                                                    <table className="min-w-full text-sm">
                                                                        <thead className="bg-gray-50 sticky top-0">
                                                                            <tr>
                                                                                <th className="px-3 py-2 text-left whitespace-nowrap">{t("adminPriestDetail.emiNumber")}</th>
                                                                                <th className="px-3 py-2 text-left whitespace-nowrap">{t("common.date")}</th>
                                                                                <th className="px-3 py-2 text-right whitespace-nowrap">{t("common.amount")}</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {details.emiList.map((emi) => (
                                                                                <tr key={emi.emiNumber} className="border-t border-gray-100">
                                                                                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                                                                        {t("adminPriestDetail.emi")} {emi.emiNumber}
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
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Edit Profile Dialog */}
            <Dialog open={openEdit} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    handleCloseEdit();
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("adminPriestDetail.editPriestProfile")}</DialogTitle>
                    </DialogHeader>

                    {error && (
                        <div className="bg-red-50 border text-sm border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                            {error}
                            <button className="text-red-700" onClick={() => setError(null)}>×</button>
                        </div>
                    )}

                    <form onSubmit={handleUpdateProfile}>
                        <div className="p-2 mb-4 h-[calc(100vh-15rem)] overflow-y-auto space-y-4">
                            {/* Personal Information Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{t("common.personalInformation")}</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("adminPriestDetail.dateOfBirthLabel")}</span>
                                        <Input
                                            id="date_of_birth"
                                            type="date"
                                            value={formData.date_of_birth}
                                            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("adminPriestDetail.profilePhotoUrl")}</span>
                                        <Input
                                            id="photo"
                                            type="url"
                                            placeholder={t("adminPriestDetail.enterPhotoUrl")}
                                            value={formData.photo}
                                            onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address Information Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{t("common.addressInformation")}</h3>

                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-medium text-black-700">{t("adminPriestDetail.currentAddressLabel")}</span>
                                    <Input
                                        id="address"
                                        type="text"
                                        placeholder={t("adminPriestDetail.enterCurrentAddress")}
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-medium text-black-700">{t("adminPriestDetail.phoneNumberLabel")}</span>
                                    <Input
                                        id="phone"
                                        type="text"
                                        placeholder={t("adminPriestDetail.enterPhoneNumber")}
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Religious Information Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{t("common.religiousInformation")}</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("adminPriestDetail.provinceLabel")}</span>
                                        <Input
                                            id="province"
                                            type="text"
                                            placeholder={t("adminPriestDetail.enterProvince")}
                                            value={formData.province}
                                            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("adminPriestDetail.dioceseLabel")}</span>
                                        <Input
                                            id="diocese"
                                            type="text"
                                            placeholder={t("adminPriestDetail.enterDiocese")}
                                            value={formData.diocese}
                                            onChange={(e) => setFormData({ ...formData, diocese: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Visa & Passport Information Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{t("common.visaPassportInformation")}</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("adminPriestDetail.visaNumberLabel")}</span>
                                        <Input
                                            id="visa_number"
                                            type="text"
                                            placeholder={t("adminPriestDetail.enterVisaNumber")}
                                            value={formData.visa_number}
                                            onChange={(e) => setFormData({ ...formData, visa_number: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("adminPriestDetail.visaCategoryLabel")}</span>
                                        <Input
                                            id="visa_category"
                                            type="text"
                                            placeholder={t("adminPriestDetail.enterVisaCategory")}
                                            value={formData.visa_category}
                                            onChange={(e) => setFormData({ ...formData, visa_category: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("adminPriestDetail.visaExpiryDateLabel")}</span>
                                        <Input
                                            id="visa_expiry_date"
                                            type="date"
                                            value={formData.visa_expiry_date}
                                            onChange={(e) => setFormData({ ...formData, visa_expiry_date: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("adminPriestDetail.passportNumberLabel")}</span>
                                        <Input
                                            id="passport_number"
                                            type="text"
                                            placeholder={t("adminPriestDetail.enterPassportNumber")}
                                            value={formData.passport_number}
                                            onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <div className="flex justify-end gap-2 items-center w-full">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCloseEdit}
                                    disabled={saving}
                                >
                                    {t("common.cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    disabled={saving}
                                >
                                    {saving ? t("common.saving") : t("common.save")}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Name Dialog */}
            <Dialog open={openEditName} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    handleCloseEditName();
                }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("common.edit")} {t("common.name")}</DialogTitle>
                    </DialogHeader>

                    {nameError && (
                        <div className="bg-red-50 border text-sm border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                            {nameError}
                            <button className="text-red-700" onClick={() => setNameError(null)}>×</button>
                        </div>
                    )}

                    <form onSubmit={handleUpdateName}>
                        <div className="space-y-4 py-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="full_name" className="text-sm font-medium">
                                    {t("common.name")}
                                </Label>
                                <Input
                                    id="full_name"
                                    type="text"
                                    placeholder={t("common.enterName") || "Enter name"}
                                    value={nameValue}
                                    onChange={(e) => setNameValue(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <div className="flex justify-end gap-2 items-center w-full">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCloseEditName}
                                    disabled={savingName}
                                >
                                    {t("common.cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    disabled={savingName}
                                >
                                    {savingName ? t("common.saving") : t("common.save")}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
