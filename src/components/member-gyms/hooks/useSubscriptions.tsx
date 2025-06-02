import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Gym, GymClass } from "../types/gymTypes";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";

export function useSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [pendingSubscriptions, setPendingSubscriptions] = useState<any[]>([]);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedGym, setSelectedGym] = useState<null | Gym>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const fetchSubscriptions = async () => {
      try {
        // Fetch all gyms
        const gymsRef = collection(db, 'gyms');
        const gymsSnapshot = await getDocs(gymsRef);
        const gyms = gymsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as { name: string; location: string; membershipPlans?: any[] })
        }));

        // For each gym, check if user is a member
        const activeSubscriptions = [];
        const pendingSubs = [];

        for (const gym of gyms) {
          // Check members collection for active status
          const membersRef = collection(db, 'gyms', gym.id, 'members');
          const memberQuery = query(
            membersRef,
            where('memberId', '==', user.uid),
            where('status', '==', 'active') // Only active members
          );
          const memberSnapshot = await getDocs(memberQuery);

          if (!memberSnapshot.empty) {
            const memberData = memberSnapshot.docs[0].data();
            activeSubscriptions.push({
              id: memberSnapshot.docs[0].id,
              gymId: String(gym.id), // Ensure gymId is a string
              gymName: gym.name,
              membershipType: memberData.membershipType,
              startDate: memberData.joinedAt ? new Date(memberData.joinedAt).toLocaleDateString() : '-',
              nextPayment: memberData.endDate ? new Date(memberData.endDate).toLocaleDateString() : '-',
              status: 'active',
              location: gym.location,
              availablePlans: gym.membershipPlans?.map((plan: any) => ({
                id: plan.id,
                name: plan.name,
                price: plan.price,
                current: plan.name === memberData.membershipType
              })) || []
            });
          }

          // Check applications collection for pending
          const applicationsRef = collection(db, 'gyms', gym.id, 'applications');
          const appQuery = query(
            applicationsRef,
            where('memberId', '==', user.uid),
            where('status', '==', 'pending')
          );
          const appSnapshot = await getDocs(appQuery);

          if (!appSnapshot.empty) {
            const appData = appSnapshot.docs[0].data();
            pendingSubs.push({
              id: appSnapshot.docs[0].id,
              gymName: gym.name,
              membershipType: appData.membershipType,
              status: 'pending',
              location: gym.location
            });
          }
        }

        setSubscriptions(activeSubscriptions);
        setPendingSubscriptions(pendingSubs);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        toast({
          title: "Error",
          description: "Failed to load your gym memberships.",
          variant: "destructive"
        });
      }
    };

    fetchSubscriptions();
  }, [user, toast]);

  const handleManageSubscription = (subscription: any) => {
    setSelectedSubscription(subscription);
    setSelectedPlan(subscription.availablePlans.find((plan: any) => plan.current)?.id.toString() || "");
    setIsDialogOpen(true);
  };

  const handlePlanChange = (value: string) => {
    setSelectedPlan(value);
  };

  const handlePlanSubmit = async () => {
    if (!selectedSubscription || !selectedPlan || !user) return;

    try {
      const planName = selectedSubscription.availablePlans.find(
        (plan: any) => plan.id.toString() === selectedPlan
      )?.name;

      // Update membership in Firestore
      const memberRef = doc(db, 'gyms', String(selectedSubscription.gymId), 'members', selectedSubscription.id);
      await updateDoc(memberRef, {
        membershipType: planName
      });

      toast({
        title: "Membership Changed",
        description: `Your membership has been updated to ${planName} plan.`,
      });

      // Update local state
      setSubscriptions(subscriptions.map(sub =>
        sub.id === selectedSubscription.id
          ? {
              ...sub,
              membershipType: planName || sub.membershipType,
              availablePlans: sub.availablePlans.map((plan: any) => ({
                ...plan,
                current: plan.id.toString() === selectedPlan
              }))
            }
          : sub
      ));

      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update membership. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewGymDetails = async (subscription: any) => {
    try {
      const gymRef = doc(db, 'gyms', subscription.gymId);
      const gymDoc = await getDoc(gymRef);

      if (gymDoc.exists()) {
        // Fetch amenities
        const amenitiesRef = collection(db, 'gyms', subscription.gymId, 'amenities');
        const amenitiesSnapshot = await getDocs(amenitiesRef);
        const amenities = amenitiesSnapshot.docs.map(doc => doc.data().name);

        // Fetch classes
        const classesRef = collection(db, 'gyms', subscription.gymId, 'classes');
        const classesSnapshot = await getDocs(classesRef);
        const classes = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setSelectedGym({
          id: gymDoc.id,
          ...gymDoc.data(),
          amenities,
          classes
        } as Gym);
        setIsDetailsDialogOpen(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load gym details.",
        variant: "destructive"
      });
    }
  };

  const handleEnrollClass = async (classItem: GymClass) => {
    if (!selectedGym || !user) return;

    // Defensive: Check if user is an active member and has a name
    const membersRef = collection(db, 'gyms', selectedGym.id, 'members');
    const memberQuery = query(
      membersRef,
      where('memberId', '==', user.uid),
      where('status', '==', 'active')
    );
    const memberSnapshot = await getDocs(memberQuery);

    if (memberSnapshot.empty) {
      toast({
        title: "Enrollment Failed",
        description: "You must be an active member to enroll in classes.",
        variant: "destructive"
      });
      return;
    }

    const memberData = memberSnapshot.docs[0].data();
    if (!memberData.name) {
      toast({
        title: "Enrollment Failed",
        description: "Your member profile is incomplete. Please contact support.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update class enrollment in Firestore
      const classRef = doc(db, 'gyms', selectedGym.id, 'classes', String(classItem.id));
      await updateDoc(classRef, {
        enrolled: increment(1)
      });

      toast({
        title: "Enrolled Successfully",
        description: `You have enrolled in ${classItem.name}.`,
      });

      // Update local state
      setSelectedGym({
        ...selectedGym,
        classes: selectedGym.classes?.map(c =>
          c.id === classItem.id
            ? { ...c, enrolled: (c.enrolled || 0) + 1 }
            : c
        )
      });
    } catch (error) {
      toast({
        title: "Enrollment Failed",
        description: "Failed to enroll in class. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    subscriptions,
    pendingSubscriptions,
    selectedSubscription,
    isDialogOpen,
    selectedPlan,
    isDetailsDialogOpen,
    selectedGym,
    handleManageSubscription,
    handleViewGymDetails,
    handlePlanChange,
    handlePlanSubmit,
    setIsDialogOpen,
    setIsDetailsDialogOpen,
    handleEnrollClass,
  };
}
