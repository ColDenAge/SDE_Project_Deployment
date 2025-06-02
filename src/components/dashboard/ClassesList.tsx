import React, { useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleContext } from "../../router/App";

interface ClassesListProps {
  upcomingClasses?: Array<{
    id: string;
    name: string;
    schedule: string;
    instructor?: string;
    status?: string;
  }>;
}

const ClassesList: React.FC<ClassesListProps> = ({ upcomingClasses = [] }) => {
  const { userRole } = useContext(RoleContext);

  // Only show for members
  if (userRole !== "member") {
    return null;
  }

  return (
    <Card className="md:col-span-2 hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-[#0B294B]">
          Your Upcoming Classes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {upcomingClasses.length === 0 ? (
            <div className="text-gray-500">No upcoming classes booked.</div>
          ) : (
            upcomingClasses.map((cls) => (
              <div key={cls.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div>
                  <h3 className="font-semibold text-[#0B294B]">{cls.name}</h3>
                  <p className="text-sm text-gray-600">{cls.schedule}</p>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-[#0B294B] rounded text-xs">{cls.status || 'Booked'}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassesList;
