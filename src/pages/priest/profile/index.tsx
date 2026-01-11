import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Mail, Phone, PencilIcon, FileText, Globe, Building2, CreditCard, CalendarDays, ArrowLeft } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useUser } from "../../../hooks/useUser";
import { supabase } from "../../../lib/supabaseClient";
import { useUserDetails } from "../../../components/PriestLayout";
import { useTranslation } from "../../../i18n/languageContext";

type ExtendedProfile = {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    address: string | null;
    photo: string | null;
    date_of_birth?: string | null;
    province?: string | null;
    diocese?: string | null;
    visa_number?: string | null;
    visa_category?: string | null;
    visa_expiry_date?: string | null;
    passport_number?: string | null;
};

export default function PriestProfile() {
    const { user, loading } = useUser();
    const { userDetails } = useUserDetails();
    const router = useRouter();
    const { t } = useTranslation();
    const [profileData, setProfileData] = useState<ExtendedProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state for editing
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

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace("/login");
            return;
        }

        const fetchProfile = async () => {
            setLoadingProfile(true);
            try {
                // Fetch from profiles table
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .maybeSingle();

                // Fetch from priests table if it exists
                const { data: priestData } = await supabase
                    .from("priests")
                    .select("*")
                    .eq("id", user.id)
                    .maybeSingle();

                // Merge the data - profile fields from profiles table, detailed info from priests table
                const mergedData: ExtendedProfile = {
                    id: profileData?.id ?? user.id,
                    email: profileData?.email ?? user.email ?? null,
                    full_name: profileData?.full_name ?? user.full_name ?? null,
                    phone: priestData?.phone ?? null,
                    address: priestData?.address ?? null,
                    photo: priestData?.photo ?? profileData?.photo ?? null,
                    date_of_birth: priestData?.date_of_birth ?? null,
                    province: priestData?.province ?? null,
                    diocese: priestData?.diocese ?? null,
                    visa_number: priestData?.visa_number ?? null,
                    visa_category: priestData?.visa_category ?? null,
                    visa_expiry_date: priestData?.visa_expiry_date ?? null,
                    passport_number: priestData?.passport_number ?? null,
                };

                setProfileData(mergedData);
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [user, loading, router]);

    // Fetch profile data when opening edit modal
    const handleOpenEdit = async () => {
        setOpen(true);
        setError(null);

        // Fetch current data from priests table
        if (user?.id) {
            try {
                const { data: priestData } = await supabase
                    .from("priests")
                    .select("*")
                    .eq("id", user.id)
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
                setError(t("priestProfile.failedToLoadProfile"));
            }
        }
    };

    const handleCloseEdit = () => {
        setOpen(false);
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

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

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

            // Check if record exists in priests table
            const { data: existingRecord } = await supabase
                .from("priests")
                .select("id")
                .eq("id", user.id)
                .maybeSingle();

            if (existingRecord) {
                // Update existing record
                const { error: updateError } = await supabase
                    .from("priests")
                    .update(updateData)
                    .eq("id", user.id);

                if (updateError) throw updateError;
            } else {
                // Insert new record
                const { error: insertError } = await supabase
                    .from("priests")
                    .insert({
                        id: user.id,
                        ...updateData,
                    });

                if (insertError) throw insertError;
            }

            // Refresh profile data
            const fetchProfile = async () => {
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .maybeSingle();

                const { data: priestData } = await supabase
                    .from("priests")
                    .select("*")
                    .eq("id", user.id)
                    .maybeSingle();

                const mergedData: ExtendedProfile = {
                    id: profileData?.id ?? user.id,
                    email: profileData?.email ?? user.email ?? null,
                    full_name: profileData?.full_name ?? user.full_name ?? null,
                    phone: profileData?.phone ?? null,
                    address: priestData?.address ?? null,
                    photo: priestData?.photo ?? profileData?.photo ?? null,
                    date_of_birth: priestData?.date_of_birth ?? null,
                    province: priestData?.province ?? null,
                    diocese: priestData?.diocese ?? null,
                    visa_number: priestData?.visa_number ?? null,
                    visa_category: priestData?.visa_category ?? null,
                    visa_expiry_date: priestData?.visa_expiry_date ?? null,
                    passport_number: priestData?.passport_number ?? null,
                };

                setProfileData(mergedData);
            };

            await fetchProfile();
            handleCloseEdit();
        } catch (err: any) {
            console.error("Error updating profile:", err);
            setError(err.message || t("priestProfile.failedToUpdateProfile"));
        } finally {
            setSaving(false);
        }
    };

    if (loading || loadingProfile || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-500">
                {t("common.loading")}
            </div>
        );
    }

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return "—";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        } catch {
            return dateString;
        }
    };

    const ProfileField = ({
        icon,
        label,
        value,
    }: {
        icon: React.ReactNode;
        label: string;
        value: string | null | undefined;
    }) => {
        const displayValue = value && value !== "—" ? value : t("common.notProvided");
        return (
            <div className="flex items-start gap-3 py-2">
                <div className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0">
                    {icon}
                </div>
                <div className="flex flex-col gap-1 flex-1">
                    <span className="text-xs font-medium text-muted-foreground capitalize tracking-wide">
                        {label}
                    </span>
                    <span className={`text-lg ${value && value !== "—" ? "text-foreground" : "text-muted-foreground italic"}`}>
                        {displayValue}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">


            <div className="w-full max-w-4xl mx-auto">
                <div className="flex items-center gap-2 cursor-pointer mb-4" onClick={() => router.push("/priest/dashboard")} >
                    <ArrowLeft className="text-black-600 h-6 w-6" />

                    <h1 className="text-xl font-semibold">{t("priestProfile.dashboard")}</h1>
                </div>
                <Card>
                    <CardContent className="p-6 relative">
                        <div
                            className="absolute top-6 right-6 h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-colors"
                            onClick={handleOpenEdit}
                        >
                            <PencilIcon className="text-white h-4 w-4" />
                        </div>

                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Profile Photo Section */}
                            <div className="flex flex-col items-center md:items-start gap-4 flex-shrink-0">
                                <Avatar className="h-40 w-40 border-4 border-gray-200">
                                    <AvatarImage
                                        src={profileData?.photo ?? "/priest.svg"}
                                        alt={profileData?.full_name ?? "Profile"}
                                        className="object-cover"
                                    />
                                </Avatar>
                                <div className="text-center md:text-left">
                                    <h2 className="text-xl font-semibold">
                                        {profileData?.full_name ?? userDetails?.full_name ?? user.full_name ?? "—"}
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {t("priestProfile.professionalPhoto")}
                                    </p>
                                </div>
                            </div>

                            {/* Profile Details Section */}
                            <div className="flex-1 space-y-6">
                                {/* Personal Information */}
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
                                        {t("priestProfile.personalInformation")}
                                    </h3>

                                    <ProfileField
                                        icon={<FileText className="h-5 w-5" />}
                                        label={t("priestProfile.fullName")}
                                        value={profileData?.full_name ?? userDetails?.full_name ?? user.full_name ?? null}
                                    />

                                    <ProfileField
                                        icon={<Calendar className="h-5 w-5" />}
                                        label={t("priestProfile.dateOfBirth")}
                                        value={formatDate(profileData?.date_of_birth)}
                                    />

                                    <ProfileField
                                        icon={<Mail className="h-5 w-5" />}
                                        label={t("priestProfile.email")}
                                        value={profileData?.email ?? userDetails?.email ?? user.email ?? null}
                                    />

                                    <ProfileField
                                        icon={<Phone className="h-5 w-5" />}
                                        label={t("priestProfile.phoneNumber")}
                                        value={profileData?.phone ?? null}
                                    />
                                </div>

                                {/* Address Information */}
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
                                        {t("priestProfile.addressInformation")}
                                    </h3>

                                    <ProfileField
                                        icon={<MapPin className="h-5 w-5" />}
                                        label={t("priestProfile.currentAddress")}
                                        value={profileData?.address ?? null}
                                    />
                                    
                                </div>

                                {/* Religious Information */}
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
                                        {t("priestProfile.religiousInformation")}
                                    </h3>

                                    <ProfileField
                                        icon={<Building2 className="h-5 w-5" />}
                                        label={t("priestProfile.province")}
                                        value={profileData?.province ?? null}
                                    />

                                    <ProfileField
                                        icon={<Globe className="h-5 w-5" />}
                                        label={t("priestProfile.diocese")}
                                        value={profileData?.diocese ?? null}
                                    />
                                </div>

                                {/* Visa & Passport Information */}
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
                                        {t("priestProfile.visaPassportInformation")}
                                    </h3>

                                    <ProfileField
                                        icon={<CreditCard className="h-5 w-5" />}
                                        label={t("priestProfile.visaNumber")}
                                        value={profileData?.visa_number ?? null}
                                    />

                                    <ProfileField
                                        icon={<FileText className="h-5 w-5" />}
                                        label={t("priestProfile.visaCategory")}
                                        value={profileData?.visa_category ?? null}
                                    />

                                    <ProfileField
                                        icon={<CalendarDays className="h-5 w-5" />}
                                        label={t("priestProfile.visaExpiryDate")}
                                        value={formatDate(profileData?.visa_expiry_date)}
                                    />

                                    <ProfileField
                                        icon={<FileText className="h-5 w-5" />}
                                        label={t("priestProfile.passportNumber")}
                                        value={profileData?.passport_number ?? null}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Profile Modal */}
            <Dialog open={open} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    handleCloseEdit();
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("priestProfile.editProfile")}</DialogTitle>
                    </DialogHeader>

                    {error && (
                        <div className="bg-red-50 border text-sm border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                            {error}
                            <button className="text-red-700" onClick={() => setError(null)}>×</button>
                        </div>
                    )}

                    <form onSubmit={handleUpdateProfile} >
                        <div className="p-2 mb-4 h-[calc(100vh-15rem)] overflow-y-auto space-y-4">
                            {/* Personal Information Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{t("priestProfile.personalInformation")}</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("priestProfile.dateOfBirth")}</span>
                                        <Input
                                            id="date_of_birth"
                                            type="date"
                                            value={formData.date_of_birth}
                                            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("priestProfile.profilePhotoUrl")}</span>
                                        <Input
                                            id="photo"
                                            type="url"
                                            placeholder={t("priestProfile.photoUrlPlaceholder")}
                                            value={formData.photo}
                                            onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address Information Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{t("priestProfile.addressInformation")}</h3>

                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-medium text-black-700">{t("priestProfile.currentAddress")}</span>
                                    <Input
                                        id="address"
                                        type="text"
                                        placeholder={t("priestProfile.enterCurrentAddress")}
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-medium text-black-700">{t("priestProfile.phoneNumber")}</span>
                                    <Input
                                        id="phone"
                                        type="text"
                                        placeholder={t("priestProfile.enterPhoneNumber")}
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Religious Information Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{t("priestProfile.religiousInformation")}</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("priestProfile.province")}</span>
                                        <Input
                                            id="province"
                                            type="text"
                                            placeholder={t("priestProfile.enterProvince")}
                                            value={formData.province}
                                            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("priestProfile.diocese")}</span>
                                        <Input
                                            id="diocese"
                                            type="text"
                                            placeholder={t("priestProfile.enterDiocese")}
                                            value={formData.diocese}
                                            onChange={(e) => setFormData({ ...formData, diocese: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Visa & Passport Information Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{t("priestProfile.visaPassportInformation")}</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("priestProfile.visaNumber")}</span>
                                        <Input
                                            id="visa_number"
                                            type="text"
                                            placeholder={t("priestProfile.enterVisaNumber")}
                                            value={formData.visa_number}
                                            onChange={(e) => setFormData({ ...formData, visa_number: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("priestProfile.visaCategory")}</span>
                                        <Input
                                            id="visa_category"
                                            type="text"
                                            placeholder={t("priestProfile.enterVisaCategory")}
                                            value={formData.visa_category}
                                            onChange={(e) => setFormData({ ...formData, visa_category: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("priestProfile.visaExpiryDate")}</span>
                                        <Input
                                            id="visa_expiry_date"
                                            type="date"
                                            value={formData.visa_expiry_date}
                                            onChange={(e) => setFormData({ ...formData, visa_expiry_date: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium text-black-700">{t("priestProfile.passportNumber")}</span>
                                        <Input
                                            id="passport_number"
                                            type="text"
                                            placeholder={t("priestProfile.enterPassportNumber")}
                                            value={formData.passport_number}
                                            onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
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
                                {saving ? t("common.saving") : t("priestProfile.saveChanges")}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
