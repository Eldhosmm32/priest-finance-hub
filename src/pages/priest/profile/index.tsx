import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Mail, Phone, PencilIcon, FileText, Globe, Building2, CreditCard, CalendarDays, ArrowLeft, CameraIcon, X } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useUser } from "../../../hooks/useUser";
import { supabase } from "../../../lib/supabaseClient";
import { useUserDetails } from "../../../components/PriestLayout";
import { useTranslation } from "../../../i18n/languageContext";
import Loader from "@/components/ui/loader";
import { toast } from "sonner";

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
    const [openEditPhoto, setOpenEditPhoto] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
            <div className="w-full max-w-2xl mx-auto">
                <Loader />
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

    const handleOpenEditPhoto = async () => {
        setOpenEditPhoto(true);
        setPhotoError(null);
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const handleCloseEditPhoto = () => {
        setOpenEditPhoto(false);
        setPhotoError(null);
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setPhotoError(t("priestProfile.invalidImageType") || "Please select a valid image file");
            return;
        }

        // Validate file size (5MB = 5 * 1024 * 1024 bytes)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setPhotoError(t("priestProfile.imageTooLarge") || "Image size must be less than 5MB");
            return;
        }

        setSelectedFile(file);
        setPhotoError(null);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUploadPhoto = async () => {
        if (!selectedFile || !user?.id) return;

        setUploadingPhoto(true);
        setPhotoError(null);

        try {
            // Store current photo URL before it gets shadowed by local variable
            const currentPhotoUrl = profileData?.photo;

            // Delete old photo from storage if it exists in ProfilePics bucket
            if (currentPhotoUrl) {
                try {
                    // Extract filename from URL if it's from ProfilePics bucket
                    // Check if URL contains ProfilePics bucket reference
                    if (currentPhotoUrl.includes('ProfilePics/')) {
                        // Extract filename from various URL formats
                        let oldFileName = '';
                        if (currentPhotoUrl.includes('/storage/v1/object/public/ProfilePics/')) {
                            oldFileName = currentPhotoUrl.split('/ProfilePics/')[1]?.split('?')[0] || '';
                        } else if (currentPhotoUrl.includes('/ProfilePics/')) {
                            oldFileName = currentPhotoUrl.split('/ProfilePics/')[1]?.split('?')[0] || '';
                        }

                        if (oldFileName) {
                            await supabase.storage
                                .from('ProfilePics')
                                .remove([oldFileName]);
                        }
                    }
                } catch (deleteError) {
                    // Log but don't fail the upload if deletion fails
                    console.warn("Failed to delete old photo:", deleteError);
                }
            }

            // Generate unique filename
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase storage
            const { error: uploadError } = await supabase.storage
                .from('ProfilePics')
                .upload(filePath, selectedFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('ProfilePics')
                .getPublicUrl(filePath);

            if (!urlData?.publicUrl) {
                throw new Error("Failed to get public URL");
            }

            const photoUrl = urlData.publicUrl;

            // Update only the photo field in priests table
            const { data: existingRecord } = await supabase
                .from("priests")
                .select("id")
                .eq("id", user.id)
                .maybeSingle();

            if (existingRecord) {
                // Update only photo field
                const { error: updateError } = await supabase
                    .from("priests")
                    .update({ photo: photoUrl })
                    .eq("id", user.id);

                if (updateError) throw updateError;
            } else {
                // Insert new record with only photo
                const { error: insertError } = await supabase
                    .from("priests")
                    .insert({
                        id: user.id,
                        photo: photoUrl,
                    });

                if (insertError) throw insertError;
            }

            // Update only the photo in local state
            if (profileData) {
                setProfileData({
                    ...profileData,
                    photo: photoUrl,
                });
            }

            toast.success(t("priestProfile.photoUpdated") || "Profile photo updated successfully", {
                position: "top-center",
                style: {
                    backgroundColor: "#4ade80",
                    color: "#fff",
                },
            });

            handleCloseEditPhoto();
        } catch (err: any) {
            console.error("Error uploading photo:", err);
            setPhotoError(err.message || t("priestProfile.failedToUploadPhoto") || "Failed to upload photo");
        } finally {
            setUploadingPhoto(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="w-full max-w-6xl mx-auto">
                <div className="flex items-center gap-1 cursor-pointer bg-white p-2 rounded-t-none md:rounded-t-lg" onClick={() => router.push("/priest/dashboard")} >
                    <ArrowLeft className="text-black-600 h-4 w-4" />
                    <h1 className="text-sm font-semibold">{t("common.dashboard")}</h1>
                </div>

                <div className="rounded-b-none md:rounded-b-lg bg-white p-2 pt-0">
                    <Card >
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-8">
                                {/* Profile Photo Section */}
                                <div className="flex flex-col items-center md:items-start gap-4 flex-shrink-0 relative h-fit">
                                    <Avatar className="h-60 w-60 md:h-40 md:w-40 border-4 border-gray-200">
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
                                    </div>
                                    <div
                                        className="absolute bottom-12 right-0 h-8 w-8 md:h-6 md:w-6 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-colors"
                                        onClick={handleOpenEditPhoto}
                                    >
                                        <CameraIcon className="text-white h-4 w-4 md:h-3 md:w-3" />
                                    </div>
                                </div>

                                {/* Profile Details Section */}
                                <div className="flex-1 space-y-6">
                                    {/* Personal Information */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2 relative">
                                            {t("common.personalInformation")}
                                            <div
                                                className="absolute top-0 right-0 h-8 w-8 md:h-6 md:w-6 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-colors"
                                                onClick={handleOpenEdit}
                                            >
                                                <PencilIcon className="text-white h-4 w-4 md:h-3 md:w-3" />
                                            </div>
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <ProfileField
                                                icon={<FileText className="h-5 w-5" />}
                                                label={t("common.fullName")}
                                                value={profileData?.full_name ?? userDetails?.full_name ?? user.full_name ?? null}
                                            />

                                            <ProfileField
                                                icon={<Calendar className="h-5 w-5" />}
                                                label={t("common.dateOfBirth")}
                                                value={formatDate(profileData?.date_of_birth)}
                                            />

                                            <ProfileField
                                                icon={<Mail className="h-5 w-5" />}
                                                label={t("common.email")}
                                                value={profileData?.email ?? userDetails?.email ?? user.email ?? null}
                                            />

                                            <ProfileField
                                                icon={<Phone className="h-5 w-5" />}
                                                label={t("common.phoneNumber")}
                                                value={profileData?.phone ?? null}
                                            />
                                        </div>
                                    </div>

                                    {/* Address Information */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
                                            {t("common.addressInformation")}
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <ProfileField
                                                icon={<MapPin className="h-5 w-5" />}
                                                label={t("common.currentAddress")}
                                                value={profileData?.address ?? null}
                                            />
                                        </div>
                                    </div>

                                    {/* Religious Information */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
                                            {t("common.religiousInformation")}
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <ProfileField
                                                icon={<Building2 className="h-5 w-5" />}
                                                label={t("common.province")}
                                                value={profileData?.province ?? null}
                                            />

                                            <ProfileField
                                                icon={<Globe className="h-5 w-5" />}
                                                label={t("common.diocese")}
                                                value={profileData?.diocese ?? null}
                                            />
                                        </div>
                                    </div>

                                    {/* Visa & Passport Information */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
                                            {t("common.visaPassportInformation")}
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <ProfileField
                                                icon={<CreditCard className="h-5 w-5" />}
                                                label={t("common.visaNumber")}
                                                value={profileData?.visa_number ?? null}
                                            />

                                            <ProfileField
                                                icon={<FileText className="h-5 w-5" />}
                                                label={t("common.visaCategory")}
                                                value={profileData?.visa_category ?? null}
                                            />

                                            <ProfileField
                                                icon={<CalendarDays className="h-5 w-5" />}
                                                label={t("common.visaExpiryDate")}
                                                value={formatDate(profileData?.visa_expiry_date)}
                                            />

                                            <ProfileField
                                                icon={<FileText className="h-5 w-5" />}
                                                label={t("common.passportNumber")}
                                                value={profileData?.passport_number ?? null}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
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
                        <div className="p-2 mb-4 h-[calc(100vh-15rem)] overflow-y-auto space-y-4 thin-scroll">
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
                                size='sm'
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700"
                                disabled={saving}
                                size='sm'
                            >
                                {saving ? t("common.saving") : t("priestProfile.saveChanges")}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Photo Modal */}
            <Dialog open={openEditPhoto} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    handleCloseEditPhoto();
                }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("priestProfile.updateProfilePhoto") || "Update Profile Photo"}</DialogTitle>
                    </DialogHeader>

                    {photoError && (
                        <div className="bg-red-50 border text-sm border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                            {photoError}
                            <button className="text-red-700" onClick={() => setPhotoError(null)}>×</button>
                        </div>
                    )}

                    <div className="space-y-4 py-4">
                        {/* Preview Section */}
                        {previewUrl && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <Avatar className="h-40 w-40 border-4 border-gray-200">
                                        <AvatarImage
                                            src={previewUrl}
                                            alt="Preview"
                                            className="object-cover"
                                        />
                                    </Avatar>
                                </div>
                            </div>
                        )}

                        {/* File Input */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="photo-upload" className="text-sm font-medium">
                                {t("priestProfile.selectPhoto") || "Select Photo"}
                            </Label>
                            <Input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                disabled={uploadingPhoto}
                                className="cursor-pointer"
                            />
                            <p className="text-xs text-muted-foreground">
                                {t("priestProfile.maxFileSize") || "Maximum file size: 5MB"}
                            </p>
                        </div>

                        {selectedFile && (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-700">{selectedFile.name}</span>
                                    <span className="text-xs text-gray-500">
                                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setPreviewUrl(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <div className="flex justify-end gap-2 items-center w-full">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseEditPhoto}
                                disabled={uploadingPhoto}
                                size='sm'
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button
                                type="button"
                                className="bg-indigo-600 hover:bg-indigo-700"
                                onClick={handleUploadPhoto}
                                disabled={uploadingPhoto || !selectedFile}
                                size='sm'
                            >
                                {uploadingPhoto ? (t("common.uploading") || "Uploading...") : (t("common.upload") || "Upload")}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
