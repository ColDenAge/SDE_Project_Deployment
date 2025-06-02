import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";

const ManagerBillingHeader = () => {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const q = query(collection(db, "notifications"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchNotifications();
  }, [user, modalOpen]);

  const markAsRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleNotificationClick = (n) => {
    setSelectedNotification(n);
    if (!n.read) markAsRead(n.id);
  };

  return (
    <div className="w-full flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold">Revenue Management</h1>
        <p className="text-muted-foreground mt-1">
          Monitor payments, revenue, and manage billing operations
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <button className="bg-muted hover:bg-muted/80 transition-colors px-4 py-2 rounded-lg flex items-center gap-2 relative">
              <Bell className="h-5 w-5" />
              <span className="hidden md:inline">Notifications</span>
              {unreadCount > 0 && <Badge className="absolute -top-2 -right-2 bg-red-500">{unreadCount}</Badge>}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Notifications</DialogTitle>
              <DialogDescription>Click a notification to view details and approve payments/receipts if needed.</DialogDescription>
            </DialogHeader>
            <div className="mb-4 max-h-60 overflow-y-auto">
              {notifications.length === 0 && <div>No notifications.</div>}
              <ul>
                {notifications.map(n => (
                  <li
                    key={n.id}
                    className={`mb-2 p-2 rounded cursor-pointer ${n.read ? 'bg-gray-100' : 'bg-blue-100 font-semibold'}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <span>{n.message}</span>
                  </li>
                ))}
              </ul>
            </div>
            {selectedNotification && (
              <div className="border-t pt-4 mt-2">
                <h4 className="font-semibold mb-2">Notification Details</h4>
                <div className="mb-2">{selectedNotification.message}</div>
                {/* Placeholder for payment/receipt approval UI if needed */}
                {/* You can add logic here to show payment/receipt info and approve/reject actions */}
              </div>
            )}
            <DialogClose asChild>
              <button className="mt-4 px-4 py-2 bg-gray-300 rounded">Close</button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ManagerBillingHeader;
