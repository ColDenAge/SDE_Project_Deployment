import React, { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Dumbbell, List, Calendar, CreditCard, Wallet } from "lucide-react";
import MembersTab from "./MembersTab";
import GymsTab from "./GymsTab";
import AmenitiesTab from "./AmenitiesTab";
import ClassesTab from "./ClassesTab";
import MembershipPlansTab from "./MembershipPlansTab";
import { GcashSettings } from "./GcashSettings";
import { SearchProvider } from "./SearchContext";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Gym } from "./types/gymTypes";

interface GymManagementTabsProps {
  userRole?: string;
  gyms: Gym[];
}

const GymManagementTabs: React.FC<GymManagementTabsProps> = ({ userRole, gyms }) => {
  const [activeTab, setActiveTab] = useState<string>("members");
  const [selectedGym, setSelectedGym] = useState<any>(null);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleGcashSave = (gcashNumber: string) => {
    // Here you would typically update the gym's GCash number in your backend
    console.log("Saving GCash number:", gcashNumber);
  };

  const handleMemberAcceptance = async (gymId: string) => {
    const gymRef = doc(db, 'gyms', gymId);
    await updateDoc(gymRef, { members: increment(1) });
  };

  console.log("GYMS STATE:", gyms);

  return (
    <SearchProvider>
      <Card>
        <CardHeader className="px-6 pt-6 pb-3">
          <Tabs defaultValue="members" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full md:w-auto grid-cols-3 md:grid-cols-3 md:inline-flex h-auto">
              <TabsTrigger
                value="members"
                className={`px-4 py-2 ${activeTab === "members" ? "bg-blue-500 text-white" : ""}`}
              >
                <Users className="h-4 w-4 mr-2 hidden md:inline" />
                Members
              </TabsTrigger>
              <TabsTrigger
                value="amenities"
                className={`px-4 py-2 ${activeTab === "amenities" ? "bg-blue-500 text-white" : ""}`}
              >
                <List className="h-4 w-4 mr-2 hidden md:inline" />
                Amenities
              </TabsTrigger>
              <TabsTrigger
                value="membership-plans"
                className={`px-4 py-2 ${activeTab === "membership-plans" ? "bg-blue-500 text-white" : ""}`}
              >
                <CreditCard className="h-4 w-4 mr-2 hidden md:inline" />
                Plans
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="pt-4">
              <MembersTab />
            </TabsContent>

            <TabsContent value="gyms" className="pt-4">
              <GymsTab userRole={userRole} gyms={gyms} />
            </TabsContent>

            <TabsContent value="amenities" className="pt-4">
              <AmenitiesTab gymId={selectedGym?.id} />
            </TabsContent>

            <TabsContent value="membership-plans" className="mt-4">
              <MembershipPlansTab gymId={selectedGym?.id} />
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </SearchProvider>
  );
};

export default GymManagementTabs;
