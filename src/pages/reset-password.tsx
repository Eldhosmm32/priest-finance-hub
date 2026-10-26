import Footer from "@/components/ui/footer";
import Logo from "@/components/ui/logo";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLanguage, useTranslation } from "../i18n/languageContext";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
	const router = useRouter();
	const { t } = useTranslation();
	const { language, setLanguage } = useLanguage();

	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		// Check for access_token in the URL after redirection from the email
		const { access_token, type } = router.query;
		if (access_token && type === "recovery") {
			supabase.auth.setSession({
				access_token: access_token as string,
				refresh_token: "", // Not strictly needed for password reset flow
			});
		}
	}, [router.query]);

	const handleSetNewPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setMessage(null);

		if (!newPassword || !confirmPassword) {
			const text = t("resetPassword.enterNewPassword") || "Please enter your new password";
			setMessage(text);
			showToast(text, "error");
			return;
		}

		if (newPassword !== confirmPassword) {
			const text = t("errors.passwordsMismatch") || "Passwords do not match";
			setMessage(text);
			showToast(text, "error");
			return;
		}

		if (newPassword.length < 6) {
			const text = t("priestPassword.passwordMinLength") || "Password must be at least 6 characters";
			setMessage(text);
			showToast(text, "error");
			return;
		}

		setLoading(true);

		try {
			const { error } = await supabase.auth.updateUser({
				password: newPassword,
			});

			setLoading(false);

			if (error) {
				const text = error.message || t("resetPassword.failedToUpdatePassword");
				setMessage(text);
				showToast(text, "error");
				return;
			}

			setNewPassword("");
			setConfirmPassword("");

			const successText = t("resetPassword.passwordUpdated") || "Password updated successfully";
			setMessage(successText);
			showToast(successText, "success");

			setTimeout(() => {
				router.push("/login-priest");
			}, 1200);
		} catch (err: any) {
			setLoading(false);
			const text = err?.message || t("resetPassword.failedToUpdatePassword");
			setMessage(text);
			showToast(text, "error");
		}
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

	return (
		<>
			<header className="h-[3.6rem] px-4 bg-white">
				<div className="flex items-center h-full justify-between m-auto max-w-6xl">
					<Logo />
					<div className="bg-white rounded-full flex gap-2 px-3">
						<select
							value={language}
							onChange={(e) =>
								setLanguage(e.target.value === "de" ? "de" : "en")
							}
							className="rounded-md text-sm font-semibold bg-white h-[2.5rem]"
						>
							<option value="en">{t("common.language.en")}</option>
							<option value="de">{t("common.language.de")}</option>
						</select>
					</div>
				</div>
			</header>

			<div className="h-[calc(100vh-6.10rem)] flex items-center justify-center px-4">
				<div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6">
					<h1 className="text-xl font-semibold text-gray-800 mb-2">
						{t("resetPassword.title") || "Set New Password"}
					</h1>
					{message && (
						<div
							className={`text-sm mb-3 ${
								message.includes("success") ||
								message === t("resetPassword.passwordUpdated")
									? "text-green-700"
									: "text-gray-700"
							}`}
						>
							{message}
						</div>
					)}
					<form onSubmit={handleSetNewPassword} className="space-y-3">
						<div className="form-control">
							<label className="label">
								<span className="label-text text-xs">{t("priestPassword.newPassword")}</span>
							</label>
							<input
								type="password"
								className="input input-bordered w-full"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								required
							/>
						</div>
						<div className="form-control">
							<label className="label">
								<span className="label-text text-xs">{t("priestPassword.confirmPassword")}</span>
							</label>
							<input
								type="password"
								className="input input-bordered w-full"
								value={confirmPassword}

								onChange={(e) => setConfirmPassword(e.target.value)}
								required
							/>
						</div>
						<button
							className="btn w-full mt-2"
							type="submit"
							disabled={loading}
						>
							{loading ? t("common.saving") : t("resetPassword.setNewPassword")}
						</button>
					</form>
				</div>
			</div>

			<Footer />
		</>
	);
}
