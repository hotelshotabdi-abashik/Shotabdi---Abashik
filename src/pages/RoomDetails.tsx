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
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/rooms" className="inline-flex items-center gap-2 text-slate-600 hover:text-red-600 font-medium mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" /> {t('সব রুম দেখুন', 'Back to All Rooms')}
        </Link>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Image Section / Hero Component */}
            <div className="relative h-[300px] sm:h-[400px] lg:h-auto bg-slate-100 flex items-center justify-center overflow-hidden">
              {room.imageUrl && (
                <img 
                  src={getOptimizedUrl(room.imageUrl)} 
                  alt={`${room.name} - Hotel Shotabdi Abashik`} 
                  title={room.description || room.name}
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                  loading="eager" 
                  fetchPriority="high" 
                  decoding="async"
                />
              )}
              
              {!room.isAvailable && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <span className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-xl uppercase tracking-widest shadow-lg">
                    {t('বুকড', 'Booked')}
                  </span>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="p-8 lg:p-12 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">{room.name}</h1>
                </div>
                <div className="text-right bg-red-50 p-4 rounded-2xl border border-red-100">
                  {getStrikethroughPrice(room) ? (
                    <>
                      <div className="text-sm text-slate-400 line-through mb-1">৳{getStrikethroughPrice(room)}</div>
                      <div className="text-3xl font-bold text-red-600">৳{room.price}</div>
                    </>
                  ) : (
                    <div className="text-3xl font-bold text-slate-900">৳{room.price}</div>
                  )}
                  <div className="text-sm text-slate-500 mt-1">{t('প্রতি রাত', 'Per Night')}</div>
                </div>
              </div>

              <div className="prose prose-slate max-w-none mb-8">
                <p className="text-slate-600 text-lg leading-relaxed">{room.description}</p>
              </div>

              <div className="mb-10">
                <h3 className="text-xl font-bold text-slate-900 mb-6">{t('সুবিধাসমূহ', 'Room Amenities')}</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {room.amenities?.map((amenity: string, index: number) => (
                    <li key={index} className="flex items-start text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <CheckCircle2 className="w-5 h-5 mr-3 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="font-medium leading-tight break-words">{amenity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-8 border-t border-slate-100">
                <button 
                  onClick={() => navigate('/rooms', { state: { bookRoom: room.id } })}
                  disabled={!room.isAvailable}
                  className="w-full bg-red-700 hover:bg-red-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-2xl transition-all flex items-center justify-center text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <BedDouble className="w-6 h-6 mr-3" />
                  {room.isAvailable ? t('এখনই বুক করুন', 'Book This Room Now') : t('বর্তমানে উপলব্ধ নয়', 'Currently Unavailable')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
