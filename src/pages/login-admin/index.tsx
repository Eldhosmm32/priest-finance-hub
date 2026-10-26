import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage, useTranslation } from "../../i18n/languageContext";
import Logo from "../../components/ui/logo";
import Footer from "../../components/ui/footer";

export default function Login() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const { language, setLanguage } = useLanguage();
	const { t } = useTranslation();
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		// 1) Sign in
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error) {
			setLoading(false);
			setError(error.message);
			return;
		}

		// 2) Get the logged-in user
		const { data: userData, error: userError } = await supabase.auth.getUser();
		if (userError || !userData.user) {
			setLoading(false);
			setError(t("errors.unableToLoadUser"));
			return;
		}

		const userId = userData.user.id;

		// 3) Fetch profile to get role
		const { data: profile, error: profileError } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", userId)
			.maybeSingle();

		setLoading(false);

		if (profileError || !profile) {
			setError(t("errors.profileNotFound"));
			return;
		}

		// 4) Redirect based on role
		if (profile.role === "admin") {
			router.push("/admin/home");
		} else {
			router.push("/priest/dashboard");
		}
	};
// border-b-2 border-[#c9a84c]
	return (
	<div>
		<header className="h-[3.6rem] bg-[#1b3a6b] backdrop-blur-sm">
			<div className="german-strip"></div>
			<div className="flex items-center h-full justify-between m-auto max-w-7xl">
				<Logo className="text-white" />
				<div className="bg-white rounded-full flex gap-2 px-4">
					<select
						value={language}
						onChange={(e) =>
							setLanguage(e.target.value === "de" ? "de" : "en")
						}
						className="rounded-md text-sm font-semibold bg-white h-[2.15rem]"
					>
						<option value="en">{t("common.language.en")}</option>
						<option value="de">{t("common.language.de")}</option>
					</select>
				</div>
			</div>
		</header>

		<div className="h-[calc(100vh-6.10rem)] flex items-center justify-center px-4">

			<div className="w-full max-w-sm bg-white rounded-sm shadow-sm p-8">
				<h1 className="text-2xl font-semibold text-gray-800 mb-1">
					Admin {t("login.title")}
				</h1>

				{error && <div className="text-sm text-red-600 mb-3">{error}</div>}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="form-control">
						<label className="label-text text-xs">{t("common.email")}</label>
						<input
							id="email"
							type="email"
							className="input input-ghost input-bordered w-full"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>
					<div className="form-control pb-2">
						<label className="label">
							<span className="label-text text-xs">
								{t("common.password")}
							</span>
						</label>
						<input
							type="password"
							className="input input-bordered w-full"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>

					<button
						className="btn w-full"
						type="submit"
						disabled={loading}
					>
						{loading ? t("login.button") + "…" : t("login.button")}
					</button>
				</form>


			</div>
		</div>

		<Footer className="bg-[#1b3a6b] text-white" />
	</div>
	);
}
