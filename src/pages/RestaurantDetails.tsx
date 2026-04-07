import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, MapPin, Navigation, Share2, Home, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { getOptimizedUrl } from '../lib/imageUtils';

export default function RestaurantDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { content } = useContent();
  const { t } = useLanguage();

  const restaurants = content.restaurants || [];
  
  // Find by index or slug
  const restaurantIndex = restaurants.findIndex((r: any, idx: number) => 
    idx.toString() === id || 
    (r.name && r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === id)
  );

  const restaurant = restaurantIndex !== -1 ? restaurants[restaurantIndex] : null;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const getDirectionsUrl = (res: any) => {
    if (res.mapUrl) return res.mapUrl;
    return `https://www.google.com/maps/dir/Kumargaon+Bus+Stand,+Sylhet/${encodeURIComponent(res.name + ', Sylhet')}`;
  };

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Restaurant not found</h2>
        <Link to="/restaurant" className="text-red-600 font-bold hover:underline flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back to Restaurants
        </Link>
      </div>
    );
  }

  const pageTitle = `${restaurant.name} | Restaurant in Sylhet | Hotel Shotabdi Abashik`;
  const pageDescription = `${restaurant.type} restaurant located at ${restaurant.location}. Distance: ${restaurant.distance} from Hotel Shotabdi Abashik.`;

  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={restaurant.imageUrl} />
        <meta property="og:type" content="article" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={pageTitle} />
        <meta property="twitter:description" content={pageDescription} />
        <meta property="twitter:image" content={restaurant.imageUrl} />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": restaurant.name,
            "image": restaurant.imageUrl,
            "address": {
              "@type": "PostalAddress",
              "streetAddress": restaurant.location,
              "addressLocality": "Sylhet",
              "addressCountry": "BD"
            },
            "servesCuisine": restaurant.type
          })}
        </script>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link to="/" className="hover:text-red-600 flex items-center gap-1">
            <Home className="w-4 h-4" /> {t('হোম', 'Home')}
          </Link>
          <span>/</span>
          <Link to="/restaurant" className="hover:text-red-600">
            {t('রেস্টুরেন্ট', 'Restaurant')}
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate">
            {restaurant.name}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="relative bg-slate-100 rounded-3xl overflow-hidden shadow-xl w-full aspect-video sm:aspect-[4/3] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={restaurant.imageUrl}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.4 }}
                  src={getOptimizedUrl(restaurant.imageUrl)}
                  alt={restaurant.name}
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
                  {restaurant.name}
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
                  <Utensils className="w-4 h-4" />
                  {restaurant.type}
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full font-medium">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {restaurant.distance} from hotel
                </div>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-900 text-lg border-b pb-2">{t('বিস্তারিত তথ্য', 'Details')}</h3>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">{t('অবস্থান', 'Location')}</p>
                    <p className="text-slate-600">{restaurant.location}, Sylhet</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Utensils className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">{t('খাবারের ধরন', 'Cuisine Type')}</p>
                    <p className="text-slate-600">{restaurant.type}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <a 
                href={getDirectionsUrl(restaurant)}
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
