import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { toast } from 'sonner';
import { useLanguage } from './LanguageContext';
import { notifyLogin } from '../services/NotificationService';

declare global {
  interface Window {
    google?: any;
  }
}

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
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string, currentUser?: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', uid);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        const adminEmails = ['hotelshotabdiabashik@gmail.com', 'selectedlegendbusiness@gmail.com', 'fuadf342@gmail.com'];
        
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

  const handleGoogleOneTapResponse = async (response: any) => {
    try {
      const credential = GoogleAuthProvider.credential(response.credential);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);
      
      if (!snapshot.exists()) {
        const adminEmails = ['hotelshotabdiabashik@gmail.com', 'selectedlegendbusiness@gmail.com', 'fuadf342@gmail.com'];
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          role: adminEmails.includes(user.email || '') ? 'admin' : 'user',
          profileCompleted: false,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
      } else {
        setProfile(snapshot.data() as UserProfile);
      }
      
      // Send login notification
      if (user.email) {
        notifyLogin(user.email, user.displayName || 'User').catch(console.error);
      }
      
      toast.success(t("সফলভাবে লগইন হয়েছে!", "Logged in successfully!"));
    } catch (error: any) {
      console.error("One Tap Login error:", error);
      toast.error(t(`লগইন করতে সমস্যা হয়েছে: ${error.message}`, `Failed to login: ${error.message}`));
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      const initializeGoogleOneTap = () => {
        if (window.google?.accounts?.id) {
          // Clear the g_state cookie to ensure the prompt shows after every refresh
          document.cookie = "g_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          
          window.google.accounts.id.initialize({
            // Note: Client Secret is configured in the Firebase Console (Authentication -> Sign-in method -> Google)
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '63077246647-u3i2uh7p0vlbj1ou9krs6ee82b5apjvp.apps.googleusercontent.com',
            callback: handleGoogleOneTapResponse,
            cancel_on_tap_outside: false,
            context: 'use',
          });
          window.google.accounts.id.prompt();
        } else {
          setTimeout(initializeGoogleOneTap, 500);
        }
      };
      initializeGoogleOneTap();
    }
  }, [loading, user]);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user profile exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);
      
      if (!snapshot.exists()) {
        // Create new user profile
        const adminEmails = ['hotelshotabdiabashik@gmail.com', 'selectedlegendbusiness@gmail.com', 'fuadf342@gmail.com'];
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          role: adminEmails.includes(user.email || '') ? 'admin' : 'user',
          profileCompleted: false,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
      } else {
        setProfile(snapshot.data() as UserProfile);
      }
      
      // Send login notification
      if (user.email) {
        notifyLogin(user.email, user.displayName || 'User').catch(console.error);
      }
      
      toast.success(t("সফলভাবে লগইন হয়েছে!", "Logged in successfully!"));
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error(t("এই ডোমেইনটি Firebase-এ অনুমোদিত নয়। অনুগ্রহ করে Authorized Domains-এ যোগ করুন।", "This domain is not authorized in Firebase. Please add it to Authorized Domains."));
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error(t("লগইন বাতিল করা হয়েছে।", "Login cancelled."));
      } else {
        toast.error(t(`লগইন করতে সমস্যা হয়েছে: ${error.message}`, `Failed to login: ${error.message}`));
      }
      throw error;
    }
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
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, refreshProfile }}>
      {children}
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
