import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useUser } from "../../../hooks/useUser";
import { supabase } from "../../../lib/supabaseClient";
import { Table, TableCaption, TableHeader, TableBody, TableFooter, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { useRouter } from "next/router";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
    amount: number;
    month: string;
    salary_paid: number;
    house_rent_paid: number;
    insurance_paid: number;
    health: number;
    vehicle_insurance: number;
    kfz_unfall_private: number;
    insurance_paid_2: number;
    lebens_und: number;
    insurance_other_1: number;
    insurance_other_2: number;
    loan_emi: number;
    outstanding_loan_balance: number;
    other_expenses: number;
    total: number;
    created_by: string;
    created_at: string;
};

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

    const changeYear = async (value: any) => {
        setYear(value);
        const { data: salary } = await supabase
            .from("salary")
            .select("*")
            .eq("priest_id", priestId)
            .gte("month", `${value}-01-01`)
            .lte("month", `${value}-12-31`)
            .order("month", { ascending: false })
        setSalary(salary as Salary[] ?? []);
    }

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
            setLoadingData(false);
        };

        load();
    }, [priestId, user, loading, router]);

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
                                                        <span className="text-xs">€ {s.amount}</span>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>

                                            <AccordionContent className="p-2">
                                                <section className="border border-gray-200 rounded-lg">
                                                    <Table className="w-full">
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-3/4">Item</TableHead>
                                                                <TableHead className="text-left">Amount</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            <TableRow>
                                                                <TableCell >Salary Paid</TableCell>
                                                                <TableCell className="text-left">€ {s.salary_paid}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >House Rent Paid</TableCell>
                                                                <TableCell className="text-left">€ {s.house_rent_paid}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >Insurance Paid</TableCell>
                                                                <TableCell className="text-left">€ {s.insurance_paid}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >Health</TableCell>
                                                                <TableCell className="text-left">€ {s.health}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >Vehcle Insurance</TableCell>
                                                                <TableCell className="text-left">€ {s.vehicle_insurance}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >KFZ Unfall & private</TableCell>
                                                                <TableCell className="text-left">€ {s.kfz_unfall_private}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >Insurance Paid</TableCell>
                                                                <TableCell className="text-left">€ {s.insurance_paid_2}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >Lebens- und </TableCell>
                                                                <TableCell className="text-left">€ {s.lebens_und}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >Insurance other 1</TableCell>
                                                                <TableCell className="text-left">€ {s.insurance_other_1}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >Insurance other 2</TableCell>
                                                                <TableCell className="text-left">€ {s.insurance_other_2}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >Loan EMI</TableCell>
                                                                <TableCell className="text-left">€ {s.loan_emi}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >Outstanding Loan Balance</TableCell>
                                                                <TableCell className="text-left">€ {s.outstanding_loan_balance}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >Other Expenses</TableCell>
                                                                <TableCell className="text-left">€ {s.other_expenses}</TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                        <TableFooter>
                                                            <TableRow>
                                                                <TableCell >Total</TableCell>
                                                                <TableCell className="text-left">€ {s.amount}</TableCell>
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
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
