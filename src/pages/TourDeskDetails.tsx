import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, MapPin, Navigation, Share2, Home, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

export default function TourDeskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { content } = useContent();
  const { t } = useLanguage();

  const tourSpots = content.tourSpots || [];
  
  // Find by index, id, or slug
  const spotIndex = tourSpots.findIndex((s: any, idx: number) => 
    s.id === id ||
    idx.toString() === id || 
    (s.name && s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === id)
  );

  const spot = spotIndex !== -1 ? tourSpots[spotIndex] : null;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const getDirectionsUrl = (s: any) => {
    if (s.mapUrl) return s.mapUrl;
    return `https://www.google.com/maps/dir/Kumargaon+Bus+Stand,+Sylhet/${encodeURIComponent(s.name + ', Sylhet')}`;
  };

  if (!spot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Tourist Spot not found</h2>
        <Link to="/tourdesk" className="text-red-600 font-bold hover:underline flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back to Tour Desk
        </Link>
      </div>
    );
  }

  const pageTitle = `${spot.name} | Tourist Spot in Sylhet | Hotel Shotabdi Abashik`;
  const pageDescription = `${spot.type} located at ${spot.location}. Distance: ${spot.distance} from Hotel Shotabdi Abashik.`;

  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={spot.imageUrl} />
        <meta property="og:type" content="article" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={pageTitle} />
        <meta property="twitter:description" content={pageDescription} />
        <meta property="twitter:image" content={spot.imageUrl} />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TouristAttraction",
            "name": spot.name,
            "image": spot.imageUrl,
            "description": pageDescription,
            "address": {
              "@type": "PostalAddress",
              "streetAddress": spot.location,
              "addressLocality": "Sylhet",
              "addressCountry": "BD"
            }
          })}
        </script>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link to="/" className="hover:text-red-600 flex items-center gap-1">
            <Home className="w-4 h-4" /> {t('হোম', 'Home')}
          </Link>
          <span>/</span>
          <Link to="/tourdesk" className="hover:text-red-600">
            {t('ট্যুর ডেস্ক', 'Tour Desk')}
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate">
            {spot.name}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="relative bg-slate-100 rounded-3xl overflow-hidden shadow-xl w-full aspect-video sm:aspect-[4/3] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={spot.imageUrl}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.4 }}
                  src={spot.imageUrl}
                  alt={spot.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
                  {spot.name}
                </h1>
                <button 
                  onClick={handleShare}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                  title="Share"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-6">
                <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-full font-medium">
                  <Compass className="w-4 h-4" />
                  {spot.type}
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full font-medium">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {spot.distance} from hotel
                </div>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-900 text-lg border-b pb-2">{t('বিস্তারিত তথ্য', 'Details')}</h3>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">{t('অবস্থান', 'Location')}</p>
                    <p className="text-slate-600">{spot.location}, Sylhet</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Compass className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">{t('স্থানের ধরন', 'Spot Type')}</p>
                    <p className="text-slate-600">{spot.type}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <a 
                href={getDirectionsUrl(spot)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg shadow-red-200"
              >
                <Navigation className="w-5 h-5" />
                {t('ম্যাপে ডিরেকশন দেখুন', 'Get Directions on Map')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
