/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
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
const MyStays = lazy(() => import('./pages/MyStays'));
const HelpDesk = lazy(() => import('./pages/HelpDesk'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));

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
  return (
    <LanguageProvider>
      <AuthProvider>
        <ContentProvider>
          <Router>
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
                    <Route path="/help-desk" element={<HelpDesk />} />
                    <Route path="/profile" element={<Profile />} />
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
  );
}
