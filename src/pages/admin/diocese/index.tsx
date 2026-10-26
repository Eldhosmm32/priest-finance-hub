import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/i18n/languageContext";
import Loader from "@/components/ui/loader";

type PriestRow = {
	id: string;
	email: string | null;
	full_name: string | null;
	phone: string | null;
	address: string | null;
	active: boolean;
	photo: string | null;
	province: string | null;
	diocese: string | null;
};

type DioceseOption = {
	id: string;
	diocese_name: string;
};

type SalaryRow = {
	full_name: string | null;
	diocese_name: string | null;
	salary_amount: number | null;
	month: string | null;
};

export default function AdminDiocese() {
	const [dioceses, setDioceses] = useState<DioceseOption[]>([]);
	const [selectedDiocese, setSelectedDiocese] = useState<string>("");
	const [salary, setSalary] = useState<SalaryRow[]>([]);
	const [search, setSearch] = useState("");
	const { user, loading } = useUser();
	const router = useRouter();
	const { t } = useTranslation();

	const currentYear = new Date().getFullYear();
	const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
	const currentMonthDate = `${currentYear}-${currentMonth}`;

	const [startMonth, setStartMonth] = useState(currentMonthDate);
	const [endMonth, setEndMonth] = useState(currentMonthDate);
	const [totalAmount, setTotalAmount] = useState(0);

	// Load salary data
	const loadSalaryData = useCallback(async () => {
		const { data } = await supabase.rpc("get_diocese_salary", {
			p_diocese_id: selectedDiocese || null,
			p_start_month: startMonth + "-01",
			p_end_month: endMonth + "-01",
		});

		const salaryData = (data ?? []) as unknown as SalaryRow[];
		setSalary(salaryData);

		// Calculate total
		const total = salaryData.reduce(
			(sum, item) => sum + (item.salary_amount || 0),
			0,
		);
		setTotalAmount(total);
	}, [selectedDiocese, startMonth, endMonth]);

	useEffect(() => {
		if (loading) return;
		if (!user) {
			router.replace("/login-admin");
			return;
		}
		const load = async () => {
			const { data: dioceseRows } = await supabase
				.from("dioceses")
				.select("id, diocese_name");
			setDioceses(dioceseRows || []);
		};
		load();
	}, [user, loading]);
	
	// Reload data when month range changes
	useEffect(() => {
		if (!user || loading) return;
		loadSalaryData();
	}, [startMonth, endMonth, loadSalaryData, user, loading]);

	const filteredSalary = salary.filter((s) => {
		const matchesDiocese = !selectedDiocese || s.diocese_name === selectedDiocese;
		const matchesSearch = !search.trim()
			? true
			: (s.full_name ?? "").toLowerCase().includes(search.toLowerCase()) 
		return matchesDiocese && matchesSearch;
	});

	return (
		<div className="space-y-4 ">
			<h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">
				{t("adminDiocese.title")}
			</h1>
			<div className="bg-white border border-gray-200 rounded-lg px-2 py-2 flex flex-col md:flex-row justify-between md:items-end gap-2">
				<div className="flex gap-2">
					<div className="flex flex-col flex-1 md:flex-none gap-1">
						<label className="text-xs font-medium text-gray-600">
							{t("adminDiocese.searchLabel")}
						</label>
						<input
							className="input w-full md:max-w-xs"
							placeholder={t("adminDiocese.searchPlaceholder")}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>

					<div className="flex flex-col gap-1 md:w-56">
						<label className="text-xs font-medium text-gray-600">
							{t("adminDiocese.title")}
						</label>
						<select
							className="input"
							value={selectedDiocese}
							onChange={(e) => setSelectedDiocese(e.target.value)}
						>
							<option value="">All Dioceses</option>
							{dioceses.map((diocese) => (
								<option key={diocese.id} value={diocese.id}>
									{diocese.diocese_name}
								</option>
							))}
						</select>
					</div>

					<div className="flex  gap-1 md:w-56">
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-gray-600">
								{t("common.startMonth")}
							</label>
							<input
								type="month"
								className="input"
								onChange={(e) => setStartMonth(e.target.value)}
								value={startMonth}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-gray-600">
								{t("common.endMonth")}
							</label>
							<input
								type="month"
								className="input"
								onChange={(e) => setEndMonth(e.target.value)}
								value={endMonth}
							/>
						</div>
					</div>
				</div>

				<Badge className="text-xs font-medium text-white bg-green-500 w-fit">
					{salary.length} {t("adminPriests.priestsCount")}
				</Badge>
			</div>

			<div className="flex flex-col lg:flex-row gap-2">
				{/* Main Table */}
				<div className="w-full lg:w-2/3 bg-white border border-gray-200 rounded-lg overflow-x-auto p-1">
					<div className="overflow-auto rounded-lg max-h-[calc(100vh-21rem)] thin-scroll">
						<table className="min-w-full text-sm">
							<thead className="bg-gray-50 sticky top-0 z-30">
								<tr>
									<th className="px-3 py-2 text-left">{t("common.name")}</th>
									<th className="px-3 py-2 text-left">
										{t("adminDiocese.remittance")}
									</th>
								</tr>
							</thead>
							<tbody>
								{filteredSalary.map((p) => (
									<tr
										key={p.full_name}
										className="border-t border-gray-100 cursor-pointer hover:bg-gray-100"
									>
										<td className="px-3 py-2 cursor-pointer">
											<p> {p.full_name}</p>
										</td>
										<td className="px-3 py-2 ">{p.salary_amount}</td>
									</tr>
								))}

								{!filteredSalary.length && (
									<tr>
										<td
											colSpan={6}
											className="px-3 py-6 text-center text-sm text-gray-500"
										>
											{t("adminPriests.noPriestsFound")}
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* Summary Card */}
				<div className="w-full lg:w-1/3 h-fit bg-white border border-gray-200 rounded-lg">
					<div className="p-2 border-b border-gray-200">
						<h2 className="font-semibold">{t("adminSalary.salarySummary")}</h2>
					</div>
					<div className="flex flex-col gap-2 p-2">
						<p className="text-sm text-gray-500">
							{t("common.from")}{" "}
							{startMonth && endMonth
								? `${new Date(startMonth).toLocaleDateString(undefined, {
									month: "short",
									year: "numeric",
									})} - ${new Date(endMonth).toLocaleDateString(undefined, {
										month: "short",
										year: "numeric",
									})}`
								: t("common.allTime")}
						</p>
						<h1 className="font-bold text-2xl">€ {totalAmount}</h1>
					</div>
				</div>
			</div>
		</div>
	);
}
