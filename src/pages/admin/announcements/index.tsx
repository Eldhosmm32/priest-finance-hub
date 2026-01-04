import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnnCommon from "./ann-common";
import AnnIndividual from "./ann-individual";

export default function AdminAnnouncements() {
  return (
    <div className="flex-1 space-y-2">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">
        Announcements
      </h1>

      <Tabs
        defaultValue="common"
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="common">Common</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
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
