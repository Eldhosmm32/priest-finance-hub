import Footer from "@/components/ui/footer";
import Logo from "@/components/ui/logo";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage, useTranslation } from "../i18n/languageContext";
import { supabase } from "../lib/supabaseClient";

export default function ForgotPassword() {
	const router = useRouter();

	const { t } = useTranslation();
	const { language, setLanguage } = useLanguage();

	const [email, setEmail] = useState("");
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMessage(null);

		if (!email || !oldPassword || !newPassword || !confirmPassword) {
			const text = t("priestPassword.enterAllFields") || "Please fill in all fields";
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

		if (oldPassword === newPassword) {
			const text = t("priestPassword.newPasswordDifferent") || "New password must be different from old password";
			setMessage(text);
			showToast(text, "error");
			return;
		}

		setLoading(true);

		try {
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email,
				password: oldPassword,
			});

			if (signInError) {
				setLoading(false);
				const text = t("priestPassword.incorrectOldPassword") || "Current password is incorrect";
				setMessage(text);
				showToast(text, "error");
				return;
			}

			const { error: updateError } = await supabase.auth.updateUser({
				password: newPassword,
			});

			setLoading(false);

			if (updateError) {
				const text = updateError.message || t("priestPassword.failedToUpdate");
				setMessage(text);
				showToast(text, "error");
				return;
			}

			setEmail("");
			setOldPassword("");
			setNewPassword("");
			setConfirmPassword("");

			const successText = t("priestPassword.passwordUpdated") || "Password updated successfully";
			setMessage(successText);
			showToast(successText, "success");

			setTimeout(() => {
				router.push("/login");
			}, 1200);
		} catch (err: any) {
			setLoading(false);
			const text = err?.message || t("priestPassword.failedToUpdate");
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
			<header className="h-[3.6rem] px-4 bg-white/50 backdrop-blur-sm">
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
				<div className="w-full max-w-md bg-gray-50/50 backdrop-blur-lg rounded-xl shadow-sm p-6">
					<h1 className="text-xl font-semibold text-gray-800 mb-2">
						{t("priestPassword.changePassword")}
					</h1>
					{message && (
						<div className={`text-sm mb-3 ${message.includes("success") || message === t("priestPassword.passwordUpdated") ? "text-green-700" : "text-gray-700"}`}>
							{message}
						</div>
					)}
					<form onSubmit={handleSubmit} className="space-y-3">
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
						<div className="form-control">
							<label className="label">
								<span className="label-text text-xs">{t("priestPassword.oldPassword")}</span>
							</label>
							<input
								type="password"
								className="input input-bordered w-full"
								value={oldPassword}
								onChange={(e) => setOldPassword(e.target.value)}
								required
							/>
						</div>
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
							className="btn btn-primary w-full mt-2"
							type="submit"
							disabled={loading}
						>
							{loading ? t("common.saving") : t("priestPassword.changePassword")}
						</button>
					</form>

					<button
						className="link link-primary text-xs mt-4"
						onClick={() => router.push("/login")}
					>
						{t("signup.already")} <span className="text-indigo-600"> {t("signup.login")}</span>
					</button>
				</div>
			</div>

			<Footer />
		</>
	);
}
