import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Edit2, Trash2, Check, X, Users, Home, Calendar, Globe, Phone, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';

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
  const [activeTab, setActiveTab] = useState<'rooms' | 'users' | 'bookings' | 'content' | 'ratings'>('rooms');
  
  // Rooms State
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
  }, [activeTab]);

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
      console.error("Error fetching ratings:", error);
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
      console.error("Error fetching rooms:", error);
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
      console.error("Error fetching users:", error);
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
      console.error("Error fetching bookings:", error);
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
      console.error("Error adding room:", error);
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
      console.error("Error updating room:", error);
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
          console.error("Error deleting room:", error);
          toast.error(t("রুম মুছতে সমস্যা হয়েছে।", "Failed to delete room."));
        }
      }
    });
  };

  const handleUpdateBookingStatus = async (id: string, newStatus: string) => {
    try {
      const bookingRef = doc(db, 'bookings', id);
      await updateDoc(bookingRef, { status: newStatus });
      fetchBookings();
      toast.success(t("বুকিং স্ট্যাটাস আপডেট করা হয়েছে!", "Booking status updated!"));
    } catch (error) {
      console.error("Error updating booking:", error);
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
      console.error("Error updating rating:", error);
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
          console.error("Error deleting rating:", error);
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
      console.error("Error updating user:", error);
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

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first!');
      return;
    }

    setUploadStatus('Uploading...');
    
    const cleanFileName = file.name.replace(/\s+/g, '-');
    const fileName = uploadFolder ? `${uploadFolder}/${Date.now()}_${cleanFileName}` : `${Date.now()}_${cleanFileName}`;
    const WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://shotabdi-abashik.hotelshotabdiabashik.workers.dev';
    const AUTH_KEY = import.meta.env.VITE_CLOUDFLARE_WORKER_SECRET || '123456@';

    try {
      const response = await fetch(`${WORKER_URL}/${fileName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${AUTH_KEY}`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      
      const fileUrl = `${WORKER_URL}/${fileName}`;
      
      setUploadStatus('Upload successful!');
      setUploadedUrl(fileUrl);
      toast.success('File uploaded successfully to Cloudflare R2!');
    } catch (error: any) {
      console.error(error);
      setUploadStatus(`Upload failed: ${error.message}`);
      toast.error('Error uploading file.');
    }
  };

  if (loading && activeTab === 'rooms' && rooms.length === 0) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div></div>;
  }

  return (
    <div className="bg-slate-50 py-10 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">{t('অ্যাডমিন প্যানেল', 'Admin Dashboard')}</h1>
        
        {/* Tabs */}
        <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
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
            {/* Rooms Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
