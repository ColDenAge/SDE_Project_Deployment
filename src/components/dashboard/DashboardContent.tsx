import React, { useContext, useEffect, useState } from "react";
import { RoleContext } from "../../router/App";
import MemberStatCards from "./MemberStatCards";
import ManagerStatCards from "./ManagerStatCards";
import ClassesList from "./ClassesList";
import QuickActions from "./QuickActions";
import { useAuth } from "@/context/AuthProvider";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const DashboardContent: React.FC = () => {
  const { userRole } = useContext(RoleContext);
  const { user } = useAuth();

  const [upcomingClassesCount, setUpcomingClassesCount] = useState(0);
  const [workoutStreakDays, setWorkoutStreakDays] = useState(0);
  const [upcomingEnrolledClasses, setUpcomingEnrolledClasses] = useState<any[]>([]);
  const [scheduledManagerClasses, setScheduledManagerClasses] = useState<any[]>([]);
  const [membershipPrice, setMembershipPrice] = useState(0);
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [totalBillsPaid, setTotalBillsPaid] = useState(0);

  useEffect(() => {
    if (!user) return;

    if (userRole === "member") {
      const fetchMemberData = async () => {
        try {
          const userDocRef = doc(db, "gym_members", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            // Fetch and count upcoming classes
            const enrolledGymIds = userData.enrolledGyms || [];
            let count = 0;
            const now = new Date();
            let enrolledClasses: any[] = [];

            for (const gymId of enrolledGymIds) {
              const classesRef = collection(db, "gyms", gymId, "classes");
              const classesSnapshot = await getDocs(classesRef);
              classesSnapshot.docs.forEach(doc => {
                const classData = doc.data();
                const classDateTime = new Date(classData.schedule); // **Needs adjustment based on schedule format**
                const enrolledMembers = classData.enrolledMembers || [];
                const isUserEnrolled = enrolledMembers.some((member: any) => member.id === user.uid);
                if (classDateTime > now && isUserEnrolled) {
                  count++;
                  enrolledClasses.push({
                    id: doc.id,
                    name: classData.name,
                    schedule: classData.schedule,
                    instructor: classData.instructor,
                    status: 'Booked',
                  });
                }
              });
            }
            setUpcomingClassesCount(count);
            setUpcomingEnrolledClasses(enrolledClasses);

            // Calculate and set workout streak
            const attendanceHistory = userData.attendanceHistory || [];
            const streak = calculateWorkoutStreak(attendanceHistory);
            setWorkoutStreakDays(streak);

            // Fetch active subscription (membership price and next payment)
            let foundMembershipPrice = 0;
            let foundNextPaymentDate = '';
            let foundPlanDuration = '';
            let foundPlanName = '';
            for (const gymId of enrolledGymIds) {
              const membersRef = collection(db, "gyms", gymId, "members");
              const memberQuery = query(membersRef, where("memberId", "==", user.uid), where("status", "==", "active"));
              const memberSnapshot = await getDocs(memberQuery);
              if (!memberSnapshot.empty) {
                const memberData = memberSnapshot.docs[0].data();
                foundPlanName = memberData.membershipType;
                // Fetch gym to get plan price
                const gymRef = doc(db, "gyms", gymId);
                const gymSnap = await getDoc(gymRef);
                if (gymSnap.exists()) {
                  const gymData = gymSnap.data();
                  const plan = (gymData.membershipPlans || gymData.membershipOptions || []).find((p: any) => p.name === foundPlanName);
                  if (plan) {
                    foundMembershipPrice = plan.price || 0;
                    foundPlanDuration = plan.duration || '';
                  }
                }
                // Next payment date (use endDate or joinedAt + duration if available)
                if (memberData.endDate) {
                  foundNextPaymentDate = new Date(memberData.endDate).toLocaleDateString();
                }
                break; // Use the first active subscription found
              }
            }
            setMembershipPrice(foundMembershipPrice);
            setNextPaymentDate(foundNextPaymentDate);

            // Fetch total bills paid for this month
            const nowDate = new Date();
            const thisMonth = nowDate.getMonth();
            const thisYear = nowDate.getFullYear();
            const paymentsQ = query(
              collection(db, "payments"),
              where("userId", "==", user.uid),
              where("status", "==", "Paid")
            );
            const paymentsSnap = await getDocs(paymentsQ);
            let totalPaid = 0;
            paymentsSnap.docs.forEach(doc => {
              const data = doc.data();
              if (data.date) {
                const paidDate = new Date(data.date);
                if (paidDate.getFullYear() === thisYear && paidDate.getMonth() === thisMonth) {
                  totalPaid += Number(data.amount) || 0;
                }
              }
            });
            setTotalBillsPaid(totalPaid);
          }
        } catch (error) {
          console.error("Error fetching member data:", error);
        }
      };
      fetchMemberData();
    } else if (userRole === "manager") {
      // Fetch manager's scheduled classes for today
      const fetchManagerClasses = async () => {
        try {
          // Get gyms owned by this manager
          const gymsRef = collection(db, "gyms");
          const gymsSnapshot = await getDocs(query(gymsRef, where("ownerId", "==", user.uid)));
          const gyms = gymsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const today = new Date();
          const todayStr = today.toLocaleDateString();
          let classesToday: any[] = [];
          for (const gym of gyms) {
            const classesRef = collection(db, "gyms", gym.id, "classes");
            const classesSnapshot = await getDocs(classesRef);
            classesSnapshot.docs.forEach(doc => {
              const classData = doc.data();
              // Try to match today's date in the schedule string (adjust as needed)
              const classDate = new Date(classData.schedule);
              if (
                classDate.toDateString() === today.toDateString() ||
                (typeof classData.schedule === 'string' && classData.schedule.includes(today.toLocaleString('en-US', { weekday: 'short' })))
              ) {
                classesToday.push({
                  id: doc.id,
                  name: classData.name,
                  schedule: classData.schedule,
                  instructor: classData.instructor,
                  status: `${classData.enrolled || 0} attendees`,
                });
              }
            });
          }
          setScheduledManagerClasses(classesToday);
        } catch (error) {
          console.error("Error fetching manager classes:", error);
        }
      };
      fetchManagerClasses();
    }
  }, [user, userRole]);

  // TODO: Refine calculateWorkoutStreak to handle potential timezones and inconsistent date formats
  const calculateWorkoutStreak = (attendanceHistory: string[]): number => {
    if (!attendanceHistory || attendanceHistory.length === 0) {
      return 0;
    }

    // Sort attendance dates in ascending order and remove duplicates (by day)
    const uniqueSortedDates = Array.from(new Set(attendanceHistory.map(dateString => new Date(dateString).toDateString())))
                               .map(dateString => new Date(dateString))
                               .sort((a, b) => a.getTime() - b.getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let lastDate: Date | null = null;

    for (const currentDate of uniqueSortedDates) {
      if (lastDate === null) {
        currentStreak = 1;
      } else {
        const timeDiff = currentDate.getTime() - lastDate.getTime();
        const diffDays = Math.round(timeDiff / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          currentStreak++;
        } else if (diffDays > 1) {
          // Gap in streak
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
        // If diffDays is 0, it's the same day, no change to streak
      }
      lastDate = currentDate;
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    return longestStreak;
  };


  return (
    <>
      {/* Stats Cards - Conditionally rendered based on role */}
      {userRole === "member" ? (
        <MemberStatCards
          upcomingClassesCount={upcomingClassesCount}
          workoutStreakDays={workoutStreakDays}
          membershipPrice={membershipPrice}
          nextPaymentDate={nextPaymentDate}
          totalBillsPaid={totalBillsPaid}
        />
      ) : (
        <ManagerStatCards />
      )}

      {/* Additional Dashboard Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {userRole === "manager" && (
          <ClassesList upcomingClasses={scheduledManagerClasses} />
        )}
        <QuickActions />
      </div>
    </>
  );
};

export default DashboardContent;
