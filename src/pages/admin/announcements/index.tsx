import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnnCommon from "./ann-common";
import AnnIndividual from "./ann-individual";
import { useTranslation } from "@/i18n/languageContext";

export default function AdminAnnouncements() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 space-y-4 bg-gradient-to-b from-[#f3e7e9] to-[#e3eeff] rounded-lg p-4 min-h-[calc(100vh-9.5rem)]">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">
        {t("adminAnnouncements.title")}
      </h1>

      <Tabs
        defaultValue="common"
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="common">{t("adminAnnouncements.common")}</TabsTrigger>
          <TabsTrigger value="individual">{t("adminAnnouncements.individual")}</TabsTrigger>
        </TabsList>

        <TabsContent value="common">
          <AnnCommon />
        </TabsContent>

        <TabsContent value="individual">
          <AnnIndividual />
        </TabsContent>
      </Tabs>
    </div>
  );
}
