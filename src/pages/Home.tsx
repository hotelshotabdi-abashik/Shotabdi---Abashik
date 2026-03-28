import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BedDouble, CheckCircle2, MapPin, Percent, Utensils, Compass, PhoneCall, ArrowRight, Star, Camera, Calendar, Search, Edit2, X, Upload, Trash2, Loader2, Wifi, Wind, Coffee, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useContent } from '../context/ContentContext';
import { EditableText } from '../components/EditableText';
import { EditableImage } from '../components/EditableImage';
import { RatingsSection } from '../components/RatingsSection';
import { ImageViewModal } from '../components/ImageViewModal';
import { uploadToR2, deleteFromR2 } from '../lib/r2';
import { toast } from 'sonner';

export default function Home() {
  const { t } = useLanguage();
  const { content, editMode, updateContent } = useContent();
  const navigate = useNavigate();
  const rawGalleryImages: any[] = content.galleryImages || [];
  const galleryImages = rawGalleryImages.map(img => typeof img === 'string' ? { url: img } : img);
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomType, setRoomType] = useState('');
  
  const [isHeroEditModalOpen, setIsHeroEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [rooms, setRooms] = useState<any[]>([]);

  const globalDiscountRate = parseInt(content.global_discount_rate || '0', 10);

  const getDiscountPercentage = (room: any) => {
    if (room.cutPrice && room.cutPrice > room.price) {
      return Math.round(((room.cutPrice - room.price) / room.cutPrice) * 100);
    }
    return globalDiscountRate;
  };

  const getStrikethroughPrice = (room: any) => {
    if (room.cutPrice && room.cutPrice > room.price) {
      return room.cutPrice;
    }
    if (globalDiscountRate > 0) {
      return Math.round(room.price / (1 - globalDiscountRate / 100));
    }
    return null;
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const q = query(collection(db, 'rooms'));
        const snapshot = await getDocs(q);
        const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort rooms to maintain consistent order (e.g., by order field, then price)
        roomsData.sort((a: any, b: any) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          if (a.order !== undefined) return -1;
          if (b.order !== undefined) return 1;
          return a.price - b.price;
        });
        
        setRooms(roomsData.slice(0, 4)); // Show top 4 rooms
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };
    fetchRooms();
  }, []);

  const heroSlots = [
    { key: 'home_hero_bg_1', default: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80' },
    { key: 'home_hero_bg_2', default: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1920&q=80' },
    { key: 'home_hero_bg_3', default: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1920&q=80' },
    { key: 'home_hero_bg_4', default: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80' },
    { key: 'home_hero_bg_5', default: 'https://images.unsplash.com/photo-1542314831-c6a4d14d8373?auto=format&fit=crop&w=1920&q=80' },
  ];

  const activeHeroImages = heroSlots.filter(slot => {
    const val = content[slot.key];
    if (editMode) return true; // Show all slots in edit mode
    if (val === 'deleted') return false;
    return true; // Show if it has a custom URL or falls back to default
  });

  // If somehow all are deleted, show at least one default so it's not empty
  if (activeHeroImages.length === 0 && !editMode) {
    activeHeroImages.push(heroSlots[0]);
  }

  useEffect(() => {
    if (currentImageIndex >= activeHeroImages.length) {
      setCurrentImageIndex(0);
    }
  }, [activeHeroImages.length, currentImageIndex]);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentImageIndex((prev) => {
      let nextIndex = prev + newDirection;
      if (nextIndex < 0) nextIndex = activeHeroImages.length - 1;
      if (nextIndex >= activeHeroImages.length) nextIndex = 0;
      return nextIndex;
    });
  };

  useEffect(() => {
    if (activeHeroImages.length <= 1) return;
    const interval = setInterval(() => {
      paginate(1);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeHeroImages.length]);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 1
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 1
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to rooms page, optionally passing search params if we implement them later
    navigate('/rooms');
  };

  const handleHeroImageUpload = async (slotKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 5) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingSlot(slotKey);
    try {
      const url = await uploadToR2(file);
      
      // Delete old image if it exists and is from our R2
      const oldUrl = content[slotKey];
      if (oldUrl && oldUrl !== 'deleted' && oldUrl.includes('workers.dev')) {
        await deleteFromR2(oldUrl);
      }
      
      await updateContent(slotKey, url);
      toast.success('Hero image updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload hero image');
    } finally {
      setUploadingSlot(null);
      if (fileInputRefs.current[slotKey]) {
        fileInputRefs.current[slotKey]!.value = '';
      }
    }
  };

  const handleHeroImageDelete = async (slotKey: string) => {
    const oldUrl = content[slotKey];
    if (oldUrl && oldUrl !== 'deleted' && oldUrl.includes('workers.dev')) {
      try {
        await deleteFromR2(oldUrl);
      } catch (error) {
        console.error("Failed to delete old image from R2", error);
      }
    }
    await updateContent(slotKey, 'deleted');
    toast.success('Hero image removed');
  };

  return (
    <div className="bg-slate-50">
      {/* Hero Section */}
      <section className="relative bg-white text-slate-900 h-[100dvh] flex items-center justify-center overflow-hidden select-none pt-20 pb-10">
        {editMode && (
          <button
            onClick={() => setIsHeroEditModalOpen(true)}
            className="absolute top-24 right-4 z-50 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-colors flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Edit2 className="w-4 h-4" />
            <span className="font-medium hidden sm:inline">Edit Hero Images</span>
          </button>
        )}

        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);
              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
            animate={{ x: `-${currentImageIndex * 100}%` }}
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 }
            }}
            className="absolute inset-0 flex h-full w-full cursor-grab active:cursor-grabbing"
          >
            {activeHeroImages.map((slot) => (
              <div key={slot.key} className="w-full h-full flex-shrink-0 relative">
                <img 
                  src={content[slot.key] && content[slot.key] !== 'deleted' ? content[slot.key] : slot.default} 
                  alt="Hotel Hero" 
                  className="w-full h-full object-cover pointer-events-none" 
                  referrerPolicy="no-referrer"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>
              </div>
            ))}
          </motion.div>
        </div>
        
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center pt-16 pb-8 pointer-events-none flex flex-col justify-center h-full">
          {/* Booking Shortcut Form */}
          <div className="max-w-4xl mx-auto bg-white p-5 md:p-6 rounded-2xl shadow-xl border border-slate-200 mb-6 transform hover:-translate-y-1 transition-transform duration-300 pointer-events-auto w-full">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full text-left">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <EditableText contentKey="home_booking_room_type" defaultText={t('রুমের ধরন', 'Room Type')} />
                </label>
                <select 
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full border-slate-300 rounded-xl shadow-sm focus:border-red-500 focus:ring-red-500 bg-slate-50 py-4 px-5 text-base md:py-3 md:px-4 md:text-sm"
                >
                  <option value="">{content['home_booking_any_room'] || t('যেকোনো রুম', 'Any Room')}</option>
                  <option value="Single Delux">Single Delux</option>
                  <option value="Double Delux">Double Delux</option>
                  <option value="Family Suit">Family Suit</option>
                  <option value="Super Delux">Super Delux</option>
                </select>
              </div>
              <div className="flex-1 w-full text-left">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <EditableText contentKey="home_booking_check_in" defaultText={t('চেক-ইন', 'Check In')} />
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 md:pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="date" 
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full pl-12 md:pl-10 border-slate-300 rounded-xl shadow-sm focus:border-red-500 focus:ring-red-500 bg-slate-50 py-4 px-5 text-base md:py-3 md:px-4 md:text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 w-full text-left">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <EditableText contentKey="home_booking_check_out" defaultText={t('চেক-আউট', 'Check Out')} />
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 md:pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="date" 
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full pl-12 md:pl-10 border-slate-300 rounded-xl shadow-sm focus:border-red-500 focus:ring-red-500 bg-slate-50 py-4 px-5 text-base md:py-3 md:px-4 md:text-sm"
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full md:w-auto bg-red-600 text-white px-8 py-4 md:py-3 rounded-xl hover:bg-red-700 font-bold transition-colors flex items-center justify-center gap-2 shadow-md h-[60px] md:h-[50px] text-lg md:text-base"
              >
                <Search className="w-6 h-6 md:w-5 md:h-5" />
                <EditableText contentKey="home_booking_search" defaultText={t('খুঁজুন', 'Search')} />
              </button>
            </form>
          </div>

          {/* Feature Buttons */}
          <div className="flex flex-wrap justify-center gap-2 pointer-events-auto">
            <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-lg">
              <Wifi className="w-3 h-3" />
              <EditableText contentKey="home_feature_wifi" defaultText={t('ফ্রি ওয়াইফাই', 'Free WiFi')} />
            </div>
            <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-lg">
              <Wind className="w-3 h-3" />
              <EditableText contentKey="home_feature_ac" defaultText={t('এসি রুম', 'AC Rooms')} />
            </div>
            <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-lg">
              <Coffee className="w-3 h-3" />
              <EditableText contentKey="home_feature_restaurant" defaultText={t('রেস্টুরেন্ট', 'Restaurant')} />
            </div>
            <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-lg">
              <Shield className="w-3 h-3" />
              <EditableText contentKey="home_feature_safe" defaultText={t('নিরাপদ পরিবেশ', 'Safe Environment')} />
            </div>
            <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-lg">
              <MapPin className="w-3 h-3" />
              <EditableText contentKey="home_feature_location" defaultText={t('দুর্দান্ত লোকেশন', 'Great Location')} />
            </div>
          </div>
        </div>

        {/* Navigation Dots */}
        {activeHeroImages.length > 1 && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20 pointer-events-auto">
            {activeHeroImages.map((slot, idx) => (
              <button
                key={slot.key}
                onClick={() => {
                  setDirection(idx > currentImageIndex ? 1 : -1);
                  setCurrentImageIndex(idx);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentImageIndex 
                    ? 'bg-white scale-125' 
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Special Offer Section */}
      <section className="py-8 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white p-6 md:p-8 rounded-2xl shadow-2xl overflow-hidden group border border-red-500">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 opacity-20 blur-xl group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <div className="relative flex flex-col md:flex-row items-center justify-center md:justify-between z-10 gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="bg-white text-red-700 font-black text-4xl px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transform -rotate-3 hover:rotate-0 transition-transform duration-300 flex items-center">
                  <EditableText contentKey="global_discount_rate" defaultText="0" />% OFF
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-md">
                    <EditableText contentKey="global_discount_title" defaultText="Special Offer!" />
                  </h3>
                  <p className="text-red-100 font-medium mt-1 text-lg">
                    <EditableText contentKey="global_discount_desc" defaultText="Get a massive discount on all room bookings today." multiline />
                  </p>
                </div>
              </div>
              <Link to="/rooms" className="whitespace-nowrap bg-white text-red-700 hover:bg-slate-100 px-8 py-3 rounded-full font-bold transition-colors shadow-lg text-lg">
                {t('বুক করুন', 'Book Now')}
              </Link>
            </div>
          </div>
        </div>
      </section>



      {/* Gallery Shortcut Section */}
      <section className="py-16 bg-white text-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('গ্যালারি', 'Gallery')}</h2>
            <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mb-6"></div>
            <p className="text-slate-600 max-w-2xl mx-auto">
              {t('আমাদের হোটেলের কিছু চমৎকার মুহূর্ত ও দৃশ্য।', 'Some wonderful moments and views of our hotel.')}
            </p>
          </div>

          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-10">
              {galleryImages.slice(0, 20).map((img, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ scale: 1.05, zIndex: 10 }}
                  onClick={() => {
                    setSelectedImage(img);
                    setIsViewModalOpen(true);
                  }}
                  className="rounded-lg sm:rounded-xl overflow-hidden shadow-md sm:shadow-lg relative group cursor-pointer"
                >
                  <div className="aspect-w-1 aspect-h-1 h-full">
                    <img 
                      src={img.url} 
                      alt={img.title || `Gallery ${index + 1}`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2 sm:p-4">
                      <Camera className="w-4 h-4 sm:w-6 sm:h-6 text-white/80" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 mb-10">
              <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('কোনো ছবি পাওয়া যায়নি।', 'No images found.')}</p>
            </div>
          )}

          <div className="text-center">
            <Link 
              to="/gallery" 
              className="inline-flex items-center bg-red-600 text-white px-8 py-3 rounded-full hover:bg-red-700 font-bold transition-all hover:shadow-lg hover:shadow-red-600/30 transform hover:-translate-y-1"
            >
              {t('সব ছবি দেখুন', 'View All Images')} <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Rooms Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                <EditableText contentKey="home_rooms_title" defaultText={t('আমাদের সেরা রুমসমূহ', 'Our Best Rooms')} />
              </h2>
              <div className="w-24 h-1 bg-red-600 rounded-full"></div>
            </div>
            <Link to="/rooms" className="hidden sm:inline-flex items-center text-red-600 font-bold hover:text-red-700 transition-colors">
              <EditableText contentKey="home_rooms_view_all" defaultText={t('সব রুম দেখুন', 'View All Rooms')} /> <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
          
          {rooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100 flex flex-col hover:shadow-xl transition-shadow relative group">
                  <div className="relative h-48 sm:h-64">
                    <img src={room.imageUrl || room.images?.[0] || 'https://picsum.photos/seed/room/800/600'} alt={room.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {getDiscountPercentage(room) > 0 ? (
                      <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs sm:text-sm font-bold shadow-md animate-bounce">
                        {getDiscountPercentage(room)}% OFF
                      </div>
                    ) : null}
                  </div>
                  <div className="p-5 sm:p-8 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">{t(room.name, room.type)}</h2>
                        <span className="inline-block bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] sm:text-xs font-semibold mt-2 uppercase tracking-wider">{room.type}</span>
                      </div>
                      <div className="text-right">
                        {getStrikethroughPrice(room) ? (
                          <>
                            <div className="text-[10px] sm:text-sm text-slate-400 line-through">৳{getStrikethroughPrice(room)}</div>
                            <div className="text-lg sm:text-2xl font-bold text-red-600">৳{room.price}</div>
                          </>
                        ) : (
                          <div className="text-lg sm:text-2xl font-bold text-slate-900">৳{room.price}</div>
                        )}
                        <div className="text-[10px] sm:text-xs text-slate-500">{t('রাত', 'Night')}</div>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-slate-600 mb-6 flex-grow line-clamp-2 sm:line-clamp-none">{room.description}</p>
                    
                    <div className="mb-6 sm:mb-8">
                      <h4 className="text-[10px] sm:text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">{t('সুবিধাসমূহ', 'Amenities')}</h4>
                      <ul className="grid grid-cols-2 gap-2">
                        {room.amenities?.slice(0, 4).map((amenity: string, index: number) => (
                          <li key={index} className="flex items-center text-[10px] sm:text-sm text-slate-600">
                            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-red-500 flex-shrink-0" />
                            <span className="truncate">{amenity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Link 
                      to={`/rooms`}
                      className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
                    >
                      {t('বুক করুন', 'Book Now')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>{t('রুম লোড হচ্ছে...', 'Loading rooms...')}</p>
            </div>
          )}
          
          <div className="mt-8 text-center sm:hidden">
            <Link to="/rooms" className="inline-flex items-center text-red-600 font-bold hover:text-red-700 transition-colors">
              <EditableText contentKey="home_rooms_view_all" defaultText={t('সব রুম দেখুন', 'View All Rooms')} /> <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <RatingsSection />

      {/* CTA / Help Desk */}
      <section className="py-24 bg-red-700 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">{t('যেকোনো প্রয়োজনে আমরা আছি', 'We Are Here For Any Need')}</h2>
          <p className="text-xl text-red-100 mb-10">
            {t('বুকিং সংক্রান্ত যেকোনো তথ্য বা সহায়তার জন্য আমাদের হেল্প ডেস্কে যোগাযোগ করুন। আমরা ২৪ ঘণ্টা আপনার সেবায় নিয়োজিত।', 'Contact our help desk for any booking information or assistance. We are at your service 24 hours a day.')}
          </p>
          <Link to="/help-desk" className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full bg-white text-red-700 hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
            {t('যোগাযোগ করুন', 'Contact Us')}
          </Link>
        </div>
      </section>

      {/* Hero Edit Modal */}
      {isHeroEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-slate-900">Edit Hero Images</h2>
              <button 
                onClick={() => setIsHeroEditModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {heroSlots.map((slot, index) => {
                const currentUrl = content[slot.key];
                const isDeleted = currentUrl === 'deleted';
                const displayUrl = currentUrl && !isDeleted ? currentUrl : slot.default;

                return (
                  <div key={slot.key} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-800">Image Slot {index + 1}</h3>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm font-medium">
                          {uploadingSlot === slot.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploadingSlot === slot.key ? 'Uploading...' : 'Upload'}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleHeroImageUpload(slot.key, e)}
                            disabled={uploadingSlot === slot.key}
                            ref={(el) => fileInputRefs.current[slot.key] = el}
                          />
                        </label>
                        {currentUrl && !isDeleted && (
                          <button 
                            onClick={() => handleHeroImageDelete(slot.key)}
                            className="flex items-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden bg-slate-200 relative">
                      {isDeleted ? (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                          No image selected
                        </div>
                      ) : (
                        <img 
                          src={displayUrl} 
                          alt={`Hero slot ${index + 1}`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ImageViewModal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        selectedImage={selectedImage} 
      />
    </div>
  );
}
