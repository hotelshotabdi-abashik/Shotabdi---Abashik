import { useState, useEffect } from 'react';
import { BedDouble, CheckCircle2, Calendar, Clock, XCircle, Phone, MessageCircle, X, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { useLanguage } from '../context/LanguageContext';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  checkIn: any;
  checkOut: any;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: any;
}

export default function MyStays() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef, 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(bookingsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bookings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled'
      });
      toast.success(t('বুকিং বাতিল করা হয়েছে।', 'Booking cancelled successfully.'));
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error(t('বুকিং বাতিল করতে সমস্যা হয়েছে।', 'Failed to cancel booking.'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider">{t('পেন্ডিং', 'Pending')}</span>;
      case 'accepted':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">{t('গৃহীত', 'Accepted')}</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider">{t('প্রত্যাখ্যাত', 'Rejected')}</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wider">{t('বাতিল', 'Cancelled')}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <Helmet>
        <title>My Stays | Hotel Shotabdi Abashik</title>
        <meta name="description" content="View and manage your room bookings at Hotel Shotabdi Abashik." />
      </Helmet>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">{t('আমার বুকিং', 'My Stays')}</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('আপনার সকল বুকিংয়ের তালিকা এখানে দেখতে পাবেন। কোনো সাহায্যের জন্য হেল্প ডেস্কে যোগাযোগ করুন।', 'View all your room bookings here. Contact our help desk for any assistance.')}
          </p>
          <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mt-6"></div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mb-4"></div>
            <p className="text-slate-500">{t('বুকিং লোড হচ্ছে...', 'Loading bookings...')}</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('কোনো বুকিং পাওয়া যায়নি', 'No Bookings Found')}</h3>
            <p className="text-slate-500 mb-8">{t('আপনি এখনও কোনো রুম বুক করেননি।', 'You haven\'t booked any rooms yet.')}</p>
            <button 
              onClick={() => navigate('/rooms')}
              className="bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-8 rounded-xl transition-colors inline-flex items-center"
            >
              <BedDouble className="w-5 h-5 mr-2" />
              {t('রুম দেখুন', 'View Rooms')}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div 
                key={booking.id} 
                id={`booking-${booking.id}`}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">{booking.roomName}</h3>
                      <p className="text-slate-500 text-sm">Booking ID: <span className="font-mono">{booking.id}</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(booking.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('চেক-ইন', 'Check-in')}</p>
                        <p className="text-slate-900 font-bold">{new Date(booking.checkIn?.seconds * 1000).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('চেক-আউট', 'Check-out')}</p>
                        <p className="text-slate-900 font-bold">{new Date(booking.checkOut?.seconds * 1000).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Clock className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('মোট বিল', 'Total Bill')}</p>
                        <p className="text-green-700 font-black text-xl">৳{booking.totalAmount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-4">
                      <a 
                        href="tel:+8801711223344" 
                        className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-red-700 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        {t('কল করুন', 'Call Us')}
                      </a>
                      <a 
                        href="https://wa.me/8801711223344" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                    </div>
                    
                    {booking.status === 'pending' && (
                      <button 
                        onClick={() => handleCancelBooking(booking.id)}
                        className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-800 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        {t('বুকিং বাতিল করুন', 'Cancel Booking')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-12 bg-red-50 rounded-2xl p-8 border border-red-100 text-center">
          <h3 className="text-xl font-bold text-red-900 mb-2">{t('সাহায্য প্রয়োজন?', 'Need Help?')}</h3>
          <p className="text-red-700 mb-6">{t('আপনার বুকিং নিয়ে কোনো প্রশ্ন থাকলে সরাসরি আমাদের হেল্প ডেস্কে যোগাযোগ করুন।', 'If you have any questions about your booking, contact our help desk directly.')}</p>
          <button 
            onClick={() => navigate('/help-desk')}
            className="bg-white text-red-700 hover:bg-red-50 font-bold py-3 px-8 rounded-xl transition-colors border border-red-200"
          >
            {t('হেল্প ডেস্ক', 'Help Desk')}
          </button>
        </div>
      </div>
    </div>
  );
}
