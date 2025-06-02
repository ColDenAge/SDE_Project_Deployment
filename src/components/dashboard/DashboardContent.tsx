import React, { useContext, useEffect, useState } from "react";
import { RoleContext } from "../../router/App";
import MemberStatCards from "./MemberStatCards";
import ManagerStatCards from "./ManagerStatCards";
import ClassesList from "./ClassesList";
import QuickActions from "./QuickActions";
import { useAuth } from "@/context/AuthProvider";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar } from "@/components/ui/calendar";

const quotesAndTips = [
  "Success is the sum of small efforts, repeated day in and day out.",
  "Tip: Encourage members to stay hydrated!",
  "Motivation is what gets you started. Habit is what keeps you going.",
  "Tip: Consistency is key to achieving your fitness goals.",
  "The only bad workout is the one that didn't happen.",
  "Tip: Remember to stretch before and after your workouts.",
];

function getRandomQuoteOrTip() {
  return quotesAndTips[Math.floor(Math.random() * quotesAndTips.length)];
}

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
  const [signUpDates, setSignUpDates] = useState<Date[]>([]);

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

      // Fetch all members for manager's gyms and extract join dates
      const fetchSignUpDates = async () => {
        const gymsRef = collection(db, "gyms");
        const gymsSnapshot = await getDocs(query(gymsRef, where("ownerId", "==", user.uid)));
        const gyms = gymsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        let dates: Date[] = [];
        for (const gym of gyms) {
          const membersRef = collection(db, "gyms", gym.id, "members");
          const membersSnapshot = await getDocs(membersRef);
          membersSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.joinDate) {
              const d = new Date(data.joinDate);
              if (!isNaN(d.getTime())) dates.push(d);
            } else if (data.joinedAt) {
              const d = new Date(data.joinedAt);
              if (!isNaN(d.getTime())) dates.push(d);
            }
          });
        }
        setSignUpDates(dates);
      };
      fetchSignUpDates();
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {userRole === "manager" && (
          <ClassesList upcomingClasses={scheduledManagerClasses} />
        )}
        <div className="md:col-span-1 min-w-[280px]">
          <QuickActions />
        </div>
        <div className="md:col-span-2 min-w-[320px]">
          {/* Calendar showing member sign-up dates */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center h-full min-h-[120px] w-full">
            <span className="text-lg font-semibold text-[#0B294B] mb-2 text-center w-full">Member Sign-Up Calendar</span>
            <div className="w-full">
              <Calendar
                mode="multiple"
                selected={signUpDates}
                modifiers={{ signUp: signUpDates }}
                modifiersClassNames={{ signUp: "bg-blue-200 text-blue-900" }}
                showOutsideDays
                className="w-full"
              />
            </div>
            <span className="text-xs text-gray-500 mt-2">Highlighted dates show when members signed up.</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardContent;
