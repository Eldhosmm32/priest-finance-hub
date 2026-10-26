import Footer from "@/components/ui/footer";
import Logo from "@/components/ui/logo";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage, useTranslation } from "../i18n/languageContext";
import { supabase } from "../lib/supabaseClient";

export default function ForgotPassword() {
	const { t } = useTranslation();
	const { language, setLanguage } = useLanguage();

	const [email, setEmail] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleResetPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setMessage(null);

		if (!email) {
			const text = t("forgotPassword.enterEmail") || "Please enter your email";
			setMessage(text);
			showToast(text, "error");
			return;
		}

		setLoading(true);

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: window.location.origin + "/reset-password", // Redirect to a new page to set the new password
			});

			setLoading(false);

			if (error) {
				const text = error.message || t("forgotPassword.failedToSendResetEmail");
				setMessage(text);
				showToast(text, "error");
				return;
			}

			const successText =
				t("forgotPassword.resetEmailSent") ||
				"Password reset email sent. Check your inbox!";
			setMessage(successText);
			showToast(successText, "success");
		} catch (err: any) {
			setLoading(false);
			const text = err?.message || t("forgotPassword.failedToSendResetEmail");
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
						{t("forgotPassword.title") || "Forgot Password"}
					</h1>
					{message && (
						<div
							className={`text-sm mb-3 ${
								message.includes("success") ||
								message === t("forgotPassword.resetEmailSent")
									? "text-green-700"
									: "text-gray-700"
							}`}
						>
							{message}
						</div>
					)}
					<form onSubmit={handleResetPassword} className="space-y-3">
						<div className="form-control">
							<label className="label">
								<span className="label-text text-xs">{t("common.email")}</span>
							</label>
							<input
								type="email"
								className="input input-bordered w-full"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>
						<button
							className="btn w-full mt-2"
							type="submit"
							disabled={loading}
						>
							{loading
								? t("common.sending")
								: t("forgotPassword.sendResetEmail")}
						</button>
					</form>
				</div>
			</div>

			<Footer />
		</>
	);
}
