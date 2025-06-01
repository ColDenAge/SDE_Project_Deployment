import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function usePendingApplicationsCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'members'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Pending applications count:', snapshot.size); // Debug log
      setCount(snapshot.size);
    });
    return () => unsubscribe();
  }, []);

  return count;
}