import { useEffect } from "react";
import Loader from "@/components/ui/loader";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/router";
import { useTranslation } from "@/i18n/languageContext";
import ComingSoon from "@/components/ui/coming-soon";



export default function AdminDiocese() {
const { user, loading } = useUser();
	const router = useRouter();
	const { t } = useTranslation();
	useEffect(() => {
		if (loading) return;
		if (!user) {
			router.replace("/login");
			return;
		}
	}, [user, loading]);

	return (
		<>
			{loading ? <Loader /> : (
				<div className="space-y-4">
					<h1 className="text-2xl font-semibold text-gray-800 mb-2">{t("adminDiocese.title")}</h1>

					<ComingSoon />
				</div>
			)}
		</>
	);
}
