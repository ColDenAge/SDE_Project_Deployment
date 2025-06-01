import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthProvider";
import { collection, getDoc, getDocs, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ClassSchedules = () => {
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEnrolledClasses = async () => {
      if (!user) return;
      // Fetch gyms the user is a member of
      const userDocRef = doc(db, "gym_members", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) return;
      const userData = userDocSnap.data();
      const enrolledGymIds = userData.enrolledGyms || [];
      let classes: any[] = [];
      for (const gymId of enrolledGymIds) {
        const classesRef = collection(db, "gyms", gymId, "classes");
        const classesSnapshot = await getDocs(classesRef);
        classesSnapshot.docs.forEach(doc => {
          const classData = doc.data();
          const enrolledMembers = classData.enrolledMembers || [];
          const isUserEnrolled = enrolledMembers.some((member: any) => member.id === user.uid);
          if (isUserEnrolled) {
            classes.push({
              ...classData,
              id: doc.id,
              gymId,
            });
          }
        });
      }
      setEnrolledClasses(classes);
    };
    fetchEnrolledClasses();
  }, [user]);

  // Extract days from class schedules
  const extractDays = (scheduleText: string) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.filter(day => scheduleText.includes(day));
  };

  // Group classes by day of the week
  const classesByDay = enrolledClasses.reduce<Record<string, any[]>>(
    (acc, cls) => {
      const days = extractDays(cls.schedule);
      days.forEach(day => {
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(cls);
      });
      return acc;
    },
    {}
  );

  // Filter classes based on selected day
  const filteredClasses = selectedDay === "all"
    ? enrolledClasses
    : classesByDay[selectedDay] || [];

  return (
    <Card className="mb-8">
      <CardHeader className="bg-muted/50">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Class Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs
          defaultValue="all"
          onValueChange={setSelectedDay}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-8">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="Mon">Mon</TabsTrigger>
            <TabsTrigger value="Tue">Tue</TabsTrigger>
            <TabsTrigger value="Wed">Wed</TabsTrigger>
            <TabsTrigger value="Thu">Thu</TabsTrigger>
            <TabsTrigger value="Fri">Fri</TabsTrigger>
            <TabsTrigger value="Sat">Sat</TabsTrigger>
            <TabsTrigger value="Sun">Sun</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[300px] mt-4">
            <div className="space-y-4">
              {filteredClasses.length > 0 ? (
                filteredClasses.map((cls, index) => (
                  <div
                    key={`${cls.id}-${index}`}
                    className="p-4 border rounded-lg flex justify-between items-start"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{cls.name}</h4>
                        <Badge variant={cls.enrolled >= cls.capacity ? "destructive" : "success"} className="text-xs">
                          {cls.enrolled >= cls.capacity ? "Full" : `${cls.capacity - cls.enrolled} spots left`}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Instructor: {cls.instructor}</p>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3.5 w-3.5" />
                        {cls.schedule}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No classes scheduled for this day.
                </div>
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ClassSchedules;
