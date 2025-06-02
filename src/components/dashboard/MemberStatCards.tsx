import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Dumbbell, Receipt, CreditCard } from "lucide-react";

interface MemberStatCardsProps {
  upcomingClassesCount: number;
  workoutStreakDays: number | string;
  membershipPrice: number;
  nextPaymentDate: string;
  totalBillsPaid: number;
}

const MemberStatCards: React.FC<MemberStatCardsProps> = ({ upcomingClassesCount, workoutStreakDays, membershipPrice, nextPaymentDate, totalBillsPaid }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#0B294B]">
            Upcoming Classes
          </CardTitle>
          <Calendar className="h-4 w-4 text-[#0B294B]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0B294B]">{upcomingClassesCount}</div>
          <p className="text-xs text-gray-600">Classes scheduled this week</p>
        </CardContent>
      </Card>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#0B294B]">
            Workout Streak
          </CardTitle>
          <Dumbbell className="h-4 w-4 text-[#0B294B]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0B294B]">{workoutStreakDays}</div>
          <p className="text-xs text-gray-600">Keep it up!</p>
        </CardContent>
      </Card>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#0B294B]">
            Next Payment
          </CardTitle>
          <CreditCard className="h-4 w-4 text-[#0B294B]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0B294B]">{nextPaymentDate || '-'}</div>
          <p className="text-xs text-gray-600">${membershipPrice?.toFixed(2) || '-'} Monthly Membership</p>
        </CardContent>
      </Card>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#0B294B]">
            Total Bills Paid
          </CardTitle>
          <Receipt className="h-4 w-4 text-[#0B294B]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0B294B]">${totalBillsPaid?.toFixed(2) || '0.00'}</div>
          <p className="text-xs text-gray-600">This month</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberStatCards;
