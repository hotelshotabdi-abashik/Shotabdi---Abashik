import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BedDouble, CheckCircle2, MapPin, Percent, Utensils, Compass, PhoneCall, ArrowRight, Star, Camera, Calendar, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useContent } from '../context/ContentContext';
import { EditableText } from '../components/EditableText';
import { EditableImage } from '../components/EditableImage';

export default function Home() {
  const { t } = useLanguage();
  const { content } = useContent();
  const navigate = useNavigate();
  const galleryImages: string[] = content.galleryImages || [];
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomType, setRoomType] = useState('');

  const heroImages = [
    content.home_hero_bg_1 || 'https://picsum.photos/seed/hotel1/1920/1080',
    content.home_hero_bg_2 || 'https://picsum.photos/seed/hotel2/1920/1080',
    content.home_hero_bg_3 || 'https://picsum.photos/seed/hotel3/1920/1080',
    content.home_hero_bg_4 || 'https://picsum.photos/seed/hotel4/1920/1080',
    content.home_hero_bg_5 || 'https://picsum.photos/seed/hotel5/1920/1080',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to rooms page, optionally passing search params if we implement them later
    navigate('/rooms');
  };

  return (
    <div className="bg-slate-50">
      {/* Hero Section */}
      <section className="relative bg-white text-slate-900 py-32 lg:py-48 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              <EditableImage 
                contentKey={`home_hero_bg_${currentImageIndex + 1}`} 
                defaultSrc={heroImages[currentImageIndex]} 
                className="w-full h-full object-cover" 
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-slate-900 drop-shadow-sm"
          >
            <EditableText contentKey="home_hero_title" defaultText={t('হোটেল শতাব্দী আবাসিক', 'Hotel Shotabdi Abashik')} />
          </h1>
          <div 
            className="text-xl md:text-2xl font-medium mb-10 max-w-3xl mx-auto text-slate-700 drop-shadow-sm"
          >
            <EditableText contentKey="home_hero_subtitle" defaultText={t('২৪ ঘণ্টা আবাসিক সার্ভিস', '24h Residential Service')} multiline />
          </div>
          
          {/* Booking Shortcut Form */}
          <div className="max-w-4xl mx-auto bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-slate-200 mt-8 transform hover:-translate-y-1 transition-transform duration-300">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full text-left">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('রুমের ধরন', 'Room Type')}</label>
                <select 
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full border-slate-300 rounded-xl shadow-sm focus:border-red-500 focus:ring-red-500 bg-slate-50 py-3 px-4"
                >
                  <option value="">{t('যেকোনো রুম', 'Any Room')}</option>
                  <option value="Single Delux">Single Delux</option>
                  <option value="Double Delux">Double Delux</option>
                  <option value="Family Suit">Family Suit</option>
                  <option value="Super Delux">Super Delux</option>
                </select>
              </div>
              <div className="flex-1 w-full text-left">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('চেক-ইন', 'Check In')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="date" 
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full pl-10 border-slate-300 rounded-xl shadow-sm focus:border-red-500 focus:ring-red-500 bg-slate-50 py-3 px-4"
                  />
                </div>
              </div>
              <div className="flex-1 w-full text-left">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('চেক-আউট', 'Check Out')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="date" 
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full pl-10 border-slate-300 rounded-xl shadow-sm focus:border-red-500 focus:ring-red-500 bg-slate-50 py-3 px-4"
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full md:w-auto bg-red-600 text-white px-8 py-3 rounded-xl hover:bg-red-700 font-bold transition-colors flex items-center justify-center gap-2 shadow-md h-[50px]"
              >
                <Search className="w-5 h-5" />
                {t('খুঁজুন', 'Search')}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 m-0 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('কেন আমাদের বেছে নিবেন?', 'Why Choose Us?')}</h2>
            <div className="w-24 h-1 bg-red-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow group">
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                <EditableText contentKey="home_feature1_title" defaultText={t('দুর্দান্ত লোকেশন', 'Great Location')} />
              </h3>
              <div className="text-slate-600">
                <EditableText contentKey="home_feature1_desc" defaultText={t('কুমারগাঁও বাস টার্মিনাল, সাস্ট (SUST) এবং মাউন্ট এডোরা হাসপাতালের খুব কাছেই অবস্থিত।', 'Located very close to Kumargaon Bus Terminal, SUST, and Mount Adora Hospital.')} multiline />
              </div>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow group">
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                <EditableText contentKey="home_feature2_title" defaultText={t('পারিবারিক পরিবেশ', 'Family Environment')} />
              </h3>
              <div className="text-slate-600">
                <EditableText contentKey="home_feature2_desc" defaultText={t('পরিবার নিয়ে থাকার জন্য একটি নিরাপদ এবং আরামদায়ক পরিবেশ নিশ্চিত করা হয়।', 'A safe and comfortable environment is ensured for staying with family.')} multiline />
              </div>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow group">
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                <EditableText contentKey="home_feature3_title" defaultText={t('সাশ্রয়ী মূল্য', 'Affordable Price')} />
              </h3>
              <div className="text-slate-600">
                <EditableText contentKey="home_feature3_desc" defaultText={t('আমাদের অফিসিয়াল চ্যানেল বা ওয়েবসাইটের মাধ্যমে বুকিং করলে পাচ্ছেন বিশেষ ছাড়!', 'Get special discounts when booking through our official channels or website!')} multiline />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Shortcut Section */}
      <section className="py-16 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('গ্যালারি', 'Gallery')}</h2>
            <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mb-6"></div>
            <p className="text-slate-300 max-w-2xl mx-auto">
              {t('আমাদের হোটেলের কিছু চমৎকার মুহূর্ত ও দৃশ্য।', 'Some wonderful moments and views of our hotel.')}
            </p>
          </div>

          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {galleryImages.slice(0, 8).map((src, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ scale: 1.05, zIndex: 10 }}
                  className={`rounded-xl overflow-hidden shadow-lg relative group ${
                    index === 0 ? 'md:col-span-2 md:row-span-2' : ''
                  } ${index === 3 ? 'md:col-span-2' : ''}`}
                >
                  <div className="aspect-w-4 aspect-h-3 h-full">
                    <img 
                      src={src} 
                      alt={`Gallery ${index + 1}`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <Camera className="w-6 h-6 text-white/80" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-10">
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
              <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('আমাদের সেরা রুমসমূহ', 'Our Best Rooms')}</h2>
              <div className="w-24 h-1 bg-red-600 rounded-full"></div>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
            <div className="absolute inset-0 opacity-20">
              <EditableImage contentKey="home_rooms_shortcut_bg" defaultSrc="https://picsum.photos/seed/hotelrooms/1920/1080" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-900/40"></div>
            <div className="relative p-12 md:p-20 flex flex-col items-center text-center">
              <BedDouble className="w-16 h-16 text-white mb-6" />
              <h3 className="text-3xl md:text-5xl font-bold text-white mb-6">
                <EditableText contentKey="home_rooms_shortcut_title" defaultText={t('আপনার পছন্দের রুমটি বেছে নিন', 'Choose Your Preferred Room')} />
              </h3>
              <p className="text-xl text-slate-200 mb-10 max-w-2xl">
                <EditableText contentKey="home_rooms_shortcut_desc" defaultText={t('আমাদের সিঙ্গেল ডিলাক্স, ডাবল ডিলাক্স, ফ্যামিলি স্যুট এবং সুপার ডিলাক্স রুমগুলো থেকে আপনার প্রয়োজন অনুযায়ী সেরা রুমটি বেছে নিন।', 'Choose the best room according to your needs from our Single Delux, Double Delux, Family Suit, and Super Delux rooms.')} multiline />
              </p>
              <Link to="/rooms" className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full bg-red-700 text-white hover:bg-red-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                {t('সব রুম দেখুন', 'View All Rooms')} <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section Shortcuts */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('অন্বেষণ করুন', 'Explore')}</h2>
            <div className="w-24 h-1 bg-red-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <Link to="/rooms" className="bg-slate-50 p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md hover:bg-red-50 hover:border-red-100 transition-all group flex items-center justify-center min-h-[120px]">
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-700 transition-colors">{t('রুমসমূহ', 'Rooms')}</h3>
            </Link>
            <Link to="/about" className="bg-slate-50 p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md hover:bg-red-50 hover:border-red-100 transition-all group flex items-center justify-center min-h-[120px]">
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-700 transition-colors">{t('আমাদের সম্পর্কে', 'About')}</h3>
            </Link>
            <Link to="/restaurant" className="bg-slate-50 p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md hover:bg-red-50 hover:border-red-100 transition-all group flex items-center justify-center min-h-[120px]">
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-700 transition-colors">{t('রেস্টুরেন্ট', 'Restaurants')}</h3>
            </Link>
            <Link to="/tour-desk" className="bg-slate-50 p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md hover:bg-red-50 hover:border-red-100 transition-all group flex items-center justify-center min-h-[120px]">
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-700 transition-colors">{t('ট্যুর ডেস্ক', 'Tour Desk')}</h3>
            </Link>
            <Link to="/gallery" className="bg-slate-50 p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md hover:bg-red-50 hover:border-red-100 transition-all group flex items-center justify-center min-h-[120px]">
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-700 transition-colors">{t('গ্যালারি', 'Gallery')}</h3>
            </Link>
            <Link to="/help-desk" className="bg-slate-50 p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md hover:bg-red-50 hover:border-red-100 transition-all group flex items-center justify-center min-h-[120px]">
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-700 transition-colors">{t('হেল্প ডেস্ক', 'Help Desk')}</h3>
            </Link>
          </div>
        </div>
      </section>

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
    </div>
  );
}
