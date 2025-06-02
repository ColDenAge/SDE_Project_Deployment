import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BarChart, Clock } from "lucide-react";
import { usePendingApplicationsCount } from '../../hooks/usePendingApplicationsCount';

const ManagerStatCards: React.FC = () => {
  const { user } = useAuth();
  const [totalActiveMembers, setTotalActiveMembers] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [newSignups, setNewSignups] = useState(0);
  const pendingApplicationsCount = usePendingApplicationsCount();

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      // 1. Fetch gyms for owner
      const gymsRef = collection(db, "gyms");
      const q = query(gymsRef, where("ownerId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const gyms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Active Members
      let total = 0;
      for (const gym of gyms) {
        const membersRef = collection(db, "gyms", gym.id, "members");
        const membersSnapshot = await getDocs(membersRef);
        const activeMembers = membersSnapshot.docs.filter(doc => doc.data().status === 'active');
        total += activeMembers.length;
      }
      setTotalActiveMembers(total);
      // 2. Fetch classes for all gyms
      let allClasses = [];
      for (let i = 0; i < gyms.length; i++) {
        const gymId = gyms[i].id;
        const classesRef = collection(db, "gyms", gymId, "classes");
        const classesSnapshot = await getDocs(classesRef);
        allClasses.push(...classesSnapshot.docs.map(doc => doc.data()));
      }
      // Attendance Rate
      let totalAttendees = 0;
      let totalPossible = 0;
      allClasses.forEach(cls => {
        const enrolled = typeof cls.enrolled === "number" ? cls.enrolled : parseInt(cls.enrolled || "0");
        const capacity = typeof cls.capacity === "number" ? cls.capacity : parseInt(cls.capacity || "0");
        totalAttendees += enrolled;
        totalPossible += capacity;
      });
      let attendance = 0;
      if (totalPossible > 0) {
        attendance = Math.round((totalAttendees / totalPossible) * 100);
      }
      setAttendanceRate(attendance);
      // 3. Fetch payments for all gyms (current month)
      const gymIds = gyms.map(gym => gym.id);
      let payments = [];
      if (gymIds.length > 0) {
        const paymentsRef = collection(db, "payments");
        for (let i = 0; i < gymIds.length; i += 10) {
          const batch = gymIds.slice(i, i + 10);
          const paymentsQuery = query(paymentsRef, where("gymId", "in", batch));
          const paymentsSnapshot = await getDocs(paymentsQuery);
          payments.push(...paymentsSnapshot.docs.map(doc => doc.data()));
        }
      }
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      let monthRevenue = 0;
      payments.forEach(p => {
        if (p.status === "Paid") {
          const date = new Date(p.date);
          if (date.getFullYear() === thisYear && date.getMonth() === thisMonth) {
            monthRevenue += p.amount;
          }
        }
      });
      setRevenue(monthRevenue);
      // 4. New Sign-ups (members joined in last 7 days)
      // NOTE: activeMembers is a string[], so we cannot get joinDate here.
      // To enable this, store member objects with joinDate or fetch from a members collection.
      setNewSignups(0);
    };
    fetchStats();
  }, [user]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8 w-full">
      <Card className="hover:shadow-md transition-shadow w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#0B294B]">
            Active Members
          </CardTitle>
          <Users className="h-4 w-4 text-[#0B294B]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0B294B]">{totalActiveMembers}</div>
          <p className="text-xs text-gray-600">{totalActiveMembers === 0 ? '' : '7% increase from last month'}</p>
        </CardContent>
      </Card>
      <Card className="hover:shadow-md transition-shadow w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#0B294B]">
            Revenue
          </CardTitle>
          <BarChart className="h-4 w-4 text-[#0B294B]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0B294B]">${revenue.toLocaleString()}</div>
          <p className="text-xs text-gray-600">Month to date</p>
        </CardContent>
      </Card>
      <Card className="hover:shadow-md transition-shadow w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#0B294B]">
            New Sign-ups
          </CardTitle>
          <Users className="h-4 w-4 text-[#0B294B]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0B294B]">{newSignups}</div>
          <p className="text-xs text-gray-600">In the last 7 days</p>
        </CardContent>
      </Card>
      <Card className="hover:shadow-md transition-shadow w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#0B294B]">
            Pending Applications
          </CardTitle>
          <Clock className="h-4 w-4 text-[#0B294B]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0B294B]">{pendingApplicationsCount}</div>
          <p className="text-xs text-gray-600">Require attention</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerStatCards;
