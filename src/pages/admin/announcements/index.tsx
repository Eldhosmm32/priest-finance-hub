import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnnCommon from "./ann-common";
import AnnIndividual from "./ann-individual";
import { useTranslation } from "@/i18n/languageContext";

export default function AdminAnnouncements() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">
        {t("adminAnnouncements.title")}
      </h1>

      <Tabs
        defaultValue="common"
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="common">{t("adminAnnouncements.common.title")}</TabsTrigger>
          <TabsTrigger value="individual">{t("adminAnnouncements.individual.title")}</TabsTrigger>
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
