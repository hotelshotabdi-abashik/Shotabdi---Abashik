import { useState, useEffect } from 'react';
import { BedDouble, CheckCircle2, Wifi, Tv, Wind, Plus, Trash2, Edit2, Save, X, Phone, MessageCircle, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { useLanguage } from '../context/LanguageContext';
import { useContent } from '../context/ContentContext';
import { EditableText } from '../components/EditableText';
import { ImageUploader } from '../components/ImageUploader';
import { ConfirmModal } from '../components/ConfirmModal';
import { notifyBookingSubmitted, notifyAdminNewBooking } from '../services/NotificationService';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getOptimizedUrl } from '../lib/imageUtils';

interface Room {
  id: string;
  name: string;
  type: string;
  price: number;
  cutPrice?: number;
  amenities: string[];
  imageUrl: string;
  description: string;
  isAvailable: boolean;
  order?: number;
  isRecommended?: boolean;
}

const defaultRooms = [
  {
    name: 'Single Delux',
    type: 'Single Delux',
    price: 1500,
    cutPrice: 2000,
    amenities: ['Free Wifi', 'Single Bed'],
    imageUrl: 'https://picsum.photos/seed/single/800/600',
    description: 'Comfortable single room perfect for solo travelers.',
    isAvailable: true,
    order: 1,
  },
  {
    name: 'Double Delux',
    type: 'Double Delux',
    price: 2500,
    cutPrice: 3333,
    amenities: ['Free Wifi', 'Double Bed'],
    imageUrl: 'https://picsum.photos/seed/double/800/600',
    description: 'Spacious double room for couples or friends.',
    isAvailable: true,
    order: 2,
  },
  {
    name: 'Family Suit',
    type: 'Family Suit',
    price: 4000,
    cutPrice: 5333,
    amenities: ['Free Wifi', '3 Queen Beds', 'AC'],
    imageUrl: 'https://picsum.photos/seed/family/800/600',
    description: 'Large suite suitable for the whole family.',
    isAvailable: true,
    order: 3,
  },
  {
    name: 'Super Delux',
    type: 'Super Delux',
    price: 3500,
    cutPrice: 4666,
    amenities: ['Free Wifi', 'Double Bed', 'AC'],
    imageUrl: 'https://picsum.photos/seed/super/800/600',
    description: 'Premium room with extra comfort and air conditioning.',
    isAvailable: true,
    order: 4,
  }
];

export default function Rooms() {
  const { t } = useLanguage();
  const { editMode, content } = useContent();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean, passwordInput: string }>({ isOpen: false, passwordInput: '' });

  const getStrikethroughPrice = (room: Room) => {
    if (room.cutPrice && room.cutPrice > room.price) {
      return room.cutPrice;
    }
    return null;
  };

  // Booking Modal State
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [checkIn, setCheckIn] = useState(new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (location.state?.bookRoom && rooms.length > 0) {
      const roomToBook = rooms.find(r => r.id === location.state.bookRoom);
      if (roomToBook && roomToBook.isAvailable) {
        setBookingRoom(roomToBook);
        // Clear the state so it doesn't reopen on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, rooms]);

  useEffect(() => {
    const roomsRef = collection(db, 'rooms');
    const unsubscribe = onSnapshot(roomsRef, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Room[];
      
      // Sort rooms to maintain consistent order (e.g., by order field, then price)
      roomsData.sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return a.price - b.price;
      });
      
      setRooms(roomsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching rooms:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleBook = async (room: Room) => {
    if (!user) {
      toast.error(t("বুকিং করতে অনুগ্রহ করে লগইন করুন।", "Please login to book a room."));
      return;
    }
    if (!profile?.profileCompleted) {
      navigate('/profile');
      return;
    }

    // Check for existing bookings today
    try {
      const bookingsRef = collection(db, 'bookings');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const q = query(
        bookingsRef,
        where('userId', '==', user.uid)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Filter for today's bookings
        const todaysBookings = snapshot.docs.filter(doc => {
          const data = doc.data() as any;
          const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || 0);
          return createdAt >= today.getTime();
        });

        if (todaysBookings.length > 0) {
          // Sort by newest first
          todaysBookings.sort((a, b) => {
            const dataA = a.data() as any;
            const dataB = b.data() as any;
            const timeA = dataA.createdAt?.toMillis ? dataA.createdAt.toMillis() : (dataA.createdAt || 0);
            const timeB = dataB.createdAt?.toMillis ? dataB.createdAt.toMillis() : (dataB.createdAt || 0);
            return timeB - timeA;
          });

          // User has a booking today
          const latestBooking = todaysBookings[0].data() as any;
          const bookingTime = latestBooking.createdAt?.toMillis ? latestBooking.createdAt.toMillis() : (latestBooking.createdAt || Date.now());
          const timeSinceBooking = Date.now() - bookingTime;
          const cooldownMs = 30 * 60 * 1000; // 30 minutes
          
          if (timeSinceBooking < cooldownMs) {
            const remainingMinutes = Math.ceil((cooldownMs - timeSinceBooking) / (60 * 1000));
            toast.error(t(`আপনি ইতিমধ্যে একটি বুকিং করেছেন। অনুগ্রহ করে ${remainingMinutes} মিনিট অপেক্ষা করুন।`, `You have already made a booking. Please wait ${remainingMinutes} minutes.`));
            return;
          }
          
          // Check if the previous booking is still pending or accepted
          const activeBookings = todaysBookings.filter(doc => {
            const status = (doc.data() as any).status;
            return status === 'pending' || status === 'accepted';
          });
          
          if (activeBookings.length > 0) {
             toast.error(t('আপনার ইতিমধ্যে একটি সক্রিয় বুকিং আছে। নতুন বুকিং করার আগে অনুগ্রহ করে সেটি বাতিল করুন অথবা অ্যাডমিন এর অনুমোদনের জন্য অপেক্ষা করুন।', 'You already have an active booking. Please cancel it or wait for admin approval before making a new one.'));
             return;
          }
        }
      }
    } catch (error) {
      console.error("Error checking existing bookings:", error);
    }

    setBookingRoom(room);
    setCheckIn(new Date().toISOString().split('T')[0]);
    setCheckOut(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setShowConfirmation(false);
  };

  const submitBooking = async () => {
    if (!checkIn || !checkOut) {
      toast.error(t('অনুগ্রহ করে চেক-ইন এবং চেক-আউট তারিখ নির্বাচন করুন।', 'Please select check-in and check-out dates.'));
      return;
    }
    
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    
    if (inDate >= outDate) {
      toast.error(t('চেক-আউট তারিখ চেক-ইন তারিখের পরে হতে হবে।', 'Check-out date must be after check-in date.'));
      return;
    }

    const nights = Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
    const pricePerNight = bookingRoom?.price || 0;
    const totalAmount = nights * pricePerNight;

    try {
      const bookingsRef = collection(db, 'bookings');
      const newDocRef = doc(bookingsRef);
      await setDoc(newDocRef, {
        id: newDocRef.id,
        roomId: bookingRoom?.id,
        roomName: bookingRoom?.name,
        userId: user?.uid,
        userName: profile?.displayName || user?.displayName || 'Unknown',
        userPhone: profile?.phone || '',
        userEmail: user?.email || '',
        checkIn: inDate,
        checkOut: outDate,
        totalAmount,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      // Send booking notification
      if (user?.email) {
        notifyBookingSubmitted(
          user.email,
          profile?.displayName || user?.displayName || 'User',
          bookingRoom?.name || 'Room',
          totalAmount,
          profile?.phone || 'N/A',
          inDate,
          outDate
        ).catch(console.error);
      }
      
      // Send admin notification
      notifyAdminNewBooking({
        userName: profile?.displayName || user?.displayName || 'User',
        userEmail: user?.email || 'Unknown',
        userPhone: profile?.phone || 'N/A',
        roomName: bookingRoom?.name || 'Room',
        totalAmount,
        checkIn: inDate,
        checkOut: outDate
      }).catch(console.error);
      
      setBookingRoom(null);
      setShowConfirmation(false);
      setBookingSuccess(true);
    } catch (error) {
      console.error("Error submitting booking:", error);
      toast.error(t('বুকিং সম্পন্ন করতে সমস্যা হয়েছে।', 'Failed to submit booking.'));
    }
  };

  const handleRestoreDefaults = async () => {
    setPasswordModal({ isOpen: true, passwordInput: '' });
  };

  const confirmRestoreDefaults = async () => {
    if (passwordModal.passwordInput !== 'kahar02') {
      toast.error('Incorrect password');
      return;
    }
    
    setPasswordModal({ isOpen: false, passwordInput: '' });
    
    setConfirmModal({
      isOpen: true,
      title: 'Restore Default Rooms',
      message: 'Are you sure you want to restore the default rooms? This will DELETE ALL existing rooms and their images from storage, then add the default rooms.',
      onConfirm: async () => {
        try {
          const roomsRef = collection(db, 'rooms');
          
          // Delete all existing rooms first
          const snapshot = await getDocs(roomsRef);
          
          // Delete images from R2
          for (const docSnapshot of snapshot.docs) {
            const roomData = docSnapshot.data();
            if (roomData.imageUrl && roomData.imageUrl.includes('workers.dev')) {
              try {
                const urlObj = new URL(roomData.imageUrl);
                const pathname = urlObj.pathname;
                const workerUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;
                const secret = import.meta.env.VITE_CLOUDFLARE_WORKER_SECRET;
                
                if (workerUrl && secret) {
                  await fetch(`${workerUrl}${pathname}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${secret}`
                    }
                  });
                }
              } catch (err) {
                console.error("Failed to delete image from R2:", err);
              }
            }
          }
          
          const deletePromises = snapshot.docs.map(docSnapshot => deleteDoc(doc(db, 'rooms', docSnapshot.id)));
          await Promise.all(deletePromises);

          // Add default rooms
          for (const room of defaultRooms) {
            const newRoomRef = doc(roomsRef);
            await setDoc(newRoomRef, { ...room, id: newRoomRef.id, createdAt: serverTimestamp() });
          }
          toast.success('Default rooms restored successfully');
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'rooms');
          toast.error('Failed to restore default rooms');
        }
      }
    });
  };

  const handleAdd = async () => {
    try {
      const roomsRef = collection(db, 'rooms');
      const newRoomRef = doc(roomsRef);
      await setDoc(newRoomRef, {
        id: newRoomRef.id,
        name: 'New Room',
        type: 'Single Delux',
        price: 1000,
        cutPrice: 1500,
        amenities: ['Free Wifi', 'Single Bed', 'AC'],
        imageUrl: 'https://picsum.photos/seed/newroom/800/600',
        description: 'Room description',
        isAvailable: true,
        order: rooms.length + 1,
        createdAt: serverTimestamp()
      });
      toast.success('Room added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rooms');
      toast.error('Failed to add room');
    }
  };

  const handleRemove = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Room',
      message: `Are you sure you want to delete "${name}" from the Rooms page? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'rooms', id));
          toast.success('Room removed successfully');
        } catch (error) {
          console.error("Error removing room:", error);
          toast.error('Failed to remove room');
        }
      }
    });
  };

  const startEditing = (room: Room) => {
    setEditingId(room.id);
    setEditForm({
      name: room.name || '',
      type: room.type || '',
      price: room.price || 0,
      cutPrice: room.cutPrice || 0,
      amenities: room.amenities ? room.amenities.join(', ') : '',
      imageUrl: room.imageUrl || '',
      description: room.description || '',
      isAvailable: room.isAvailable !== false,
      order: room.order || 0,
      isRecommended: room.isRecommended || false
    });
  };

  const handleSave = async (id: string) => {
    try {
      const updatedRoom = {
        ...editForm,
        price: Number(editForm.price),
        cutPrice: Number(editForm.cutPrice) || 0,
        amenities: editForm.amenities.split(',').map((a: string) => a.trim()).filter(Boolean)
      };
      await updateDoc(doc(db, 'rooms', id), updatedRoom);
      setEditingId(null);
      toast.success('Room updated successfully');
    } catch (error) {
      console.error("Error updating room:", error);
      toast.error('Failed to update room');
    }
  };

  return (
    <div className="bg-slate-50 py-16">
      <Helmet>
        <title>Our Rooms | Hotel Shotabdi Abashik</title>
        <meta name="description" content="Explore our comfortable and affordable rooms in Sylhet. Choose from Single Delux, Double Delux, Family Suit, and Super Delux." />
        <meta name="keywords" content="Hotel rooms Sylhet, Single Delux, Double Delux, Family Suit, Super Delux, affordable stay Sylhet" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${window.location.origin}/rooms`} />
        
        <meta property="og:title" content="Our Rooms | Hotel Shotabdi Abashik" />
        <meta property="og:description" content="Explore our comfortable and affordable rooms in Sylhet. Choose from Single Delux, Double Delux, Family Suit, and Super Delux." />
        <meta property="og:url" content={`${window.location.origin}/rooms`} />
        <meta property="og:type" content="website" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Rooms | Hotel Shotabdi Abashik" />
        <meta name="twitter:description" content="Explore our comfortable and affordable rooms in Sylhet. Choose from Single Delux, Double Delux, Family Suit, and Super Delux." />

        {/* Structured Data for Room List */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": rooms.map((room, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Accommodation",
                "name": room.name,
                "description": room.description,
                "image": room.imageUrl,
                "offers": {
                  "@type": "Offer",
                  "price": room.price,
                  "priceCurrency": "BDT"
                }
              }
            }))
          })}
        </script>
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 relative">
          <EditableText
            contentKey="rooms_title"
            defaultText="Our Rooms"
            className="text-4xl font-extrabold text-slate-900 mb-4"
          />
          <EditableText
            contentKey="rooms_subtitle"
            defaultText="We have various types of rooms according to your needs and budget."
            className="text-lg text-slate-600 max-w-2xl mx-auto"
            multiline
          />
          <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mt-6"></div>
          
          {/* Global Discount Banner */}
          <div className="mt-10 relative bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white p-6 rounded-2xl shadow-2xl overflow-hidden group max-w-3xl mx-auto border border-red-500">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 opacity-20 blur-xl group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <div className="relative flex flex-col sm:flex-row items-center justify-center sm:justify-between z-10 gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-white text-red-700 font-black text-4xl px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transform -rotate-3 hover:rotate-0 transition-transform duration-300 flex items-center">
                  <EditableText 
                    contentKey="global_discount_rate" 
                    defaultText="0" 
                  />% OFF
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
                    <EditableText contentKey="global_discount_title" defaultText="Special Offer!" />
                  </h3>
                  <p className="text-red-100 font-medium mt-1">
                    <EditableText contentKey="global_discount_desc" defaultText="Get a massive discount on all room bookings today." multiline />
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {editMode && (
            <div className="absolute top-0 right-0 flex gap-2">
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Room
              </button>
              <button
                onClick={handleRestoreDefaults}
                className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors text-sm font-bold"
              >
                Restore Defaults
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-10">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-500">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500">No rooms available.</div>
          ) : rooms.map((room: Room) => (
            <div key={room.id} className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100 flex flex-col hover:shadow-xl transition-shadow relative group">
              {editMode && editingId !== room.id && (
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => startEditing(room)}
                    className="p-2 bg-white text-slate-600 rounded-full hover:bg-slate-100 shadow"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(room.id, room.name)}
                    className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 shadow"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {editingId === room.id ? (
                <div className="p-6 space-y-4">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-2 border rounded font-bold"
                    placeholder="Room Name"
                  />
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="Single Delux">Single Delux</option>
                    <option value="Double Delux">Double Delux</option>
                    <option value="Family Suit">Family Suit</option>
                    <option value="Super Delux">Super Delux</option>
                  </select>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="Price"
                  />
                  <input
                    type="number"
                    value={editForm.cutPrice}
                    onChange={(e) => setEditForm({ ...editForm, cutPrice: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="Cut Price (Original Price)"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="Description"
                    rows={3}
                  />
                  <input
                    type="text"
                    value={editForm.amenities}
                    onChange={(e) => setEditForm({ ...editForm, amenities: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="Amenities (comma separated)"
                  />
                  <div className="w-full">
                    <label className="block text-sm font-medium text-slate-700 mb-1">List Placement Order</label>
                    <input
                      type="number"
                      value={editForm.order || ''}
                      onChange={(e) => setEditForm({ ...editForm, order: Number(e.target.value) })}
                      className="w-full p-2 border rounded"
                      placeholder="e.g. 1, 2, 3 (Higher numbers appear later)"
                    />
                  </div>
                  <div className="w-full flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isRecommended"
                      checked={editForm.isRecommended || false}
                      onChange={(e) => setEditForm({ ...editForm, isRecommended: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <label htmlFor="isRecommended" className="text-sm font-medium text-slate-700">
                      Mark as Recommended (Shows on top)
                    </label>
                  </div>
                  <div className="w-full">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Room Image</label>
                    <ImageUploader
                      value={editForm.imageUrl || ''}
                      onChange={(url) => setEditForm({ ...editForm, imageUrl: url })}
                      folder="shotabdi-abashik/rooms"
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleSave(room.id)}
                      className="flex-1 bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 bg-slate-200 text-slate-700 py-2 rounded flex items-center justify-center gap-2 hover:bg-slate-300"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Link to={`/rooms/${room.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`} className="relative aspect-video sm:h-64 bg-slate-100 block overflow-hidden">
                    <img src={room.imageUrl} alt={room.name} title={room.description || room.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" loading="eager" fetchPriority="high" decoding="async" />
                    {room.isRecommended && (
                      <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" /> Recommended
                      </div>
                    )}
                  </Link>
                  <div className="p-3 sm:p-8 flex-grow flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-2 sm:mb-4">
                      <div className="min-w-0 flex-1 pr-1 sm:pr-2">
                        <Link to={`/rooms/${room.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`}>
                          <h2 className="text-sm sm:text-2xl font-bold text-slate-900 truncate hover:text-red-600 transition-colors">{room.name}</h2>
                        </Link>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0 mt-1 sm:mt-0">
                        {getStrikethroughPrice(room) ? (
                          <>
                            <div className="text-[8px] sm:text-sm text-slate-400 line-through">৳{getStrikethroughPrice(room)}</div>
                            <div className="text-sm sm:text-2xl font-bold text-red-600">৳{room.price}</div>
                          </>
                        ) : (
                          <div className="text-sm sm:text-2xl font-bold text-slate-900">৳{room.price}</div>
                        )}
                        <div className="text-[8px] sm:text-xs text-slate-500">{t('রাত', 'Night')}</div>
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-base text-slate-600 mb-3 sm:mb-6 flex-grow line-clamp-2 sm:line-clamp-none leading-tight">{room.description}</p>
                    
                    <div className="mb-3 sm:mb-8">
                      <h4 className="text-[9px] sm:text-sm font-bold text-slate-900 mb-1.5 sm:mb-3 uppercase tracking-wider">{t('সুবিধাসমূহ', 'Amenities')}</h4>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
                        {room.amenities?.map((amenity, index) => (
                          <li key={index} className="flex items-start text-[9px] sm:text-sm text-slate-600">
                            <CheckCircle2 className="w-2.5 h-2.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-red-500 flex-shrink-0 mt-0.5" />
                            <span className="leading-tight break-words">{amenity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex gap-2 sm:gap-4">
                      <Link 
                        to={`/rooms/${room.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl transition-colors flex items-center justify-center text-xs sm:text-base"
                      >
                        {t('বিস্তারিত', 'Details')}
                      </Link>
                      <button 
                        onClick={() => handleBook(room)}
                        className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl transition-colors flex items-center justify-center text-xs sm:text-base"
                      >
                        <BedDouble className="w-3 h-3 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                        {t('বুক করুন', 'Book Now')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        confirmText="Confirm"
      />

      {/* Password Modal */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Enter Password</h2>
            <p className="text-slate-600 mb-6">Please enter the password to restore default rooms.</p>
            <input
              type="password"
              value={passwordModal.passwordInput}
              onChange={(e) => setPasswordModal({ ...passwordModal, passwordInput: e.target.value })}
              className="w-full p-3 border rounded-xl mb-6 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Password"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPasswordModal({ isOpen: false, passwordInput: '' })}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestoreDefaults}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            {!showConfirmation ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-slate-900">{t('রুম বুকিং', 'Book Room')}</h3>
                  <button onClick={() => setBookingRoom(null)} className="text-slate-500 hover:text-slate-700">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="mb-4">
                  <p className="font-bold text-lg">{bookingRoom.name}</p>
                  <p className="text-slate-600">
                    {t('মূল্য:', 'Price:')} ৳{bookingRoom.price} / {t('রাত', 'Night')}
                  </p>
                </div>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('চেক-ইন তারিখ', 'Check-in Date')}</label>
                    <input 
                      type="date" 
                      value={checkIn}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('চেক-আউট তারিখ', 'Check-out Date')}</label>
                    <input 
                      type="date" 
                      value={checkOut}
                      min={checkIn || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                  {checkIn && checkOut && new Date(checkIn) < new Date(checkOut) && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{t('মোট রাত:', 'Total Nights:')}</span>
                        <span className="font-bold">{Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-red-700">
                        <span>{t('মোট বিল:', 'Total Bill:')}</span>
                        <span>৳{Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)) * bookingRoom.price}</span>
                      </div>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => {
                    if (!checkIn || !checkOut || new Date(checkIn) >= new Date(checkOut)) {
                      toast.error(t('অনুগ্রহ করে সঠিক তারিখ নির্বাচন করুন।', 'Please select valid dates.'));
                      return;
                    }
                    setShowConfirmation(true);
                  }}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {t('বুকিং এগিয়ে যান', 'Continue to Booking')}
                </button>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-slate-900">{t('তথ্য যাচাই করুন', 'Verify Information')}</h3>
                  <button onClick={() => setShowConfirmation(false)} className="text-slate-500 hover:text-slate-700">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-slate-600 mb-6 text-sm">
                  {t('অনুগ্রহ করে আপনার বুকিং তথ্য পুনরায় যাচাই করুন। বুকিং নিশ্চিত করার পর এই তথ্যগুলো ইমেইলে পাঠানো হবে।', 'Please re-check your booking information. These details will be sent to your email after confirmation.')}
                </p>
                
                <div className="space-y-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-slate-500">{t('নাম:', 'Name:')}:</span>
                    <span className="font-bold text-slate-900">{profile?.displayName || user?.displayName}</span>
                    
                    <span className="text-slate-500">{t('ইমেইল:', 'Email:')}:</span>
                    <span className="font-bold text-slate-900 truncate">{user?.email}</span>
                    
                    <span className="text-slate-500">{t('ফোন:', 'Phone:')}:</span>
                    <span className="font-bold text-slate-900">{profile?.phone || 'N/A'}</span>
                    
                    <span className="text-slate-500">{t('রুম:', 'Room:')}:</span>
                    <span className="font-bold text-slate-900">{bookingRoom.name}</span>
                    
                    <span className="text-slate-500">{t('চেক-ইন:', 'Check-in:')}:</span>
                    <span className="font-bold text-slate-900">{new Date(checkIn).toLocaleDateString()}</span>
                    
                    <span className="text-slate-500">{t('চেক-আউট:', 'Check-out:')}:</span>
                    <span className="font-bold text-slate-900">{new Date(checkOut).toLocaleDateString()}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                    <span className="text-slate-600 font-bold">{t('মোট বিল:', 'Total Bill:')}</span>
                    <span className="text-xl font-black text-red-700">৳{Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)) * bookingRoom.price}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                  >
                    {t('পিছনে', 'Back')}
                  </button>
                  <button 
                    onClick={submitBooking}
                    className="flex-[2] bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    {t('নিশ্চিত করুন', 'Confirm & Book')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Success Modal with Help Desk */}
      {bookingSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{t('বুকিং সফল হয়েছে!', 'Booking Successful!')}</h3>
            <p className="text-slate-600 mb-6">
              {t('আপনার বুকিংটি পেন্ডিং অবস্থায় আছে। দ্রুত কনফার্মেশনের জন্য আমাদের সাথে যোগাযোগ করুন।', 'Your booking is pending. For faster response, please contact our help desk.')}
            </p>
            
            <div className="space-y-3 mb-6">
              <a 
                href="tel:+8801711223344" 
                className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition-colors"
              >
                <Phone className="w-5 h-5" />
                {t('সরাসরি কল করুন', 'Direct Call')}
              </a>
              <a 
                href="https://wa.me/8801711223344" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                {t('হোয়াটসঅ্যাপ মেসেজ', 'WhatsApp Message')}
              </a>
            </div>
            
            <button 
              onClick={() => {
                setBookingSuccess(false);
                navigate('/my-stays');
              }}
              className="text-slate-500 hover:text-slate-700 font-medium underline"
            >
              {t('আমার বুকিং দেখুন', 'View My Bookings')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
