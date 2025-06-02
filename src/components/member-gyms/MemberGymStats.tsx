import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Building2, Clock, Calendar, Activity } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const MemberGymStats = () => {
  const { user } = useAuth();
  const [activeMembershipsCount, setActiveMembershipsCount] = useState(0);
  const [uniqueGymsCount, setUniqueGymsCount] = useState(0);
  const [recentActivitiesCount, setRecentActivitiesCount] = useState(0);
  const [nextClass, setNextClass] = useState<any>(null);
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [membershipPrice, setMembershipPrice] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        // Fetch all gyms
        const gymsRef = collection(db, 'gyms');
        const gymsSnapshot = await getDocs(gymsRef);
        const gyms = gymsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Count active memberships
        let activeCount = 0;
        let foundMembershipPrice = 0;
        let foundNextPaymentDate = '';
        for (const gym of gyms) {
          const membersRef = collection(db, 'gyms', gym.id, 'members');
          const memberQuery = query(membersRef, where('memberId', '==', user.uid), where('status', '==', 'active'));
          const memberSnapshot = await getDocs(memberQuery);
          if (!memberSnapshot.empty) {
            activeCount++;
            const memberData = memberSnapshot.docs[0].data();
            const foundPlanName = memberData.membershipType;
            // Fetch gym to get plan price
            const gymRef = doc(db, 'gyms', gym.id);
            const gymSnap = await getDoc(gymRef);
            if (gymSnap.exists()) {
              const gymData = gymSnap.data();
              const plan = (gymData.membershipPlans || gymData.membershipOptions || []).find((p: any) => p.name === foundPlanName);
              if (plan) {
                foundMembershipPrice = plan.price || 0;
              }
            }
            // Next payment date (use endDate or joinedAt + duration if available)
            if (memberData.endDate) {
              foundNextPaymentDate = new Date(memberData.endDate).toLocaleDateString();
            }
            break; // Use the first active subscription found
          }
        }
        setActiveMembershipsCount(activeCount);
        setUniqueGymsCount(activeCount); // Since we're counting unique gyms where user is a member
        setMembershipPrice(foundMembershipPrice);
        setNextPaymentDate(foundNextPaymentDate);
        // Fetch recent activities (you can implement this based on your activity tracking system)
        setRecentActivitiesCount(0);
        // Fetch next class (you can implement this based on your class scheduling system)
        setNextClass(null);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Memberships</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeMembershipsCount}</div>
          <p className="text-xs text-muted-foreground">
            Across {activeMembershipsCount === 0 ? 0 : uniqueGymsCount} different gyms
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{nextPaymentDate || '-'}</div>
          <p className="text-xs text-muted-foreground">${membershipPrice ? membershipPrice.toFixed(2) : '--.--'} Monthly Membership</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberGymStats;
