import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { Loader2 } from 'lucide-react';

export type UserRole = 'admin' | 'student';

export interface UserData {
  role: UserRole;
  displayName: string;
  email: string;
  trackIds?: string[];
  createdAt: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  simulationRole: UserRole | null;
  setSimulationRole: (role: UserRole | null) => void;
  effectiveRole: UserRole | null;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    userData: null, 
    loading: true,
    simulationRole: null,
    setSimulationRole: () => {},
    effectiveRole: null
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulationRole, setSimulationRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let unsubscribeDoc: () => void;
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          
          if (unsubscribeDoc) {
            unsubscribeDoc();
          }

          unsubscribeDoc = onSnapshot(userDocRef, async (userDoc) => {
            if (userDoc.exists()) {
              const data = userDoc.data() as UserData;
              const adminEmails = ['yosseftole@zvialod.com', 'yossitole@gmail.com'];
              if (currentUser.email && adminEmails.includes(currentUser.email) && data.role !== 'admin') {
                const newUserData: UserData = { ...data, role: 'admin' };
                await setDoc(userDocRef, newUserData, { merge: true });
                setUserData(newUserData);
              } else {
                setUserData(data);
              }
              setLoading(false);
            } else {
              // Determine role. For demo purposes, maybe the first user is admin or we default to student.
              // Let's make "yosseftole@zvialod.com" an admin if it's the user's email.
              const role: UserRole = (currentUser.email === 'yosseftole@zvialod.com' || currentUser.email === 'yossitole@gmail.com') ? 'admin' : 'student';
              const newUserData: UserData = {
                role,
                displayName: currentUser.displayName || 'Unknown',
                email: currentUser.email || '',
                trackIds: [],
                createdAt: serverTimestamp(),
              };
              await setDoc(userDocRef, newUserData);
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
            setLoading(false);
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          setLoading(false);
        }
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
        }
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const effectiveRole = simulationRole || userData?.role || null;

  return (
    <AuthContext.Provider value={{ user, userData, loading, simulationRole, setSimulationRole, effectiveRole }}>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
