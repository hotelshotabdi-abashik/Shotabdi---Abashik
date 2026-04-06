import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { toast } from 'sonner';
import { useLanguage } from './LanguageContext';
import { LoginModal } from '../components/LoginModal';

export interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  profileCompleted: boolean;
  displayName?: string;
  photoURL?: string;
  legalName?: string;
  phone?: string;
  guardianName?: string;
  guardianPhone?: string;
  nidNumber?: string;
  createdAt: any;
  lastUpdated?: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('https://pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev/logo/shotabdi%20logo.png');

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().logoUrl) {
          setLogoUrl(docSnap.data().logoUrl);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchLogo();
  }, []);

  const fetchProfile = async (uid: string, currentUser?: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', uid);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        const adminEmails = ['hotelshotabdiabashik@gmail.com', 'selectedlegendbusiness@gmail.com', 'fuadf342@gmail.com', 'd2kabdulkahar@gmail.com'];
        
        // Auto-upgrade to admin if email matches
        if (currentUser?.email && adminEmails.includes(currentUser.email) && data.role !== 'admin') {
          const updatedProfile = { ...data, role: 'admin' as const };
          await setDoc(userRef, updatedProfile);
          setProfile(updatedProfile);
        } else {
          setProfile(data);
        }
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid, currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = () => {
    setIsLoginModalOpen(true);
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      toast.success(t("লগআউট সফল হয়েছে!", "Logged out successfully!"));
    } catch (error) {
      console.error("Logout error:", error);
      toast.error(t("লগআউট করতে সমস্যা হয়েছে।", "Failed to logout."));
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await fetchProfile(auth.currentUser.uid, auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, refreshProfile }}>
      {children}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        logoUrl={logoUrl}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
