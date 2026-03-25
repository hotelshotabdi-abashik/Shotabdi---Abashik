import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, MapPin, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';

interface Booking {
  id: string;
  roomId: string;
  roomName?: string;
  checkIn: any;
  checkOut: any;
  status: string;
  totalAmount: number;
  createdAt: any;
}

export default function MyStays() {
  const { t, language } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
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

  const handleCancelBooking = async (bookingId: string, createdAt: any) => {
    if (!createdAt) return;
    
    const createdAtTime = createdAt.toMillis ? createdAt.toMillis() : createdAt;
    const timePassed = Date.now() - createdAtTime;
    
    if (timePassed < 5 * 60 * 1000) {
      toast.error(t('বুকিং করার ৫ মিনিটের মধ্যে বাতিল করা যাবে না।', 'Booking cannot be cancelled within 5 minutes of creation.'));
      return;
    }

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled'
      });
      toast.success(t('বুকিং বাতিল করা হয়েছে।', 'Booking has been cancelled.'));
      fetchBookings();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error(t('বুকিং বাতিল করতে সমস্যা হয়েছে।', 'Failed to cancel booking.'));
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div></div>;
  }

  return (
    <div className="bg-slate-50 py-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">{t('আমার বুকিং', 'My Bookings')}</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">{t('আপনার পূর্ববর্তী এবং বর্তমান বুকিংয়ের তালিকা।', 'List of your previous and current bookings.')}</p>
          <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mt-6"></div>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center max-w-3xl mx-auto">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{t('কোনো বুকিং পাওয়া যায়নি', 'No bookings found')}</h3>
            <p className="text-slate-600 mb-6">{t('আপনি এখনও কোনো রুম বুক করেননি।', 'You have not booked any room yet.')}</p>
            <Link to="/rooms" className="inline-block bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-8 rounded-full transition-colors">
              {t('রুম বুক করুন', 'Book a Room')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {bookings.map((booking) => {
              const createdAtTime = booking.createdAt?.toMillis ? booking.createdAt.toMillis() : booking.createdAt;
              const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
              const isWithin5Mins = createdAtTime ? (Date.now() - createdAtTime < 5 * 60 * 1000) : false;

              return (
                <div key={booking.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{booking.roomName || `${t('রুম আইডি:', 'Room ID:')} ${booking.roomId}`}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-1">ID: {booking.id}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      booking.status === 'confirmed' || booking.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      booking.status === 'cancelled' || booking.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-slate-600">
                      <Calendar className="w-5 h-5 mr-3 text-red-500" />
                      <span>{t('চেক-ইন:', 'Check-in:')} {new Date(booking.checkIn).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')}</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <Clock className="w-5 h-5 mr-3 text-red-500" />
                      <span>{t('চেক-আউট:', 'Check-out:')} {new Date(booking.checkOut).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')}</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <MapPin className="w-5 h-5 mr-3 text-red-500" />
                      <span>{t('মোট বিল:', 'Total Bill:')} ৳{booking.totalAmount}</span>
                    </div>
                  </div>

                  {canCancel && (
                    <div className="pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleCancelBooking(booking.id, booking.createdAt)}
                        disabled={isWithin5Mins}
                        className={`flex items-center justify-center w-full py-2 rounded-lg font-medium transition-colors ${
                          isWithin5Mins 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                        title={isWithin5Mins ? t('বুকিং করার ৫ মিনিটের মধ্যে বাতিল করা যাবে না।', 'Cannot cancel within 5 minutes of booking.') : ''}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {t('বুকিং বাতিল করুন', 'Cancel Booking')}
                      </button>
                      {isWithin5Mins && (
                        <p className="text-xs text-center text-slate-500 mt-2">
                          {t('বুকিং করার ৫ মিনিট পর বাতিল করার অপশন চালু হবে।', 'Cancellation will be available 5 minutes after booking.')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
