import { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc, updateDoc, setDoc, deleteDoc, serverTimestamp, query, orderBy, limit, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Plus, Edit2, Trash2, Check, X, Users, Home, Calendar, Globe, Phone, Star, Megaphone, Send, Facebook, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { uploadToR2, deleteFromR2 } from '../lib/r2';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { notifyBookingStatus, notifyExclusiveOffer } from '../services/NotificationService';

interface Room {
  id: string;
  name: string;
  type: string;
  price: number;
  amenities: string[];
  imageUrl: string;
  description: string;
  isAvailable: boolean;
  order?: number;
}

interface User {
  uid: string;
  email: string;
  role: string;
  displayName?: string;
  phone?: string;
}

interface Booking {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  roomId: string;
  roomName?: string;
  checkIn: number;
  checkOut: number;
  status: string;
  totalAmount: number;
  createdAt: any;
}

export default function Admin() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'rooms' | 'users' | 'bookings' | 'content' | 'ratings' | 'offers' | 'social' | 'settings' | 'emails'>('rooms');
  
  // Social Links State
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [newSocialLink, setNewSocialLink] = useState({ platform: '', url: '', icon: 'Facebook', order: 0 });

  // Settings State
  const [settings, setSettings] = useState({ websiteName: '', logoUrl: '', galleryCleanupThreshold: 50 });

  // Email Logs State
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Room>>({});

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  
  // Bookings State
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Ratings State
  const [ratings, setRatings] = useState<any[]>([]);

  // Offers State
  const [offerForm, setOfferForm] = useState({ title: '', description: '' });

  // Content Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploadFolder, setUploadFolder] = useState('shotabdi-abashik/general');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [roleModal, setRoleModal] = useState<{ isOpen: boolean, uid: string, newRole: string, userEmail: string }>({ isOpen: false, uid: '', newRole: '', userEmail: '' });
  const [rolePassword, setRolePassword] = useState('');

  useEffect(() => {
    if (activeTab === 'rooms') fetchRooms();
    else if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'bookings') fetchBookings();
    else if (activeTab === 'ratings') fetchRatings();
    else if (activeTab === 'social') fetchSocialLinks();
    else if (activeTab === 'settings') fetchSettings();
    else if (activeTab === 'emails') fetchEmailLogs();
  }, [activeTab]);

  const fetchSocialLinks = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'socialLinks'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      setSocialLinks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'socialLinks');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'general');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setSettings(snapshot.data() as any);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'settings/general');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'emailLogs'), orderBy('sentAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      setEmailLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching email logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'general'), settings);
      toast.success("Settings updated successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/general');
      toast.error("Failed to update settings.");
    }
  };

  const handleAddSocialLink = async () => {
    try {
      const docRef = doc(collection(db, 'socialLinks'));
      await setDoc(docRef, { ...newSocialLink, id: docRef.id });
      setNewSocialLink({ platform: '', url: '', icon: 'Facebook', order: socialLinks.length + 1 });
      fetchSocialLinks();
      toast.success("Social link added!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'socialLinks');
      toast.error("Failed to add social link.");
    }
  };

  const handleDeleteSocialLink = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'socialLinks', id));
      fetchSocialLinks();
      toast.success("Social link deleted!");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `socialLinks/${id}`);
      toast.error("Failed to delete social link.");
    }
  };

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const ratingsRef = collection(db, 'ratings');
      const snapshot = await getDocs(ratingsRef);
      if (!snapshot.empty) {
        const ratingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by newest first
        ratingsData.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
          return timeB - timeA;
        });
        
        setRatings(ratingsData);
      } else {
        setRatings([]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'ratings');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const roomsRef = collection(db, 'rooms');
      const snapshot = await getDocs(roomsRef);
      if (!snapshot.empty) {
        const roomsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Room[];
        setRooms(roomsData);
      } else {
        setRooms([]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      if (!snapshot.empty) {
        const usersData = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as User[];
        setUsers(usersData);
      } else {
        setUsers([]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const bookingsRef = collection(db, 'bookings');
      const snapshot = await getDocs(bookingsRef);
      if (!snapshot.empty) {
        const bookingsData = snapshot.docs.map(doc => {
          const data = doc.data();
          let status = data.status;
          
          // Auto-cancel if pending for more than 24 hours
          if (status === 'pending' && data.createdAt) {
            const createdAtTime = data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt;
            if (Date.now() - createdAtTime > 24 * 60 * 60 * 1000) {
              status = 'cancelled';
              // Optionally update in DB
              updateDoc(doc.ref, { status: 'cancelled' }).catch(console.error);
            }
          }
          
          return {
            id: doc.id,
            ...data,
            status
          };
        }) as Booking[];
        
        // Sort by newest first
        bookingsData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
          return timeB - timeA;
        });
        
        setBookings(bookingsData);
      } else {
        setBookings([]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async () => {
    const newRoom = {
      name: 'New Room',
      type: 'Single Delux',
      price: 1500,
      amenities: ['এসি', 'টিভি'],
      imageUrl: 'https://picsum.photos/seed/newroom/800/600',
      description: 'নতুন রুমের বিবরণ।',
      isAvailable: true,
      order: 5,
      createdAt: serverTimestamp()
    };
    
    try {
      const roomsRef = collection(db, 'rooms');
      const newRoomRef = doc(roomsRef);
      await setDoc(newRoomRef, { ...newRoom, id: newRoomRef.id });
      fetchRooms();
      toast.success(t("নতুন রুম যোগ করা হয়েছে!", "New room added successfully!"));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rooms');
      toast.error(t("রুম যোগ করতে সমস্যা হয়েছে।", "Failed to add room."));
    }
  };

  const handleUpdateRoom = async (id: string) => {
    try {
      const roomRef = doc(db, 'rooms', id);
      await updateDoc(roomRef, editForm);
      setIsEditing(null);
      fetchRooms();
      toast.success(t("রুম আপডেট করা হয়েছে!", "Room updated successfully!"));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${id}`);
      toast.error(t("রুম আপডেট করতে সমস্যা হয়েছে।", "Failed to update room."));
    }
  };

  const handleDeleteRoom = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Room',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const roomRef = doc(db, 'rooms', id);
          await deleteDoc(roomRef);
          fetchRooms();
          toast.success(t("রুম মুছে ফেলা হয়েছে!", "Room deleted successfully!"));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `rooms/${id}`);
          toast.error(t("রুম মুছতে সমস্যা হয়েছে।", "Failed to delete room."));
        }
      }
    });
  };

  const handleUpdateBookingStatus = async (id: string, newStatus: string) => {
    try {
      const bookingRef = doc(db, 'bookings', id);
      await updateDoc(bookingRef, { status: newStatus });
      
      // Find booking in state to send notification
      const booking = bookings.find(b => b.id === id);
      if (booking && booking.userEmail && (newStatus === 'accepted' || newStatus === 'rejected')) {
        notifyBookingStatus(
          booking.userEmail,
          booking.userName || 'User',
          booking.roomName || 'Room',
          newStatus
        ).catch(console.error);
      }
      
      fetchBookings();
      toast.success(t("বুকিং স্ট্যাটাস আপডেট করা হয়েছে!", "Booking status updated!"));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${id}`);
      toast.error(t("বুকিং আপডেট করতে সমস্যা হয়েছে।", "Failed to update booking."));
    }
  };

  const handleUpdateRatingStatus = async (id: string, newStatus: string) => {
    try {
      const ratingRef = doc(db, 'ratings', id);
      await updateDoc(ratingRef, { status: newStatus });
      fetchRatings();
      toast.success(t("রেটিং স্ট্যাটাস আপডেট করা হয়েছে!", "Rating status updated!"));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ratings/${id}`);
      toast.error(t("রেটিং আপডেট করতে সমস্যা হয়েছে।", "Failed to update rating."));
    }
  };

  const handleDeleteRating = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Rating',
      message: 'Are you sure you want to delete this rating?',
      onConfirm: async () => {
        try {
          const ratingRef = doc(db, 'ratings', id);
          await deleteDoc(ratingRef);
          fetchRatings();
          toast.success(t("রেটিং মুছে ফেলা হয়েছে!", "Rating deleted successfully!"));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `ratings/${id}`);
          toast.error(t("রেটিং মুছতে সমস্যা হয়েছে।", "Failed to delete rating."));
        }
      }
    });
  };

  const handleUpdateUserRole = (uid: string, newRole: string, userEmail: string) => {
    if (user && user.uid === uid) {
      toast.error(t("আপনি নিজের রোল পরিবর্তন করতে পারবেন না।", "You cannot change your own role."));
      return;
    }
    
    const DEFAULT_ADMINS = ['hotelshotabdiabashik@gmail.com', 'fuadf342@gmail.com', 'selectedlegendbusiness@gmail.com'];
    
    // Check if trying to demote a default admin
    if (newRole !== 'admin' && DEFAULT_ADMINS.includes(userEmail)) {
      toast.error(t("ডিফল্ট অ্যাডমিনকে ডিমোট করা যাবে না।", "Cannot demote a default admin."));
      return;
    }

    // If trying to promote to admin, ask for password
    if (newRole === 'admin') {
      setRoleModal({ isOpen: true, uid, newRole, userEmail });
      setRolePassword('');
      return;
    }

    // Otherwise (demoting a non-default admin), just do it
    executeRoleUpdate(uid, newRole);
  };

  const executeRoleUpdate = async (uid: string, newRole: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role: newRole });
      fetchUsers();
      toast.success(t("ইউজার রোল আপডেট করা হয়েছে!", "User role updated!"));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      toast.error(t("ইউজার আপডেট করতে সমস্যা হয়েছে।", "Failed to update user."));
    }
  };

  const confirmRoleUpdate = () => {
    if (rolePassword !== 'kahar02') {
      toast.error(t("ভুল পাসওয়ার্ড।", "Incorrect password."));
      return;
    }
    setRoleModal({ isOpen: false, uid: '', newRole: '', userEmail: '' });
    executeRoleUpdate(roleModal.uid, roleModal.newRole);
  };

  const cleanupGallery = async () => {
    try {
      const contentRef = doc(db, 'content', 'galleryImages');
      const contentSnap = await getDoc(contentRef);
      
      if (contentSnap.exists()) {
        const images = contentSnap.data().value || [];
        const threshold = settings.galleryCleanupThreshold || 50;
        
        if (images.length > threshold) {
          const toDelete = images.slice(threshold);
          const toKeep = images.slice(0, threshold);
          
          // Delete from R2
          for (const img of toDelete) {
            const url = typeof img === 'string' ? img : img.url;
            if (url) {
              await deleteFromR2(url).catch(err => console.error("Error deleting from R2:", err));
            }
          }
          
          // Update Firestore
          await updateDoc(contentRef, { value: toKeep });
          
          // Notify Admin
          await addDoc(collection(db, 'emailLogs'), {
            to: 'hotelshotabdiabashik@gmail.com',
            subject: 'Gallery Cleanup Notification',
            type: 'admin_alert',
            status: 'sent',
            sentAt: serverTimestamp(),
            metadata: { 
              deletedCount: toDelete.length,
              threshold: threshold,
              message: `Old gallery posts (after recent ${threshold} posts) have been deleted automatically.`
            }
          });
          
          toast.info(`Gallery cleaned up: ${toDelete.length} old images removed.`);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'content/galleryImages');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first!');
      return;
    }

    setUploadStatus('Uploading...');
    
    try {
      const fileUrl = await uploadToR2(file, uploadFolder);
      
      setUploadStatus('Upload successful!');
      setUploadedUrl(fileUrl);
      toast.success('File uploaded successfully to Cloudflare R2!');

      // If uploading to gallery, add to galleryImages content
      if (uploadFolder.includes('gallery')) {
        const contentRef = doc(db, 'content', 'galleryImages');
        const contentSnap = await getDoc(contentRef);
        let currentImages = [];
        if (contentSnap.exists()) {
          currentImages = contentSnap.data().value || [];
        }
        
        // Add to the beginning (ranking top to bottom)
        const newImages = [{ url: fileUrl, createdAt: new Date().toISOString() }, ...currentImages];
        await setDoc(contentRef, { value: newImages }, { merge: true });
        
        // Trigger cleanup
        await cleanupGallery();
      }
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'content/galleryImages');
      setUploadStatus(`Upload failed: ${error.message}`);
      toast.error('Error uploading file.');
    }
  };

  if (loading && activeTab === 'rooms' && rooms.length === 0) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div></div>;
  }

  return (
    <div className="bg-slate-50 py-6 md:py-10 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 md:mb-8">{t('অ্যাডমিন প্যানেল', 'Admin Dashboard')}</h1>
        
        {/* Tabs */}
        <div className="flex space-x-2 mb-6 md:mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'rooms' ? 'bg-red-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            <Home className="w-5 h-5 mr-2" /> {t('রুম পরিচালনা', 'Manage Rooms')}
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'users' ? 'bg-red-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            <Users className="w-5 h-5 mr-2" /> {t('ইউজার পরিচালনা', 'Manage Users')}
          </button>
          <button 
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'bookings' ? 'bg-red-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            <Calendar className="w-5 h-5 mr-2" /> {t('বুকিং পরিচালনা', 'Manage Bookings')}
          </button>
          <button 
            onClick={() => setActiveTab('content')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'content' ? 'bg-red-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            <Globe className="w-5 h-5 mr-2" /> {t('ওয়েবসাইট কন্টেন্ট', 'Website Content')}
          </button>
          <button 
            onClick={() => setActiveTab('ratings')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'ratings' ? 'bg-red-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            <Star className="w-5 h-5 mr-2" /> {t('রেটিং পরিচালনা', 'Manage Ratings')}
          </button>
          <button 
            onClick={() => setActiveTab('offers')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'offers' ? 'bg-red-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            <Megaphone className="w-5 h-5 mr-2" /> {t('অফার পাঠান', 'Send Offers')}
          </button>
          <button 
            onClick={() => setActiveTab('social')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'social' ? 'bg-red-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            <Facebook className="w-5 h-5 mr-2" /> {t('সোশ্যাল লিংক', 'Social Links')}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-red-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            <Globe className="w-5 h-5 mr-2" /> {t('সেটিংস', 'Settings')}
          </button>
          <button 
            onClick={() => setActiveTab('emails')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'emails' ? 'bg-red-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            <Mail className="w-5 h-5 mr-2" /> {t('ইমেইল লগ', 'Email Logs')}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'rooms' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{t('রুম তালিকা', 'Room List')}</h2>
              <button 
                onClick={handleAddRoom}
                className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" /> {t('নতুন রুম', 'Add Room')}
              </button>
            </div>
            {/* Rooms Content */}
            <div className="md:hidden space-y-4">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900">{room.name}</h3>
                      <p className="text-xs text-slate-500">{room.type}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${room.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {room.isAvailable ? t('Available', 'Available') : t('Unavailable', 'Unavailable')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">৳{room.price}</span>
                    <span className="text-slate-400">Order: {room.order || '-'}</span>
                  </div>
                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-50">
                    <button 
                      onClick={() => {
                        setIsEditing(room.id);
                        setEditForm(room);
                      }} 
                      className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteRoom(room.id, room.name)} className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {isEditing === room.id && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3">
                      <input 
                        type="text" 
                        value={editForm.name || ''} 
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                        placeholder="Room Name"
                      />
                      <select 
                        value={editForm.type || ''} 
                        onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                      >
                        <option value="Single Delux">Single Delux</option>
                        <option value="Double Delux">Double Delux</option>
                        <option value="Family Suit">Family Suit</option>
                        <option value="Super Delux">Super Delux</option>
                      </select>
                      <input 
                        type="number" 
                        value={editForm.price || 0} 
                        onChange={(e) => setEditForm({...editForm, price: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                        placeholder="Price"
                      />
                      <div className="flex space-x-2">
                        <button onClick={() => handleUpdateRoom(room.id)} className="flex-1 py-2 bg-green-600 text-white rounded font-bold text-sm">Save</button>
                        <button onClick={() => setIsEditing(null)} className="flex-1 py-2 bg-slate-200 text-slate-700 rounded font-bold text-sm">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
                      <th className="p-4 font-bold border-b">{t('রুমের নাম', 'Room Name')}</th>
                      <th className="p-4 font-bold border-b">{t('ধরন', 'Type')}</th>
                      <th className="p-4 font-bold border-b">{t('মূল্য (৳)', 'Price (৳)')}</th>
                      <th className="p-4 font-bold border-b">{t('ক্রম', 'Order')}</th>
                      <th className="p-4 font-bold border-b">{t('অবস্থা', 'Status')}</th>
                      <th className="p-4 font-bold border-b text-right">{t('অ্যাকশন', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          {isEditing === room.id ? (
                            <input 
                              type="text" 
                              value={editForm.name || ''} 
                              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                              className="w-full px-2 py-1 border border-slate-300 rounded"
                            />
                          ) : (
                            <span className="font-bold text-slate-900">{room.name}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing === room.id ? (
                            <select 
                              value={editForm.type || ''} 
                              onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                              className="w-full px-2 py-1 border border-slate-300 rounded"
                            >
                              <option value="Single Delux">Single Delux</option>
                              <option value="Double Delux">Double Delux</option>
                              <option value="Family Suit">Family Suit</option>
                              <option value="Super Delux">Super Delux</option>
                            </select>
                          ) : (
                            <span className="text-slate-600">{room.type}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing === room.id ? (
                            <input 
                              type="number" 
                              value={editForm.price || 0} 
                              onChange={(e) => setEditForm({...editForm, price: Number(e.target.value)})}
                              className="w-full px-2 py-1 border border-slate-300 rounded"
                            />
                          ) : (
                            <span className="text-slate-600">৳{room.price}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing === room.id ? (
                            <input 
                              type="number" 
                              value={editForm.order || 0} 
                              onChange={(e) => setEditForm({...editForm, order: Number(e.target.value)})}
                              className="w-full px-2 py-1 border border-slate-300 rounded"
                            />
                          ) : (
                            <span className="text-slate-600">{room.order || '-'}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing === room.id ? (
                            <select 
                              value={editForm.isAvailable ? 'true' : 'false'} 
                              onChange={(e) => setEditForm({...editForm, isAvailable: e.target.value === 'true'})}
                              className="w-full px-2 py-1 border border-slate-300 rounded"
                            >
                              <option value="true">Available</option>
                              <option value="false">Unavailable</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${room.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {room.isAvailable ? t('Available', 'Available') : t('Unavailable', 'Unavailable')}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {isEditing === room.id ? (
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => handleUpdateRoom(room.id)} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setIsEditing(null)} className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end space-x-2">
                              <button 
                                onClick={() => {
                                  setIsEditing(room.id);
                                  setEditForm(room);
                                }} 
                                className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteRoom(room.id, room.name)} className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rooms.length === 0 && !loading && (
                  <div className="p-8 text-center text-slate-500">{t('কোনো রুম পাওয়া যায়নি।', 'No rooms found.')}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-6">{t('ইউজার তালিকা', 'User List')}</h2>
            {/* Users Content */}
            <div className="md:hidden space-y-4">
              {users.map((u) => (
                <div key={u.uid} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900">{u.displayName || '-'}</h3>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {u.phone || '-'}
                  </div>
                  <div className="pt-2 border-t border-slate-50">
                    <select 
                      value={u.role}
                      onChange={(e) => handleUpdateUserRole(u.uid, e.target.value, u.email)}
                      disabled={user?.uid === u.uid}
                      className={`w-full px-3 py-2 border border-slate-300 rounded text-sm ${user?.uid === u.uid ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
                      <th className="p-4 font-bold border-b">{t('নাম', 'Name')}</th>
                      <th className="p-4 font-bold border-b">{t('ইমেইল', 'Email')}</th>
                      <th className="p-4 font-bold border-b">{t('ফোন', 'Phone')}</th>
                      <th className="p-4 font-bold border-b">{t('রোল', 'Role')}</th>
                      <th className="p-4 font-bold border-b text-right">{t('অ্যাকশন', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-900">{u.displayName || '-'}</td>
                        <td className="p-4 text-slate-600">{u.email}</td>
                        <td className="p-4 text-slate-600">{u.phone || '-'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <select 
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.uid, e.target.value, u.email)}
                            disabled={user?.uid === u.uid}
                            className={`px-2 py-1 border border-slate-300 rounded text-sm ${user?.uid === u.uid ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && !loading && (
                  <div className="p-8 text-center text-slate-500">{t('কোনো ইউজার পাওয়া যায়নি।', 'No users found.')}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-6">{t('বুকিং তালিকা', 'Booking List')}</h2>
            {/* Bookings Content */}
            <div className="md:hidden space-y-4">
              {bookings.map((b) => (
                <div key={b.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900">{b.roomName || b.roomId}</h3>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {b.id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider 
                      ${b.status === 'confirmed' || b.status === 'accepted' ? 'bg-green-100 text-green-700' : 
                        b.status === 'cancelled' || b.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                        b.status === 'completed' ? 'bg-blue-100 text-blue-700' : 
                        'bg-amber-100 text-amber-700'}`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="font-bold text-slate-800">{b.userName || 'Unknown'}</p>
                    <p className="text-slate-600">{b.userEmail}</p>
                    {b.userPhone && (
                      <div className="flex items-center">
                        <span className="text-slate-600 mr-2">{b.userPhone}</span>
                        <a href={`tel:${b.userPhone}`} className="p-1.5 bg-green-100 text-green-700 rounded-full"><Phone className="w-3 h-3" /></a>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-50">
                    <div>
                      <p>In: {new Date(b.checkIn).toLocaleDateString()}</p>
                      <p>Out: {new Date(b.checkOut).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600 text-sm">৳{b.totalAmount}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    {b.status === 'pending' ? (
                      <div className="flex space-x-2">
                        <button onClick={() => handleUpdateBookingStatus(b.id, 'accepted')} className="flex-1 py-2 bg-green-600 text-white text-xs font-bold rounded">Accept</button>
                        <button onClick={() => handleUpdateBookingStatus(b.id, 'rejected')} className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded">Reject</button>
                      </div>
                    ) : (
                      <select 
                        value={b.status}
                        onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
                      <th className="p-4 font-bold border-b">{t('বুকিং তথ্য', 'Booking Info')}</th>
                      <th className="p-4 font-bold border-b">{t('ইউজার তথ্য', 'User Info')}</th>
                      <th className="p-4 font-bold border-b">{t('তারিখ ও বিল', 'Dates & Bill')}</th>
                      <th className="p-4 font-bold border-b">{t('স্ট্যাটাস', 'Status')}</th>
                      <th className="p-4 font-bold border-b text-right">{t('অ্যাকশন', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{b.roomName || b.roomId}</div>
                          <div className="text-xs text-slate-500 font-mono mt-1">ID: {b.id}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{b.userName || 'Unknown'}</div>
                          <div className="text-sm text-slate-600">{b.userEmail}</div>
                          {b.userPhone && (
                            <div className="flex items-center mt-1">
                              <span className="text-sm text-slate-600 mr-2">{b.userPhone}</span>
                              <a 
                                href={`tel:${b.userPhone}`} 
                                className="inline-flex items-center justify-center p-1.5 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                                title="Call User"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 text-sm">
                          <div><span className="font-medium">In:</span> {new Date(b.checkIn).toLocaleDateString()}</div>
                          <div><span className="font-medium">Out:</span> {new Date(b.checkOut).toLocaleDateString()}</div>
                          <div className="font-bold text-red-600 mt-1">৳{b.totalAmount}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider 
                            ${b.status === 'confirmed' || b.status === 'accepted' ? 'bg-green-100 text-green-700' : 
                              b.status === 'cancelled' || b.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                              b.status === 'completed' ? 'bg-blue-100 text-blue-700' : 
                              'bg-amber-100 text-amber-700'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {b.status === 'pending' ? (
                            <div className="flex justify-end space-x-2">
                              <button 
                                onClick={() => handleUpdateBookingStatus(b.id, 'accepted')}
                                className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => handleUpdateBookingStatus(b.id, 'rejected')}
                                className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <select 
                              value={b.status}
                              onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                              className="px-2 py-1 border border-slate-300 rounded text-sm"
                            >
                              <option value="pending">Pending</option>
                              <option value="accepted">Accepted</option>
                              <option value="completed">Completed</option>
                              <option value="rejected">Rejected</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bookings.length === 0 && !loading && (
                  <div className="p-8 text-center text-slate-500">{t('কোনো বুকিং পাওয়া যায়নি।', 'No bookings found.')}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-6">{t('ওয়েবসাইট কন্টেন্ট ও মিডিয়া', 'Website Content & Media')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* R2 Uploader */}
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold mb-4">Upload Image to Cloudflare R2</h3>
                <p className="text-slate-600 text-sm mb-4">
                  Upload images here to use them across the website. The image will be hosted on your R2 bucket.
                </p>
                
                <div className="flex flex-col space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Folder Path</label>
                    <input 
                      type="text" 
                      value={uploadFolder}
                      onChange={(e) => setUploadFolder(e.target.value)}
                      placeholder="e.g. shotabdi-abashik/rooms"
                      className="w-full border border-slate-300 p-2 rounded"
                    />
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} 
                    className="border border-slate-300 p-2 rounded"
                  />
                  
                  <button 
                    onClick={handleUpload}
                    className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 font-bold w-fit transition-colors"
                  >
                    Upload Image
                  </button>

                  {uploadStatus && <p className="text-sm font-medium text-slate-700">{uploadStatus}</p>}

                  {uploadedUrl && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-bold mb-2 text-green-700">Uploaded Successfully!</h4>
                      <p className="text-xs text-blue-600 break-all mb-3">
                        <a href={uploadedUrl} target="_blank" rel="noreferrer" className="hover:underline">{uploadedUrl}</a>
                      </p>
                      <img 
                        src={uploadedUrl} 
                        alt="Uploaded content" 
                        className="max-w-full h-auto rounded shadow-sm border border-slate-200"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(uploadedUrl);
                          toast.success('URL copied to clipboard!');
                        }}
                        className="mt-3 text-sm bg-slate-200 hover:bg-slate-300 text-slate-800 py-1 px-3 rounded transition-colors"
                      >
                        Copy URL
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Editor Placeholder */}
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center min-h-[300px]">
                <Globe className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold mb-2">Live Web Editor</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                  Use the "Edit Web" button in the navigation bar to edit website content directly on the pages.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ratings' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{t('রেটিং তালিকা', 'Rating List')}</h2>
            </div>
            {/* Ratings Content */}
            <div className="md:hidden space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900">{rating.userName || 'Guest'}</h3>
                      <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < rating.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${rating.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {rating.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 italic">"{rating.comment}"</p>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400">
                      {rating.createdAt?.toMillis ? new Date(rating.createdAt.toMillis()).toLocaleDateString() : 'N/A'}
                    </span>
                    <div className="flex space-x-2">
                      {rating.status === 'pending' && (
                        <button onClick={() => handleUpdateRatingStatus(rating.id, 'approved')} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteRating(rating.id)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
                      <th className="p-4 font-bold border-b">{t('ইউজার', 'User')}</th>
                      <th className="p-4 font-bold border-b">{t('রেটিং', 'Rating')}</th>
                      <th className="p-4 font-bold border-b">{t('মতামত', 'Comment')}</th>
                      <th className="p-4 font-bold border-b">{t('তারিখ', 'Date')}</th>
                      <th className="p-4 font-bold border-b">{t('অবস্থা', 'Status')}</th>
                      <th className="p-4 font-bold border-b text-right">{t('অ্যাকশন', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ratings.map((rating) => (
                      <tr key={rating.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {rating.userPhoto ? (
                              <img src={rating.userPhoto} alt={rating.userName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                <Users className="w-4 h-4" />
                              </div>
                            )}
                            <span className="font-medium text-slate-900">{rating.userName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < rating.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="p-4 max-w-xs truncate" title={rating.comment}>{rating.comment}</td>
                        <td className="p-4 text-slate-500">
                          {rating.createdAt?.toDate ? new Date(rating.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4">
                          <select
                            value={rating.status}
                            onChange={(e) => handleUpdateRatingStatus(rating.id, e.target.value)}
                            className={`p-2 rounded-lg border text-sm font-medium ${
                              rating.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                              rating.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDeleteRating(rating.id)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete Rating"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {ratings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          {t('কোনো রেটিং পাওয়া যায়নি।', 'No ratings found.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'offers' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-2xl">
              <h2 className="text-xl font-bold text-slate-800 mb-6">{t('কাস্টম অফার পাঠান', 'Send Custom Offer')}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('অফার টাইটেল', 'Offer Title')}</label>
                  <input 
                    type="text" 
                    value={offerForm.title}
                    onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                    placeholder="e.g. 20% Discount on Family Suit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('অফার বিবরণ', 'Offer Description')}</label>
                  <textarea 
                    value={offerForm.description}
                    onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                    rows={4}
                    placeholder="Describe the offer details..."
                  />
                </div>
                <button 
                  onClick={async () => {
                    if (!offerForm.title || !offerForm.description) {
                      toast.error('Please fill in both title and description');
                      return;
                    }
                    
                    try {
                      setLoading(true);
                      const usersRef = collection(db, 'users');
                      const snapshot = await getDocs(usersRef);
                      const userEmails = snapshot.docs.map(doc => doc.data().email).filter(Boolean);
                      
                      if (userEmails.length === 0) {
                        toast.error('No users found to send offers to.');
                        return;
                      }
                      
                      const promises = userEmails.map(email => notifyExclusiveOffer(email, offerForm.title, offerForm.description));
                      await Promise.all(promises);
                      
                      toast.success(`Offer sent to ${userEmails.length} users!`);
                      setOfferForm({ title: '', description: '' });
                    } catch (error) {
                      console.error('Error sending offers:', error);
                      toast.error('Failed to send offers');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : t('সবাইকে অফার পাঠান', 'Send Offer to All Users')}
                </button>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-2xl">
              <h2 className="text-xl font-bold text-slate-800 mb-2">{t('ওয়েবসাইট স্পেশাল অফার পাঠান', 'Send Website Special Offer')}</h2>
              <p className="text-slate-600 text-sm mb-6">
                {t('হোমপেজে প্রদর্শিত স্পেশাল অফারটি সকল ব্যবহারকারীকে ইমেইল করুন।', 'Email the special offer displayed on the homepage to all users.')}
              </p>
              
              <button 
                onClick={async () => {
                  try {
                    setLoading(true);
                    
                    // Fetch global discount details from Firestore
                    const discountTitleDoc = await getDoc(doc(db, 'content', 'global_discount_title'));
                    const discountDescDoc = await getDoc(doc(db, 'content', 'global_discount_desc'));
                    const discountRateDoc = await getDoc(doc(db, 'content', 'global_discount_rate'));
                    const heroImageDoc = await getDoc(doc(db, 'content', 'hero_image_1'));
                    
                    const title = discountTitleDoc.exists() ? discountTitleDoc.data().value : 'Special Offer!';
                    const description = discountDescDoc.exists() ? discountDescDoc.data().value : 'Get a massive discount on all room bookings today.';
                    const rate = discountRateDoc.exists() ? discountRateDoc.data().value : '0';
                    const imageUrl = heroImageDoc.exists() ? heroImageDoc.data().value : '';
                    
                    const usersRef = collection(db, 'users');
                    const snapshot = await getDocs(usersRef);
                    const userEmails = snapshot.docs.map(doc => doc.data().email).filter(Boolean);
                    
                    if (userEmails.length === 0) {
                      toast.error('No users found to send offers to.');
                      return;
                    }
                    
                    const promises = userEmails.map(email => 
                      notifyExclusiveOffer(email, `${rate}% OFF: ${title}`, description, imageUrl)
                    );
                    await Promise.all(promises);
                    
                    toast.success(`Special offer sent to ${userEmails.length} users!`);
                  } catch (error) {
                    console.error('Error sending special offer:', error);
                    toast.error('Failed to send special offer');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                {loading ? 'Sending...' : t('সবাইকে স্পেশাল অফার পাঠান', 'Send Special Offer to All')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">{t('নতুন সোশ্যাল লিংক', 'Add Social Link')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input 
                  type="text" 
                  placeholder="Platform (e.g. Facebook)" 
                  value={newSocialLink.platform}
                  onChange={(e) => setNewSocialLink({...newSocialLink, platform: e.target.value})}
                  className="px-4 py-2 border border-slate-300 rounded-lg"
                />
                <input 
                  type="text" 
                  placeholder="URL" 
                  value={newSocialLink.url}
                  onChange={(e) => setNewSocialLink({...newSocialLink, url: e.target.value})}
                  className="px-4 py-2 border border-slate-300 rounded-lg"
                />
                <select 
                  value={newSocialLink.icon}
                  onChange={(e) => setNewSocialLink({...newSocialLink, icon: e.target.value})}
                  className="px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Twitter">Twitter</option>
                  <option value="Youtube">Youtube</option>
                  <option value="Linkedin">Linkedin</option>
                  <option value="Globe">Globe</option>
                </select>
                <button 
                  onClick={handleAddSocialLink}
                  className="bg-red-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-800 transition-colors"
                >
                  {t('যোগ করুন', 'Add Link')}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
                    <th className="p-4 font-bold border-b">Platform</th>
                    <th className="p-4 font-bold border-b">URL</th>
                    <th className="p-4 font-bold border-b">Icon</th>
                    <th className="p-4 font-bold border-b text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {socialLinks.map((link) => (
                    <tr key={link.id}>
                      <td className="p-4 font-medium">{link.platform}</td>
                      <td className="p-4 text-slate-600 truncate max-w-xs">{link.url}</td>
                      <td className="p-4">{link.icon}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDeleteSocialLink(link.id)} className="text-red-600 hover:text-red-800 p-2">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl">
            <h2 className="text-xl font-bold text-slate-800 mb-6">{t('সাধারণ সেটিংস', 'General Settings')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website Name</label>
                <input 
                  type="text" 
                  value={settings.websiteName}
                  onChange={(e) => setSettings({...settings, websiteName: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
                <input 
                  type="text" 
                  value={settings.logoUrl}
                  onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gallery Cleanup Threshold (Max Images)</label>
                <input 
                  type="number" 
                  value={settings.galleryCleanupThreshold}
                  onChange={(e) => setSettings({...settings, galleryCleanupThreshold: Number(e.target.value)})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <button 
                onClick={handleUpdateSettings}
                className="w-full bg-red-700 text-white font-bold py-3 rounded-lg hover:bg-red-800 transition-colors"
              >
                {t('সেভ করুন', 'Save Settings')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
                    <th className="p-4 font-bold border-b">Recipient</th>
                    <th className="p-4 font-bold border-b">Subject</th>
                    <th className="p-4 font-bold border-b">Sent At</th>
                    <th className="p-4 font-bold border-b">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emailLogs.map((log) => (
                    <tr key={log.id} className="text-sm">
                      <td className="p-4">{log.to}</td>
                      <td className="p-4 font-medium">{log.subject}</td>
                      <td className="p-4 text-slate-500">
                        {log.sentAt?.toMillis ? new Date(log.sentAt.toMillis()).toLocaleString() : new Date(log.sentAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">Sent</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {emailLogs.length === 0 && (
                <div className="p-8 text-center text-slate-500">No email logs found.</div>
              )}
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        confirmText="Delete"
      />

      {/* Role Password Modal */}
      {roleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {t('অ্যাডমিন পাসওয়ার্ড প্রয়োজন', 'Admin Password Required')}
            </h3>
            <p className="text-slate-600 mb-4">
              {t('নতুন অ্যাডমিন যুক্ত করতে অনুগ্রহ করে পাসওয়ার্ড দিন।', 'Please enter the password to add a new admin.')}
            </p>
            <input
              type="password"
              value={rolePassword}
              onChange={(e) => setRolePassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-6"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRoleModal({ isOpen: false, uid: '', newRole: '', userEmail: '' })}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                {t('বাতিল', 'Cancel')}
              </button>
              <button
                onClick={confirmRoleUpdate}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors font-medium"
              >
                {t('নিশ্চিত করুন', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
