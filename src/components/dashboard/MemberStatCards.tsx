import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Dumbbell, Receipt, CreditCard, Users } from "lucide-react";
import { useGyms } from "../member-gyms/hooks/useGyms";
import { Badge } from "@/components/ui/badge";

interface MemberStatCardsProps {
  upcomingClassesCount: number;
  workoutStreakDays: number | string;
  membershipPrice: number;
  nextPaymentDate: string;
  totalBillsPaid: number;
}

const getMembershipStatus = (nextPaymentDate: string) => {
  if (!nextPaymentDate || nextPaymentDate === '-') return { label: 'Inactive', color: 'bg-gray-400' };
  const today = new Date();
  const nextDate = new Date(nextPaymentDate);
  if (nextDate < today) return { label: 'Inactive', color: 'bg-gray-400' };
  const diff = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 7) return { label: 'Expiring Soon', color: 'bg-yellow-400' };
  return { label: 'Active', color: 'bg-green-500' };
};

const MemberStatCards: React.FC<MemberStatCardsProps> = ({ upcomingClassesCount, workoutStreakDays, membershipPrice, nextPaymentDate, totalBillsPaid }) => {
  const { gyms: availableGyms, isLoading: gymsLoading } = useGyms();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#0B294B]">
            Available Gyms
          </CardTitle>
          <Users className="h-4 w-4 text-[#0B294B]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0B294B]">
            {gymsLoading ? '-' : availableGyms.length}
          </div>
          <p className="text-xs text-gray-600">gyms you can join</p>
        </CardContent>
      </Card>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#0B294B]">
            Membership Status
          </CardTitle>
          <CreditCard className="h-4 w-4 text-[#0B294B]" />
        </CardHeader>
        <CardContent>
          {(() => {
            const status = getMembershipStatus(nextPaymentDate);
            return (
              <>
                <div className="text-2xl font-bold text-[#0B294B] flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-white text-base ${status.color}`}>{status.label}</span>
                </div>
                <p className="text-xs text-gray-600">Your current membership status</p>
              </>
            );
          })()}
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
