import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BedDouble, CheckCircle2, MapPin, Percent, Utensils, Compass, PhoneCall, ArrowRight, Star, Camera, Calendar, Search, Edit2, X, Upload, Trash2, Loader2, Wifi, Wind, Coffee, Shield, Clock, Navigation } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { collection, getDocs, query, limit, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useContent } from '../context/ContentContext';
import { EditableText } from '../components/EditableText';
import { EditableImage } from '../components/EditableImage';
import { RatingsSection } from '../components/RatingsSection';
import { ImageViewModal } from '../components/ImageViewModal';
import { uploadToR2, deleteFromR2 } from '../lib/r2';
import { toast } from 'sonner';

import { Helmet } from 'react-helmet-async';

export default function Home() {
  const { t } = useLanguage();
  const { content, editMode, updateContent } = useContent();
  const navigate = useNavigate();
  const rawGalleryImages: any[] = content.galleryImages || [];
  const galleryImages = rawGalleryImages.map(img => typeof img === 'string' ? { url: img } : img);
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHoveringHero, setIsHoveringHero] = useState(false);
  const [isHoveringGallery, setIsHoveringGallery] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showHeroContent, setShowHeroContent] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomType, setRoomType] = useState('');
  
  const [isHeroEditModalOpen, setIsHeroEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [rooms, setRooms] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'general'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data());
      }
    });
    return () => unsubscribe();
  }, []);

  const websiteName = settings?.websiteName || t('হোটেল শতাব্দী আবাসিক', 'Hotel Shotabdi Abashik');

  const defaultRestaurants = [
    { name: 'Al-Modina Restaurant', location: 'Kumargaon Bus Stand', distance: '0.1 km', type: 'Local Bengali', imageUrl: 'https://picsum.photos/seed/almodina/400/300', mapUrl: '' },
    { name: 'Bismillah Hotel & Restaurant', location: 'Kumargaon', distance: '0.2 km', type: 'Local Bengali', imageUrl: 'https://picsum.photos/seed/bismillah/400/300', mapUrl: '' },
    { name: 'SUST Food Court', location: 'SUST Campus', distance: '1.5 km', type: 'Snacks / Fast Food', imageUrl: 'https://picsum.photos/seed/sust/400/300', mapUrl: '' },
    { name: 'Cafe SUST', location: 'SUST Campus', distance: '1.5 km', type: 'Cafe', imageUrl: 'https://picsum.photos/seed/cafesust/400/300', mapUrl: '' },
  ];

  const defaultTourSpots = [
    { id: '1', name: 'SUST Campus & Shahid Minar', location: 'Kumargaon', distance: '1.5 km', type: 'University / Monument', imageUrl: 'https://picsum.photos/seed/sust/400/300', mapUrl: '' },
    { id: '2', name: 'Hazrat Shahjalal Mazar Sharif', location: 'Dargah Mahalla', distance: '6.0 km', type: 'Religious / Historical', imageUrl: 'https://picsum.photos/seed/shahjalal/400/300', mapUrl: '' },
    { id: '3', name: 'Hazrat Shah Paran Mazar Sharif', location: 'Khadim Nagar', distance: '13.0 km', type: 'Religious / Historical', imageUrl: 'https://picsum.photos/seed/shahparan/400/300', mapUrl: '' },
    { id: '4', name: 'Ali Amjad\'s Clock & Keane Bridge', location: 'Surma River', distance: '6.5 km', type: 'Historical Landmark', imageUrl: 'https://picsum.photos/seed/keane/400/300', mapUrl: '' },
  ];

  const restaurants = content.restaurants || defaultRestaurants;
  const tourSpots = content.tourSpots || defaultTourSpots;

  const getStrikethroughPrice = (room: any) => {
    if (room.cutPrice && room.cutPrice > room.price) {
      return room.cutPrice;
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
    { key: 'home_hero_bg_1', default: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1280&q=70' },
    { key: 'home_hero_bg_2', default: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1280&q=70' },
    { key: 'home_hero_bg_3', default: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1280&q=70' },
    { key: 'home_hero_bg_4', default: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1280&q=70' },
    { key: 'home_hero_bg_5', default: 'https://images.unsplash.com/photo-1542314831-c6a4d14d8373?auto=format&fit=crop&w=1280&q=70' },
  ];

  const activeHeroImages = heroSlots.filter(slot => {
    const val = content[slot.key];
    if (editMode) return true; // Show all slots in edit mode
    if (val === 'deleted') return false;
    return true; // Show if it has a custom URL or falls back to default
  });

  // Pre-load images
  useEffect(() => {
    activeHeroImages.forEach(slot => {
      const img = new Image();
      img.src = content[slot.key] && content[slot.key] !== 'deleted' ? content[slot.key] : slot.default;
    });
  }, [activeHeroImages, content]);

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
    setLastActivity(Date.now());
    setCurrentImageIndex((prev) => {
      let nextIndex = prev + newDirection;
      if (nextIndex < 0) nextIndex = activeHeroImages.length - 1;
      if (nextIndex >= activeHeroImages.length) nextIndex = 0;
      return nextIndex;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only navigate if not typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'ArrowRight') {
        paginate(1);
      } else if (e.key === 'ArrowLeft') {
        paginate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeHeroImages.length]);

  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      setShowHeroContent(true);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivity;
      
      // Auto-play after 7 seconds of inactivity
      if (inactiveTime > 7000 && activeHeroImages.length > 1 && !isDragging) {
        paginate(1);
      }

      // Hide content after 20 seconds of inactivity
      if (inactiveTime > 20000) {
        setShowHeroContent(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, activeHeroImages.length]);

  const handleHeroInteraction = () => {
    setLastActivity(Date.now());
    setShowHeroContent(true);
    setIsHoveringHero(true);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoveringHero(false);
    }, 5000);
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
      <Helmet>
        <title>{websiteName} | Best Hotel in Bogura</title>
        <meta name="description" content={`Welcome to ${websiteName}. Experience luxury and comfort in the heart of Bogura. 24h Residential Service.`} />
        <meta property="og:title" content={`${websiteName} | Best Hotel in Bogura`} />
        <meta property="og:description" content={`Welcome to ${websiteName}. Experience luxury and comfort in the heart of Bogura. 24h Residential Service.`} />
        <meta property="og:image" content={content[activeHeroImages[0]?.key] || activeHeroImages[0]?.default || ''} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      
      {/* SEO H1 - Hidden but present for crawlers */}
      <h1 className="sr-only">{websiteName}</h1>

      {/* Hero Section */}
      <section className="relative bg-black text-slate-900 min-h-[100dvh] flex items-center justify-center overflow-hidden select-none pt-20 pb-10">
        {editMode && (
          <button
            onClick={() => setIsHeroEditModalOpen(true)}
            className="absolute top-24 right-4 z-50 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-colors flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Edit2 className="w-4 h-4" />
            <span className="font-medium hidden sm:inline">Edit Hero Images</span>
          </button>
        )}

        <div className="absolute inset-0 z-0 overflow-hidden" 
             onMouseEnter={() => setIsHoveringHero(true)}
             onMouseLeave={() => setIsHoveringHero(false)}
             onTouchStart={handleHeroInteraction}
        >
          <motion.div 
            className="flex h-full w-full"
            animate={{ x: `-${currentImageIndex * 100}%` }}
            transition={{ type: "tween", duration: 2.0, ease: [0.25, 1, 0.5, 1] }}
          >
            {activeHeroImages.map((slot) => (
              <div key={slot.key} className="min-w-full h-full relative">
                <img 
                  src={content[slot.key] && content[slot.key] !== 'deleted' ? content[slot.key] : slot.default} 
                  alt="Hotel Hero" 
                  className="w-full h-full object-cover pointer-events-none" 
                  referrerPolicy="no-referrer"
                  draggable={false}
                  loading="eager"
                />
              </div>
            ))}
          </motion.div>
          <div className="absolute inset-0 bg-black/50 pointer-events-none z-10"></div>
        </div>
        
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center pt-16 pb-8 pointer-events-none flex flex-col justify-center h-full">
          <AnimatePresence>
            {showHeroContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <h1 className="sr-only">Hotel Shotabdi Abashik</h1>
                
                {/* 24h Service Text Above Filter */}
                <div className="mb-2 pointer-events-auto">
                  <span className="inline-block text-white px-4 py-1 rounded-full text-xs sm:text-sm font-bold tracking-wide animate-pulse">
                    <EditableText contentKey="hero_top_badge" defaultText={t('২৪ ঘণ্টা আবাসিক সেবা', '24h Residential Service')} />
                  </span>
                </div>

                {/* Hotel Shotabdi Title */}
                <div className="mb-6 pointer-events-auto">
                  <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white drop-shadow-2xl tracking-tighter">
                    <EditableText contentKey="hero_main_title" defaultText={t('হোটেল শতাব্দী', 'Hotel Shotabdi')} />
                  </h2>
                </div>

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
          <div className="flex flex-wrap justify-center gap-2 pointer-events-auto mb-6">
            <div className="bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-lg">
              <Wifi className="w-3 h-3" />
              <EditableText contentKey="home_feature_wifi" defaultText={t('ফ্রি ওয়াইফাই', 'Free WiFi')} />
            </div>
            <div className="bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-lg">
              <Wind className="w-3 h-3" />
              <EditableText contentKey="home_feature_ac" defaultText={t('এসি রুম', 'AC Rooms')} />
            </div>
            <div className="bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-lg">
              <Coffee className="w-3 h-3" />
              <EditableText contentKey="home_feature_restaurant" defaultText={t('রেস্টুরেন্ট', 'Restaurant')} />
            </div>
            <div className="bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-lg">
              <Shield className="w-3 h-3" />
              <EditableText contentKey="home_feature_safe" defaultText={t('নিরাপদ পরিবেশ', 'Safe Environment')} />
            </div>
            <div className="bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-lg">
              <MapPin className="w-3 h-3" />
              <EditableText contentKey="home_feature_location" defaultText={t('দুর্দান্ত লোকেশন', 'Great Location')} />
            </div>
          </div>

          {/* Location Button */}
          <div className="pointer-events-auto mt-4">
            <a 
              href="https://maps.app.goo.gl/UJZHgQbTk5X9VCcu6" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-all hover:scale-105 active:scale-95 group"
            >
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 group-hover:animate-bounce" />
              <span className="text-[10px] sm:text-xs md:text-sm font-medium">Kumargaon Bus Terminal, Sunamganj Road, Sylhet, Bangladesh</span>
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
      </section>

      {/* Special Offer Section */}
      <section className="py-8 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white p-6 md:p-8 rounded-2xl shadow-2xl overflow-hidden group border border-red-500">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 opacity-20 blur-xl group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <div className="relative flex flex-col md:flex-row items-center justify-center md:justify-between z-10 gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [-3, 0, -3]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 3,
                    ease: "easeInOut"
                  }}
                  className="bg-white text-red-700 font-black text-4xl px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center"
                >
                  <EditableText 
                    contentKey="global_discount_rate" 
                    defaultText="0" 
                  />% OFF
                </motion.div>
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
      <section className="py-16 bg-white text-slate-900 overflow-hidden w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('গ্যালারি', 'Gallery')}</h2>
            <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mb-6"></div>
            <p className="text-slate-600 max-w-2xl mx-auto">
              {t('আমাদের হোটেলের কিছু চমৎকার মুহূর্ত ও দৃশ্য।', 'Some wonderful moments and views of our hotel.')}
            </p>
          </div>

          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-10">
              {galleryImages.map((img, index) => (
                <Link 
                  key={index}
                  to={`/gallery/${img.id || index}`}
                  className="relative overflow-hidden shadow-md group cursor-pointer w-full rounded-lg block"
                >
                  <img 
                    src={img.url} 
                    alt={img.title || `Gallery ${index + 1}`} 
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-white/20 p-3 rounded-full text-white transform scale-0 group-hover:scale-100 transition-transform duration-300">
                      <Search className="w-6 h-6" />
                    </div>
                  </div>
                </Link>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100 flex flex-col hover:shadow-xl transition-shadow relative group">
                  <div className="relative h-48 sm:h-64 bg-slate-50">
                    <img src={room.imageUrl || room.images?.[0] || 'https://picsum.photos/seed/room/800/600'} alt={room.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-5 sm:p-8 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">{room.name}</h2>
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
                        {room.amenities?.map((amenity: string, index: number) => (
                          <li key={index} className="flex items-start text-[10px] sm:text-sm text-slate-600">
                            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-red-500 flex-shrink-0 mt-0.5" />
                            <span className="leading-tight break-words">{amenity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Link 
                      to={`/rooms/${room.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`}
                      className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
                    >
                      {t('বিস্তারিত দেখুন', 'View Details')}
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

      {/* Restaurant Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                <EditableText contentKey="home_restaurant_title" defaultText={t('জনপ্রিয় রেস্টুরেন্টসমূহ', 'Popular Restaurants')} />
              </h2>
              <div className="w-24 h-1 bg-red-600 rounded-full"></div>
            </div>
            <Link to="/restaurant" className="hidden sm:inline-flex items-center text-red-600 font-bold hover:text-red-700 transition-colors">
              {t('সব দেখুন', 'View All')} <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {restaurants.slice(0, 4).map((res: any, index: number) => (
              <div key={index} className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 group hover:shadow-xl transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img src={res.imageUrl} alt={res.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 right-4 bg-white/90 px-2 py-1 rounded text-[10px] font-bold text-red-700 shadow-sm">
                    {res.type}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-slate-900 mb-2">{res.name}</h3>
                  <div className="flex items-center text-xs text-slate-500 mb-3">
                    <MapPin className="w-3 h-3 mr-1 text-red-500" />
                    <span>{res.location} ({res.distance})</span>
                  </div>
                  <a 
                    href={res.mapUrl || `https://www.google.com/maps/search/${encodeURIComponent(res.name + ' ' + res.location)}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Navigation className="w-3 h-3 mr-1.5" /> {t('ম্যাপে দেখুন', 'View on Map')}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tour Desk Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                <EditableText contentKey="home_tour_title" defaultText={t('আশেপাশের দর্শনীয় স্থান', 'Nearby Attractions')} />
              </h2>
              <div className="w-24 h-1 bg-red-600 rounded-full"></div>
            </div>
            <Link to="/tour-desk" className="hidden sm:inline-flex items-center text-red-600 font-bold hover:text-red-700 transition-colors">
              {t('সব দেখুন', 'View All')} <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tourSpots.slice(0, 4).map((spot: any, index: number) => (
              <div key={index} className="bg-white rounded-2xl overflow-hidden border border-slate-100 group hover:shadow-xl transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img src={spot.imageUrl} alt={spot.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 right-4 bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm">
                    {spot.distance}
                  </div>
                  {spot.badge && (
                    <div className="absolute top-4 left-4 bg-yellow-500 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm">
                      {spot.badge}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-slate-900 mb-2">{spot.name}</h3>
                  <div className="flex items-center text-xs text-slate-500 mb-3">
                    <Compass className="w-3 h-3 mr-1 text-red-500" />
                    <span>{spot.type}</span>
                  </div>
                  <Link 
                    to="/tour-desk"
                    className="flex items-center justify-center w-full py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    {t('বিস্তারিত দেখুন', 'View Details')}
                  </Link>
                </div>
              </div>
            ))}
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
                            ref={(el) => { fileInputRefs.current[slot.key] = el; }}
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
