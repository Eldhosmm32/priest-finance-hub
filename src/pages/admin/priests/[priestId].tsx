import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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

type PriestProfile = {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    address: string | null;
    active: boolean;
    photo: string | null;
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
    const isDesktop = useMediaQuery("(min-width: 768px)");

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

            const { data: priestProfile } = await supabase
                .from("profiles")
                .select("id, full_name, email, phone, address, active, photo")
                .eq("id", priestId)
                .maybeSingle();

            setPriest(priestProfile as PriestProfile ?? null);

            changeYear(year);
            loadLoanData();
            setLoadingData(false);
        };

        load();
    }, [priestId, user, loading, router, loadLoanData]);

    return (
        <div className="flex gap-6">
            <div className="flex-1 space-y-4 p-4">
                <div className="flex gap-1 items-center">
                    <Image src="/back-arrow.svg" alt="Priest" width={12} height={12} onClick={() => router.push("/admin/priests")} />
                    <h2 className="text-lg font-semibold text-gray-800">
                        Priest Details
                    </h2>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-auto p-2">
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList>
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="salary">Financial Summary</TabsTrigger>
                            <TabsTrigger value="loan">Loan Summary</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="p-4">
                            <Card className="w-full">
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src={priest?.photo ?? '/priest.svg'} alt={priest?.full_name ?? ''} />
                                        <AvatarFallback>{priest?.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>

                                    <div className="flex flex-col">
                                        <h2 className="text-xl font-semibold">{priest?.full_name}</h2>

                                        <Badge
                                            className={`w-fit mt-1 ${priest?.active ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
                                            {priest?.active ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4 ">

                                    {/* Email */}
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm text-muted-foreground w-12">Email</Label>
                                        <span className="text-base font-medium">{priest?.email ?? 'N/A'}</span>
                                    </div>

                                    {/* Phone */}
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm text-muted-foreground w-12">Phone</Label>
                                        <span className="text-base font-medium">{priest?.phone ?? 'N/A'}</span>
                                    </div>

                                    {/* Address */}
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm text-muted-foreground w-12">Address</Label>
                                        <span className="text-base font-medium">{priest?.address ?? 'N/A'}</span>
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
                                            Year
                                        </label>
                                        <div className="flex gap-2">
                                            <Select value={year}
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
                                                                <TableHead className="w-3/4">Item</TableHead>
                                                                <TableHead className="text-right pr-4">Amount</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            <TableRow>
                                                                <TableCell className="text-[1rem]" >Salary Paid</TableCell>
                                                                <TableCell className="text-right text-[1rem] pr-4">€ {s.salary_amount}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="text-[1rem]" >House Rent Paid</TableCell>
                                                                <TableCell className="text-right text-[1rem] pr-4">€ {s.house_rent_paid}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="text-[1rem]" >Insurance Paid</TableCell>
                                                                <TableCell className="text-right text-[1rem] pr-4">€ {s.insurance_paid}</TableCell>
                                                            </TableRow>

                                                            <TableRow>
                                                                <TableCell colSpan={2}>
                                                                    <Table className="">
                                                                        <TableBody>
                                                                            <TableRow >
                                                                                <TableCell className="" >Health</TableCell>
                                                                                <TableCell className="text-right">€ {s.health}</TableCell>
                                                                            </TableRow>
                                                                            <TableRow>
                                                                                <TableCell >Vehcle Insurance</TableCell>
                                                                                <TableCell className="text-right">€ {s.vehicle_insurance}</TableCell>
                                                                            </TableRow>
                                                                            <TableRow>
                                                                                <TableCell >KFZ Unfall & private</TableCell>
                                                                                <TableCell className="text-right">€ {s.kfz_unfall_private}</TableCell>
                                                                            </TableRow>
                                                                            <TableRow>
                                                                                <TableCell >Lebens- und </TableCell>
                                                                                <TableCell className="text-right">€ {s.lebens_und}</TableCell>
                                                                            </TableRow>
                                                                            <TableRow>
                                                                                <TableCell >Insurance other 1</TableCell>
                                                                                <TableCell className="text-right">€ {s.insurance_other_1}</TableCell>
                                                                            </TableRow>
                                                                            <TableRow>
                                                                                <TableCell >Insurance other 2</TableCell>
                                                                                <TableCell className="text-right">€ {s.insurance_other_2}</TableCell>
                                                                            </TableRow>
                                                                        </TableBody>
                                                                    </Table>
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                        <TableFooter>
                                                            <TableRow>
                                                                <TableCell className="text-xl">Total</TableCell>
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
                            <div className="w-full space-y-4">
                                <div className="w-full bg-white border border-gray-200 rounded-lg overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left whitespace-nowrap">Principal</th>
                                                <th className="px-3 py-2 text-left whitespace-nowrap">EMI</th>
                                                <th className="px-3 py-2 text-left whitespace-nowrap">Issued On</th>
                                                <th className="px-3 py-2 text-left whitespace-nowrap">Notes</th>
                                                <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
                                                <th className="px-3 py-2 text-right whitespace-nowrap">Actions</th>
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
                                                            <Badge className={`text-xs font-medium text-white w-fit ${isActive ? "bg-green-500" : "bg-red-500"}`}>
                                                                {isActive ? "Active" : "Inactive"}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-3 py-2 flex gap-2 justify-end">
                                                            <Button size="sm" variant="ghost" onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleView(loan);
                                                            }}>
                                                                View
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {!loans.length && (
                                                <tr>
                                                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                                                        No loan entries yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
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
                                                    <h2 className="text-xl font-semibold text-gray-800">Loan Details</h2>
                                                    <p className="text-sm text-gray-500 mt-1">Summary of your active loan</p>
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
                                                                            <span className="text-gray-700">Issued On</span>
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
                                                                            <span className="text-gray-700">First EMI Date</span>
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
                                                                            <span className="text-gray-700">Last EMI Date</span>
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
                                                                        <span className="text-gray-700">Principal Disbursed</span>
                                                                    </div>
                                                                    <span className="font-semibold text-gray-800">
                                                                        € {selectedLoan.principal.toFixed(2)}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center justify-between border border-gray-200 rounded-lg py-1 px-2 w-full">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl">💵</span>
                                                                        <span className="text-gray-700">EMI Paid Monthly</span>
                                                                    </div>
                                                                    <div className="flex flex-col gap-0">
                                                                        <span className="font-semibold text-gray-800">
                                                                            € {selectedLoan.emi}
                                                                        </span>
                                                                        <span className="text-xs">{selectedLoan.total_months ?? 'N/A'} months</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center justify-between border border-gray-200 rounded-lg py-1 px-2 w-full">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl">💶</span>
                                                                        <span className="text-gray-700">Principal Paid</span>
                                                                    </div>
                                                                    <span className="font-semibold text-gray-800">
                                                                        € {details.principalPaid.toFixed(2)}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center justify-between border border-gray-200 rounded-lg py-1 px-2 w-full">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl">💷</span>
                                                                        <span className="text-gray-700">Outstanding Balance</span>
                                                                    </div>
                                                                    <span className="font-semibold text-yellow-600">
                                                                        € {details.outstandingBalance.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <span className="text-xs font-medium text-gray-600 py-2">EMI Schedule</span>
                                                                <div className="h-40 overflow-y-auto border border-gray-200 rounded-lg">
                                                                    <table className="min-w-full text-sm">
                                                                        <thead className="bg-gray-50 sticky top-0">
                                                                            <tr>
                                                                                <th className="px-3 py-2 text-left whitespace-nowrap">EMI Number</th>
                                                                                <th className="px-3 py-2 text-left whitespace-nowrap">Date</th>
                                                                                <th className="px-3 py-2 text-right whitespace-nowrap">Amount</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {details.emiList.map((emi) => (
                                                                                <tr key={emi.emiNumber} className="border-t border-gray-100">
                                                                                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                                                                        EMI {emi.emiNumber}
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
                                                    Cancel
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
                                            <DrawerTitle>Loan Details</DrawerTitle>
                                            <DrawerDescription>Summary of the loan</DrawerDescription>
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
                                                                            <span className="text-gray-700">Issued On</span>
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
                                                                            <span className="text-gray-700">First EMI Date</span>
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
                                                                            <span className="text-gray-700">Last EMI Date</span>
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
                                                                        <span className="text-gray-700">Principal Disbursed</span>
                                                                    </div>
                                                                    <span className="font-semibold text-gray-800">
                                                                        € {selectedLoan.principal.toFixed(2)}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl">💵</span>
                                                                        <span className="text-gray-700">EMI Paid Monthly</span>
                                                                    </div>
                                                                    <div className="flex flex-col gap-0">
                                                                        <span className="font-semibold text-gray-800">
                                                                            € {selectedLoan.emi}
                                                                        </span>
                                                                        <span className="text-xs">{selectedLoan.total_months} months</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl">💶</span>
                                                                        <span className="text-gray-700">Principal Paid</span>
                                                                    </div>
                                                                    <span className="font-semibold text-gray-800">
                                                                        € {details.principalPaid.toFixed(2)}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl">💷</span>
                                                                        <span className="text-gray-700">Outstanding Balance</span>
                                                                    </div>
                                                                    <span className="font-semibold text-yellow-600">
                                                                        € {details.outstandingBalance.toFixed(2)}
                                                                    </span>
                                                                </div>

                                                                <span className="text-xs font-medium text-gray-600 py-2">EMI Schedule</span>
                                                                <div className="h-40 overflow-y-auto border border-gray-200 rounded-lg">
                                                                    <table className="min-w-full text-sm">
                                                                        <thead className="bg-gray-50 sticky top-0">
                                                                            <tr>
                                                                                <th className="px-3 py-2 text-left whitespace-nowrap">EMI Number</th>
                                                                                <th className="px-3 py-2 text-left whitespace-nowrap">Date</th>
                                                                                <th className="px-3 py-2 text-right whitespace-nowrap">Amount</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {details.emiList.map((emi) => (
                                                                                <tr key={emi.emiNumber} className="border-t border-gray-100">
                                                                                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                                                                        EMI {emi.emiNumber}
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
                                                Cancel
                                            </Button>
                                        </DrawerFooter>
                                    </DrawerContent>
                                </Drawer>
                            }
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
