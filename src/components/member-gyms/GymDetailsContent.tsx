import React, { useEffect, useState, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, AlertCircle, MapPin, Phone, Mail } from "lucide-react";
import { Gym, GymClass, MembershipOption } from "./types/gymTypes";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RoleContext } from "../../router/App";

interface GymDetailsContentProps {
  gym: Gym;
  hasApplied: boolean;
  onEnrollClass: (gymClass: GymClass) => void;
  onSelectMembership: (membership: MembershipOption) => void;
}

const GymDetailsContent: React.FC<GymDetailsContentProps> = ({
  gym,
  hasApplied,
  onEnrollClass,
  onSelectMembership
}) => {
  const { toast } = useToast();
  const [amenities, setAmenities] = useState<any[]>([]);
  const { userRole } = useContext(RoleContext);

  useEffect(() => {
    const fetchAmenities = async () => {
      if (!gym?.id) return;
      try {
        const amenitiesRef = collection(db, "gyms", gym.id.toString(), "amenities");
        const snapshot = await getDocs(amenitiesRef);
        setAmenities(snapshot.docs.map(doc => doc.data()));
      } catch (error) {
        setAmenities([]);
      }
    };
    fetchAmenities();
  }, [gym?.id]);

  // General info block
  const renderGeneralInfo = () => (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-1">{gym.name}</h2>
      <div className="text-gray-500 mb-2">{gym.location}</div>
      <div className="flex flex-col gap-1 text-sm text-gray-700">
        {gym.contact && (
          <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {gym.contact}</div>
        )}
        {gym.email && (
          <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {gym.email}</div>
        )}
        {gym.address && (
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {gym.address}</div>
        )}
      </div>
    </div>
  );

  if (userRole === 'member') {
    // Only show general info and amenities for members
    return (
      <div>
        {renderGeneralInfo()}
        <h3 className="text-lg font-medium mb-2">Available Amenities</h3>
        <div className="grid grid-cols-2 gap-4">
          {amenities.length > 0 ? amenities.map((amenity, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <p className="font-medium">{amenity.name || amenity}</p>
            </div>
          )) : <p className="col-span-2 text-center text-muted-foreground">No amenities found.</p>}
        </div>
      </div>
    );
  }

  const handleEnrollClick = (gymClass: GymClass) => {
    if (!hasApplied) {
      toast({
        title: "Membership Required",
        description: "You need to have an active membership to enroll in classes.",
        variant: "destructive"
      });
      return;
    }
    onEnrollClass(gymClass);
  };

  return (
    <Tabs defaultValue="classes">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="classes">Classes</TabsTrigger>
        <TabsTrigger value="amenities">Amenities</TabsTrigger>
        <TabsTrigger value="memberships">Memberships</TabsTrigger>
      </TabsList>

      <TabsContent value="classes" className="space-y-4 py-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Available Classes</h3>
          {!hasApplied && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Membership required to enroll</span>
            </div>
          )}
        </div>
        <ScrollArea className="h-[300px] rounded-md border p-4">
          {(gym.classes ?? []).map((cls) => (
            <div key={cls.id} className="mb-4 p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{cls.name}</h4>
                  <p className="text-sm text-muted-foreground">Instructor: {cls.instructor}</p>
                  <p className="text-sm flex items-center gap-1 mt-1">
                    <CalendarIcon className="h-3 w-3" /> {cls.schedule}
                  </p>
                  <p className="text-sm mt-1">Availability: {cls.enrolled}/{cls.capacity}</p>
                </div>
                <Button
                  variant="outline"
                  className="text-[#0B294B] border-[#0B294B] hover:bg-[#0B294B]/10"
                  disabled={cls.enrolled >= cls.capacity || !hasApplied}
                  onClick={() => handleEnrollClick(cls)}
                >
                  {cls.enrolled >= cls.capacity ? "Full" : !hasApplied ? "Membership Required" : "Enroll"}
                </Button>
              </div>
            </div>
          ))}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="amenities" className="space-y-4 py-4">
        <h3 className="text-lg font-medium">Available Amenities</h3>
        <div className="grid grid-cols-2 gap-4">
          {amenities.length > 0 ? amenities.map((amenity, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <p className="font-medium">{amenity.name || amenity}</p>
            </div>
          )) : <p className="col-span-2 text-center text-muted-foreground">No amenities found.</p>}
        </div>
      </TabsContent>

      <TabsContent value="memberships" className="space-y-4 py-4">
        <h3 className="text-lg font-medium">Membership Options</h3>
        <div className="space-y-4">
          {(gym.membershipOptions ?? []).map((option) => (
            <div
              key={option.id}
              className="p-4 border rounded-lg cursor-pointer hover:border-[#0B294B] transition-colors"
              onClick={() => onSelectMembership(option)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{option.name}</h4>
                  <p className="text-sm text-muted-foreground">{option.price}</p>
                </div>
                <Button
                  variant="outline"
                  className="text-[#0B294B] border-[#0B294B] hover:bg-[#0B294B]/10"
                >
                  {hasApplied ? "Change Plan" : "Select Plan"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default GymDetailsContent;
