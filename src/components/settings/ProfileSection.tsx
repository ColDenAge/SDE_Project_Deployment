// Dummy change to update commit timestamp
import React, { useContext, useState } from "react";
import { RoleContext } from "../../router/App";
import { useAuth } from "@/context/AuthProvider";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import ProfileForm from "./ProfileForm";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ProfileSection = () => {
  const { userRole } = useContext(RoleContext);
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.displayName || "");
  const [isLoading, setIsLoading] = useState(false);
  const [gcashQrUrl, setGcashQrUrl] = useState("");
  const [gotymeQrUrl, setGotymeQrUrl] = useState("");
  const [gcashNumber, setGcashNumber] = useState("");
  const [gotymeNumber, setGotymeNumber] = useState("");

  React.useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const userDoc = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDoc);
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.fullName) setFullName(data.fullName);
        if (data.gcashQrUrl) setGcashQrUrl(data.gcashQrUrl);
        if (data.gotymeQrUrl) setGotymeQrUrl(data.gotymeQrUrl);
        if (data.gcashNumber) setGcashNumber(data.gcashNumber);
        if (data.gotymeNumber) setGotymeNumber(data.gotymeNumber);
      } else if (user.displayName) {
        setFullName(user.displayName);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsLoading(true);

    let authSuccess = false;
    let firestoreSuccess = false;

    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: fullName });
      authSuccess = true;
    } catch (error) {
      console.error("Error updating Firebase Auth profile:", error);
      toast({
        title: "Error",
        description: "Failed to update authentication profile. Please try again.",
        variant: "destructive",
      });
    }

    try {
      // Update Firestore user document
      const userDoc = doc(db, "users", user.uid);
      await setDoc(userDoc, {
        fullName: fullName,
        gcashNumber: gcashNumber,
        gotymeNumber: gotymeNumber,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      firestoreSuccess = true;
    } catch (error) {
      console.error("Error updating Firestore user document:", error);
      toast({
        title: "Error",
        description: "Failed to update Firestore profile. Please try again.",
        variant: "destructive",
      });
    }

    if (authSuccess && firestoreSuccess) {
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    }

    setIsLoading(false);
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'gcash' | 'gotyme') => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const storageRef = ref(storage, `qr_codes/${user.uid}_${type}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    if (type === 'gcash') {
      setGcashQrUrl(url);
    } else {
      setGotymeQrUrl(url);
    }
    // Save to Firestore
    const userDoc = doc(db, "users", user.uid);
    await setDoc(userDoc, {
      [`${type}QrUrl`]: url,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    toast({ title: "Success", description: `${type === 'gcash' ? 'GCash' : 'GoTyme'} QR code uploaded!` });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-[#0B294B] mb-6">Profile Settings</h2>
      {userRole !== 'member' && (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">GCash QR Code</label>
            {gcashQrUrl && <img src={gcashQrUrl} alt="GCash QR" className="h-32 mb-2" />}
            <input type="file" accept="image/*" onChange={e => handleQrUpload(e, 'gcash')} />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">GCash Number</label>
            <input
              type="text"
              value={gcashNumber}
              onChange={e => setGcashNumber(e.target.value)}
              placeholder="Enter GCash Number"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">GoTyme QR Code</label>
            {gotymeQrUrl && <img src={gotymeQrUrl} alt="GoTyme QR" className="h-32 mb-2" />}
            <input type="file" accept="image/*" onChange={e => handleQrUpload(e, 'gotyme')} />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">GoTyme Number</label>
            <input
              type="text"
              value={gotymeNumber}
              onChange={e => setGotymeNumber(e.target.value)}
              placeholder="Enter GoTyme Number"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </>
      )}
      <ProfileForm
        fullName={fullName}
        onFullNameChange={setFullName}
        user={user}
        userRole={userRole}
        isLoading={isLoading}
        onSave={handleSaveChanges}
      />
    </div>
  );
};

export default ProfileSection;
