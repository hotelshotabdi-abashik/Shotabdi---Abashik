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
import { ContentProvider } from './context/ContentContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const Home = lazy(() => import('./pages/Home'));
const Rooms = lazy(() => import('./pages/Rooms'));
const About = lazy(() => import('./pages/About'));
const Restaurant = lazy(() => import('./pages/Restaurant'));
const TourDesk = lazy(() => import('./pages/TourDesk'));
const Gallery = lazy(() => import('./pages/Gallery'));
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

export default function App() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "name": "Hotel Shotabdi Abashik",
    "description": "24h Residential Service in Sylhet. Best hotel in Kumargaon, Sylhet.",
    "url": "https://shotabdi-abashik.bd",
    "telephone": "+8801717425702",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Sylhet",
      "addressRegion": "Sylhet",
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
    <HelmetProvider>
      <LanguageProvider>
        <AuthProvider>
          <ContentProvider>
            <Router>
              <Helmet>
                <script type="application/ld+json">
                  {JSON.stringify(structuredData)}
                </script>
              </Helmet>
              <ScrollToTop />
              <ProfileEnforcer />
              <div className="flex flex-col min-h-screen font-sans bg-slate-50 text-slate-900">
                <Navbar />
                <main className="flex-grow">
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/rooms" element={<Rooms />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/restaurant" element={<Restaurant />} />
                      <Route path="/tour-desk" element={<TourDesk />} />
                      <Route path="/gallery" element={<Gallery />} />
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
