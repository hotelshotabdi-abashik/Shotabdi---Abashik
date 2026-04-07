import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface ContentContextType {
  content: any;
  editMode: boolean;
  loading: boolean;
  setEditMode: (mode: boolean) => void;
  updateContent: (path: string, value: any) => Promise<void>;
  addToList: (listKey: string, item: any) => Promise<void>;
  removeFromList: (listKey: string, index: number) => Promise<void>;
  updateListItem: (listKey: string, index: number, item: any) => Promise<void>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<any>(() => {
    if (typeof window !== 'undefined' && (window as any).__INITIAL_CONTENT__) {
      return (window as any).__INITIAL_CONTENT__;
    }
    return {};
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(() => {
    return !(typeof window !== 'undefined' && (window as any).__INITIAL_CONTENT__);
  });
  const { profile } = useAuth();

  useEffect(() => {
    const contentRef = collection(db, 'content');
    const unsubscribe = onSnapshot(contentRef, (snapshot) => {
      const newContent: any = {};
      snapshot.docs.forEach((doc) => {
        const dataStr = doc.data().data;
        try {
          newContent[doc.id] = JSON.parse(dataStr);
        } catch (e) {
          newContent[doc.id] = dataStr;
        }
      });
      setContent(newContent);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching content:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Turn off edit mode if user logs out or is not an admin
  useEffect(() => {
    if (profile?.role !== 'admin') {
      setEditMode(false);
    }
  }, [profile]);

  const updateContent = async (path: string, value: any) => {
    if (profile?.role !== 'admin') {
      toast.error("Only admins can edit content.");
      return;
    }

    try {
      const dataString = typeof value === 'string' ? value : JSON.stringify(value);
      const docRef = doc(db, 'content', path);
      const docSnap = await getDoc(docRef);
      const section = docSnap.exists() ? docSnap.data().section : 'general';
      
      await setDoc(docRef, {
        id: path,
        section: section,
        data: dataString,
        updatedAt: serverTimestamp()
      });
      toast.success("Content updated successfully!");
    } catch (error) {
      console.error("Error updating content:", error);
      toast.error("Failed to update content.");
    }
  };

  const addToList = async (listKey: string, item: any) => {
    if (profile?.role !== 'admin') return;
    const currentList = content[listKey] || [];
    await updateContent(listKey, [...currentList, item]);
  };

  const removeFromList = async (listKey: string, index: number) => {
    if (profile?.role !== 'admin') return;
    const currentList = content[listKey] || [];
    const newList = [...currentList];
    newList.splice(index, 1);
    await updateContent(listKey, newList);
  };

  const updateListItem = async (listKey: string, index: number, item: any) => {
    if (profile?.role !== 'admin') return;
    const currentList = content[listKey] || [];
    const newList = [...currentList];
    newList[index] = item;
    await updateContent(listKey, newList);
  };

  return (
    <ContentContext.Provider value={{ content, editMode, loading, setEditMode, updateContent, addToList, removeFromList, updateListItem }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};
