import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useUser } from "../../hooks/useUser";
import { supabase } from "../../lib/supabaseClient";
import { useTranslation } from "../../i18n/languageContext";
import { toast } from "sonner";
import Loader from "@/components/ui/loader";

export default function PriestPasswordChange() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
  }, [user, loading, router]);

  const showToast = (message: string, type: "success" | "error") => {
    toast[type](message, {
      position: "top-center",
      style: {
        backgroundColor: type === "success" ? "#4ade80" : "#f87171",
        color: "#fff",
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError(t("priestPassword.enterAllFields"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("errors.passwordsMismatch"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("priestPassword.passwordMinLength"));
      return;
    }

    if (oldPassword === newPassword) {
      setError(t("priestPassword.newPasswordDifferent"));
      return;
    }

    if (!user?.email) {
      setError(t("priestPassword.unableToGetEmail"));
      return;
    }

    setLoadingState(true);

    try {
      // Verify old password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (signInError) {
        setLoadingState(false);
        setError(t("priestPassword.incorrectOldPassword"));
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setLoadingState(false);
        setError(updateError.message || t("priestPassword.failedToUpdate"));
        return;
      }

      // Success
      setLoadingState(false);
      showToast(t("priestPassword.passwordUpdated"), "success");

      // Reset form
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Optionally redirect after a delay
      setTimeout(() => {
        router.push("/priest/dashboard");
      }, 1500);
    } catch (err: any) {
      setLoadingState(false);
      setError(err.message || t("priestPassword.failedToUpdate"));
    }
  };

  if (loading) {
    return (
      <Loader />
    );
  }

  return (
    <div className="space-y-6">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center gap-1 cursor-pointer bg-white p-2 rounded-t-lg" onClick={() => router.push("/priest/dashboard")} >
          <ArrowLeft className="text-black-600 h-4 w-4" />
          <h1 className="text-sm font-semibold">{t("common.dashboard")}</h1>
        </div>

        <div className="rounded-b-lg bg-white p-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
               <span className="text-lg font-semibold">{t("priestPassword.changePassword")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border text-sm border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                    {error}
                    <button
                      type="button"
                      className="text-red-700"
                      onClick={() => setError(null)}
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label htmlFor="oldPassword">{t("priestPassword.oldPassword")}</Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder={t("priestPassword.enterOldPassword")}
                    required
                    disabled={loadingState}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="newPassword">{t("priestPassword.newPassword")}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("priestPassword.enterNewPassword")}
                    required
                    disabled={loadingState}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("priestPassword.passwordRequirements")}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirmPassword">{t("priestPassword.confirmPassword")}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("priestPassword.reenterNewPassword")}
                    required
                    disabled={loadingState}
                    className="w-full"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/priest/dashboard")}
                    disabled={loadingState}
                    className="flex-1"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loadingState}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {loadingState ? t("common.saving") : t("priestPassword.changePassword")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
