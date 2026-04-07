import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Calendar, User, Tag, Share2, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

export default function GalleryPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { content } = useContent();
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(-1);

  const rawImages: any[] = content.galleryImages || [];
  const images = rawImages.map((img, idx) => {
    if (typeof img === 'string') {
      return {
        id: `img-${idx}`,
        url: img,
        title: '',
        description: '',
        keywords: '',
        createdAt: Date.now()
      };
    }
    return img;
  });

  useEffect(() => {
    const index = images.findIndex((img, idx) => img.id === id || idx.toString() === id);
    if (index !== -1) {
      setCurrentIndex(index);
    } else if (images.length > 0) {
      // If not found, maybe it's an index
      const idx = parseInt(id || '-1', 10);
      if (!isNaN(idx) && idx >= 0 && idx < images.length) {
        setCurrentIndex(idx);
      }
    }
  }, [id, images]);

  const currentImage = currentIndex !== -1 ? images[currentIndex] : null;

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % images.length;
    navigate(`/gallery/${images[nextIndex].id || nextIndex}`);
  };

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    navigate(`/gallery/${images[prevIndex].id || prevIndex}`);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (!currentImage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Image not found</h2>
        <Link to="/gallery" className="text-red-600 font-bold hover:underline flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back to Gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      <Helmet>
        <title>{currentImage.title || 'Gallery Post'} | Hotel Shotabdi Abashik</title>
        <meta name="description" content={currentImage.description || 'View this beautiful moment from Hotel Shotabdi Abashik.'} />
        <meta property="og:title" content={currentImage.title || 'Gallery Post'} />
        <meta property="og:description" content={currentImage.description || 'View this beautiful moment from Hotel Shotabdi Abashik.'} />
        <meta property="og:image" content={currentImage.url} />
        <meta property="og:type" content="article" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={`${currentImage.title || 'Gallery Post'} | Hotel Shotabdi Abashik`} />
        <meta property="twitter:description" content={currentImage.description || 'View this beautiful moment from Hotel Shotabdi Abashik.'} />
        <meta property="twitter:image" content={currentImage.url} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link to="/" className="hover:text-red-600 flex items-center gap-1">
            <Home className="w-4 h-4" /> {t('হোম', 'Home')}
          </Link>
          <span>/</span>
          <Link to="/gallery" className="hover:text-red-600">
            {t('গ্যালারি', 'Gallery')}
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate">
            {currentImage.title || `Post ${id}`}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Image Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative group bg-slate-100 rounded-3xl overflow-hidden shadow-2xl w-full min-h-[50vh] sm:min-h-[500px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImage.url}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.4 }}
                  src={currentImage.url}
                  alt={currentImage.title || 'Gallery image'}
                  title={currentImage.title || 'Gallery image'}
                  className="max-w-full max-h-[80vh] object-contain"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>

              {/* Navigation Arrows */}
              <button 
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <button 
                  onClick={handlePrev}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" /> {t('আগেরটি', 'Previous')}
                </button>
                <button 
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-colors"
                >
                  {t('পরেরটি', 'Next')} <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 rounded-xl text-red-700 font-medium transition-colors"
              >
                <Share2 className="w-5 h-5" /> {t('শেয়ার', 'Share')}
              </button>
            </div>
          </div>

          {/* Info Column */}
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-4">
                {currentImage.title || t('গ্যালারি পোস্ট', 'Gallery Post')}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-6">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-red-500" />
                  {new Date(currentImage.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-red-500" />
                  {t('হোটেল শতাব্দী', 'Hotel Shotabdi')}
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed text-lg">
                {currentImage.description || t('আমাদের হোটেলের একটি সুন্দর মুহূর্ত। আমরা আপনাদের সেরা সেবা দিতে প্রতিশ্রুতিবদ্ধ।', 'A beautiful moment from our hotel. We are committed to providing you with the best service.')}
              </p>
            </div>

            {currentImage.keywords && (
              <div className="pt-8 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-red-500" /> {t('ট্যাগসমূহ', 'Tags')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentImage.keywords.split(',').map((tag: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                {t('আরো ছবি দেখুন', 'View More Photos')}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {images.slice(0, 6).map((img, i) => (
                  <Link 
                    key={i} 
                    to={`/gallery/${img.id || i}`}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${img.id === id || i.toString() === id ? 'border-red-600 scale-95' : 'border-transparent hover:border-red-300'}`}
                  >
                    <img src={img.url} alt={img.title || `Gallery image`} title={img.title || `Gallery image`} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="eager" fetchPriority="high" decoding="async" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
              <h3 className="font-bold text-red-900 mb-2">{t('রুম বুক করতে চান?', 'Want to book a room?')}</h3>
              <p className="text-red-700 text-sm mb-4">{t('আমাদের সেরা রুমগুলো দেখুন এবং এখনই বুক করুন।', 'Check out our best rooms and book now.')}</p>
              <Link to="/rooms" className="block w-full text-center bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                {t('রুম দেখুন', 'View Rooms')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
