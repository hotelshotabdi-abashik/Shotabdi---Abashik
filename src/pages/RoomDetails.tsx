import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, CheckCircle2, BedDouble } from 'lucide-react';

import { getOptimizedUrl } from '../lib/imageUtils';

export default function RoomDetails() {
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      if (!title) return;
      
      try {
        const roomsRef = collection(db, 'rooms');
        const snapshot = await getDocs(roomsRef);
        
        let foundRoom = null;
        
        // Find the room where slugified name matches the URL title
        for (const doc of snapshot.docs) {
          const data = doc.data();
          const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          if (slug === title.toLowerCase() || doc.id === title) {
            foundRoom = { id: doc.id, ...data };
            break;
          }
        }
        
        if (foundRoom) {
          setRoom(foundRoom);
        }
      } catch (error) {
        console.error("Error fetching room details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [title]);

  const getStrikethroughPrice = (r: any) => {
    if (r.cutPrice && r.cutPrice > r.price) {
      return r.cutPrice;
    }
    return null;
  };

  if (loading) {
    return null;
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Room not found</h2>
        <Link to="/rooms" className="text-red-600 font-bold hover:underline flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back to Rooms
        </Link>
      </div>
    );
  }

  const slugifiedName = room.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const canonicalUrl = `https://shotabdi-abashik.bd/rooms/${slugifiedName}`;

  return (
    <div className="min-h-screen bg-slate-50 pt-12 sm:pt-24 pb-8 sm:pb-16 overflow-x-hidden">
      <Helmet>
        <title>{room.name} | Hotel Shotabdi Abashik</title>
        <meta name="description" content={room.description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={`${room.name} | Hotel Shotabdi Abashik`} />
        <meta property="og:description" content={room.description} />
        <meta property="og:image" content={room.imageUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={`${room.name} | Hotel Shotabdi Abashik`} />
        <meta property="twitter:description" content={room.description} />
        <meta property="twitter:image" content={room.imageUrl} />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HotelRoom",
            "name": room.name,
            "description": room.description,
            "image": room.imageUrl,
            "url": canonicalUrl,
            "bed": {
              "@type": "BedDetails",
              "numberOfBeds": room.beds || 1,
              "typeOfBed": room.bedType || "Double"
            },
            "occupancy": {
              "@type": "QuantitativeValue",
              "value": room.capacity || 2
            },
            "offers": {
              "@type": "Offer",
              "price": room.price,
              "priceCurrency": "BDT",
              "availability": room.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
            }
          })}
        </script>
      </Helmet>

      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md sm:hidden border-b border-slate-100 px-4 h-12 flex items-center gap-3">
        <Link to="/rooms" className="p-2 bg-slate-100 rounded-full text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-bold text-slate-900 truncate">{room.name}</span>
      </div>

      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        <div className="hidden sm:block">
          <Link to="/rooms" className="inline-flex items-center gap-2 text-slate-600 hover:text-red-600 font-medium mb-8 transition-colors text-base">
            <ArrowLeft className="w-5 h-5" /> {t('সব রুম দেখুন', 'Back to All Rooms')}
          </Link>
        </div>

        <div className="bg-white rounded-none sm:rounded-3xl shadow-xl overflow-hidden border-b sm:border border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Image Section / Hero Component */}
            <div className="relative h-[180px] sm:h-[400px] lg:h-auto bg-slate-100 flex items-center justify-center overflow-hidden">
              <div className="hidden sm:block absolute top-4 left-4 z-10">
                {/* Desktop back button handled above */}
              </div>
              {room.imageUrl && (
                <img 
                  src={getOptimizedUrl(room.imageUrl)} 
                  alt={`${room.name} - Hotel Shotabdi Abashik`} 
                  title={room.description || room.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="eager" 
                  fetchPriority="high" 
                  decoding="async"
                />
              )}
              
              {!room.isAvailable && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <span className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-lg sm:text-xl uppercase tracking-widest shadow-lg">
                    {t('বুকড', 'Booked')}
                  </span>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="p-3.5 sm:p-12 flex flex-col h-full">
              <div className="flex justify-between items-start mb-2 sm:mb-6">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-4xl font-bold text-slate-900 mb-0.5 break-words leading-tight">{room.name}</h1>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[9px] sm:text-sm">
                    <BedDouble className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-red-500" />
                    <span>{room.type}</span>
                  </div>
                </div>
                <div className="text-right">
                  {getStrikethroughPrice(room) ? (
                    <>
                      <div className="text-[9px] sm:text-sm text-slate-400 line-through">৳{getStrikethroughPrice(room)}</div>
                      <div className="text-base sm:text-3xl font-bold text-red-600">৳{room.price}</div>
                    </>
                  ) : (
                    <div className="text-base sm:text-3xl font-bold text-slate-900">৳{room.price}</div>
                  )}
                  <div className="text-[9px] sm:text-sm text-slate-500">{t('প্রতি রাত', 'Per Night')}</div>
                </div>
              </div>

              <div className="mb-3 sm:mb-8">
                <p className="text-[11px] sm:text-lg text-slate-600 leading-relaxed line-clamp-2 sm:line-clamp-none">{room.description}</p>
              </div>

              <div className="mb-4 sm:mb-10">
                <h3 className="text-[11px] sm:text-xl font-bold text-slate-900 mb-2 sm:mb-6">{t('সুবিধাসমূহ', 'Room Amenities')}</h3>
                <ul className="grid grid-cols-2 gap-1.5 sm:gap-4">
                  {room.amenities?.map((amenity: string, index: number) => (
                    <li key={index} className="flex items-center text-[10px] sm:text-slate-700 bg-slate-50 p-1.5 sm:p-3 rounded-lg sm:rounded-xl border border-slate-100">
                      <CheckCircle2 className="w-3 h-3 sm:w-5 sm:h-5 mr-1.5 sm:mr-3 text-red-500 flex-shrink-0" />
                      <span className="font-medium truncate">{amenity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto sm:pt-8 sm:border-t border-slate-100">
                <button 
                  onClick={() => navigate('/rooms', { state: { bookRoom: room.id } })}
                  disabled={!room.isAvailable}
                  className="w-full bg-red-700 hover:bg-red-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 sm:py-4 px-6 sm:px-8 rounded-lg sm:rounded-xl transition-all flex items-center justify-center text-xs sm:text-lg shadow-md active:scale-95"
                >
                  <BedDouble className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                  {room.isAvailable ? t('এখনই বুক করুন', 'Book Now') : t('বর্তমানে উপলব্ধ নয়', 'Unavailable')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
