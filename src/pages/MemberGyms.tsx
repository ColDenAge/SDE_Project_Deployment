import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import GymPageHeader from "@/components/member-gyms/GymPageHeader";
import MemberGymStats from "@/components/member-gyms/MemberGymStats";
import ActiveSubscriptions from "@/components/member-gyms/ActiveSubscriptions";
import RecentActivities from "@/components/member-gyms/RecentActivities";
import AvailableGyms from "@/components/member-gyms/AvailableGyms";
import ClassSchedules from "@/components/member-gyms/ClassSchedules";
import { Toaster } from "@/components/ui/toaster";

const MemberGyms = () => {
  return (
    <DashboardLayout>
      <GymPageHeader />
      <MemberGymStats />
      <ActiveSubscriptions />
      {/*<ClassSchedules />*/}
      {/*<RecentActivities />*/}
      <AvailableGyms />
      <Toaster />
    </DashboardLayout>
  );
};

export default MemberGyms;
