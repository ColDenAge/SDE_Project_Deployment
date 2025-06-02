import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BillingHeader from "@/components/billings/BillingHeader";
import PaymentMethods from "@/components/billings/PaymentMethods";
import BillingHistory from "@/components/billings/BillingHistory";
import CurrentSubscriptions from "@/components/billings/CurrentSubscriptions";
import ManualPaymentSection from "@/components/billings/ManualPaymentSection";
import UserNotifications from "@/components/billings/UserNotifications";

const Billings = () => {
  return (
    <DashboardLayout>
      <BillingHeader />
      <UserNotifications />
      <ManualPaymentSection />
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div>
          <CurrentSubscriptions />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billings;
