/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ContentProvider, useContent } from './context/ContentContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const Home = lazy(() => import('./pages/Home'));
const Rooms = lazy(() => import('./pages/Rooms'));
const RoomDetails = lazy(() => import('./pages/RoomDetails'));
const About = lazy(() => import('./pages/About'));
const Restaurant = lazy(() => import('./pages/Restaurant'));
const TourDesk = lazy(() => import('./pages/TourDesk'));
const Gallery = lazy(() => import('./pages/Gallery'));
const GalleryPost = lazy(() => import('./pages/GalleryPost'));
const Reviews = lazy(() => import('./pages/Reviews').then(module => ({ default: module.Reviews })));
const MyStays = lazy(() => import('./pages/MyStays'));
const HelpDesk = lazy(() => import('./pages/HelpDesk'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const ProfileEnforcer = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user && profile && !profile.profileCompleted && location.pathname !== '/profile') {
      navigate('/profile');
    }
  }, [user, profile, loading, location, navigate]);

  return null;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/" />;
  if (profile && !profile.profileCompleted) return <Navigate to="/profile" />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user || profile?.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
};

const SEO = () => {
  const { content } = useContent();
  const logoUrl = content.site_logo || "https://pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev/logo/shotabdi%20logo.png";
  const websiteName = "HOTEL SHOTABDI ABASHIK";
  const description = "Hotel Shotabdi Abashik offers luxury residential services in Sylhet. Experience comfort, safety, and 24h service near Kumargaon Bus Stand.";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "name": websiteName,
    "description": description,
    "url": "https://www.shotabdi-abashik.bd",
    "logo": logoUrl,
    "image": logoUrl,
    "telephone": "+8801717425702",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Kumargaon Bus Terminal, Sunamganj Road",
      "addressLocality": "Sylhet",
      "addressRegion": "Sylhet",
      "postalCode": "3100",
      "addressCountry": "BD"
    },
    "founder": {
      "@type": "Person",
      "name": "Abdul Kahar Kodor"
    },
    "author": {
      "@type": "Person",
      "name": "Fuad Ahmed",
      "alternateName": "Fuad Editing Zone",
      "jobTitle": ["Graphic Designer", "VFX Video Editor", "Web Developer"]
    }
  };

  return (
    <Helmet>
      <title>{websiteName} | Best Luxury Residential Hotel in Sylhet</title>
      <meta name="description" content={description} />
      <link rel="icon" type="image/png" href={logoUrl} />
      <link rel="apple-touch-icon" href={logoUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={`${websiteName} | Best Luxury Residential Hotel in Sylhet`} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={logoUrl} />
      <meta property="og:url" content="https://www.shotabdi-abashik.bd" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:title" content={`${websiteName} | Best Luxury Residential Hotel in Sylhet`} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={logoUrl} />

      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export default function App() {
  return (
    <HelmetProvider>
      <LanguageProvider>
        <AuthProvider>
          <ContentProvider>
            <Router>
              <SEO />
              <ScrollToTop />
              <ProfileEnforcer />
              <div className="flex flex-col min-h-screen font-sans bg-slate-50 text-slate-900">
                <Navbar />
                <main className="flex-grow pt-14">
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/rooms" element={<Rooms />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/restaurant" element={<Restaurant />} />
                      <Route path="/tour-desk" element={<TourDesk />} />
                      <Route path="/gallery" element={<Gallery />} />
                      <Route path="/gallery/:id" element={<GalleryPost />} />
                      <Route path="/logo" element={<Navigate to="/" />} />
                      <Route path="/rooms/:title" element={<RoomDetails />} />
                      <Route path="/restaurant/:id" element={<Restaurant />} />
                      <Route path="/tour-desk/:id" element={<TourDesk />} />
                      <Route path="/reviews" element={<Reviews />} />
                      <Route path="/help-desk" element={<HelpDesk />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                      <Route path="/terms-of-service" element={<TermsOfService />} />
                      <Route path="/my-stays" element={<ProtectedRoute><MyStays /></ProtectedRoute>} />
                      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                    </Routes>
                  </Suspense>
                </main>
                <Footer />
                <Toaster position="top-center" richColors />
              </div>
            </Router>
          </ContentProvider>
        </AuthProvider>
      </LanguageProvider>
    </HelmetProvider>
  );
}
