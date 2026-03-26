import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useContent } from '../context/ContentContext';
import { Menu, X, LogIn, LogOut, User, Globe, Edit, Bell } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

import { EditableImage } from './EditableImage';

export default function Navbar() {
  const { user, profile, login, logout, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { editMode, setEditMode } = useContent();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const navLinks = [
    { name: t('হোম', 'Home'), path: '/' },
    { name: t('রুম', 'Rooms'), path: '/rooms' },
    { name: t('আমাদের সম্পর্কে', 'About Us'), path: '/about' },
    { name: t('রেস্টুরেন্ট', 'Restaurant'), path: '/restaurant' },
    { name: t('ট্যুর ডেস্ক', 'Tour Desk'), path: '/tour-desk' },
    { name: t('গ্যালারি', 'Gallery'), path: '/gallery' },
    { name: t('হেল্প ডেস্ক', 'Help Desk'), path: '/help-desk' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || !profile) return;

    const bookingsRef = collection(db, 'bookings');
    let q;

    if (profile.role === 'admin') {
      // Admin sees pending bookings
      q = query(bookingsRef, where('status', '==', 'pending'));
    } else {
      // User sees recently updated bookings (accepted/rejected)
      // For simplicity, we just show count of accepted/rejected bookings
      q = query(bookingsRef, where('userId', '==', user.uid), where('status', 'in', ['accepted', 'rejected']));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotificationCount(snapshot.docs.length);
    });

    return () => unsubscribe();
  }, [user, profile]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNotificationClick = () => {
    setIsOpen(false);
    if (profile?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/my-stays');
    }
  };

  return (
    <nav className="bg-white text-slate-900 shadow-sm sticky top-0 z-50">
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between min-h-[4rem] py-2">
          <div className="flex items-center flex-1 mr-2 sm:mr-4 min-w-0">
            <Link to="/" className="flex items-center gap-2 min-w-0" onClick={() => setIsOpen(false)}>
              <EditableImage 
                contentKey="site_logo" 
                defaultSrc="https://pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev/logo/shotabdi%20logo.png" 
                className="h-8 sm:h-10 lg:h-12 w-auto flex-shrink-0 object-contain" 
                alt="Hotel Shotabdi Abashik Logo"
                folder="shotabdi-abashik/logo"
              />
              <span className="font-bold text-xs sm:text-sm md:text-base lg:text-xl text-slate-900 leading-tight truncate">
                {t('হোটেল শতাব্দী আবাসিক', 'Hotel Shotabdi Abashik')}
              </span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden xl:flex items-center gap-1 flex-shrink-0">
            {profile?.role === 'admin' && (
              <button 
                onClick={() => setEditMode(!editMode)} 
                className={`flex items-center px-2 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${editMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
              >
                <Edit className="w-4 h-4 mr-1" /> {editMode ? t('সম্পাদনা বন্ধ করুন', 'Stop Editing') : t('ওয়েব সম্পাদনা', 'Edit Web')}
              </button>
            )}
            {(!user || profile?.profileCompleted) && navLinks.map((link) => (
              <Link key={link.name} to={link.path} className="text-slate-700 hover:bg-red-50 hover:text-red-700 px-2 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap">
                {link.name}
              </Link>
            ))}

            <button
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="flex items-center justify-center ml-1 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-red-100 hover:text-red-700 transition-colors text-sm font-bold flex-shrink-0"
            >
              <Globe className="w-4 h-4 mr-1" />
              {language === 'bn' ? 'EN' : 'BN'}
            </button>
            
            {loading ? (
              <div className="w-24 h-10 bg-slate-100 animate-pulse rounded-md ml-2 flex-shrink-0"></div>
            ) : (
              <div className="flex items-center ml-2 border-l border-slate-200 pl-2 flex-shrink-0">
                <button 
                  onClick={user ? handleNotificationClick : login}
                  className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-700 hover:bg-red-100 hover:text-red-700 transition-colors focus:outline-none mr-2 flex-shrink-0"
                  title={user ? "Notifications" : "Login to see notifications"}
                >
                  <Bell className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                      {notificationCount}
                    </span>
                  )}
                </button>

                {user ? (
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setIsProfileOpen(!isProfileOpen)} 
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-700 hover:bg-red-100 hover:text-red-700 transition-colors focus:outline-none"
                    >
                      <User className="w-5 h-5" />
                    </button>

                    {isProfileOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-slate-100 z-50">
                        <Link 
                          to="/my-stays" 
                          onClick={() => setIsProfileOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700"
                        >
                          {t('আমার বুকিং', 'My Stays')}
                        </Link>
                        {profile?.profileCompleted && (
                          <Link 
                            to="/profile" 
                            onClick={() => setIsProfileOpen(false)}
                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700"
                          >
                            {t('অ্যাকাউন্ট পরিচালনা', 'Manage Account')}
                          </Link>
                        )}
                        {profile?.role === 'admin' && (
                          <Link 
                            to="/admin" 
                            onClick={() => setIsProfileOpen(false)}
                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700"
                          >
                            {t('অ্যাডমিন প্যানেল', 'Admin Panel')}
                          </Link>
                        )}
                        <button 
                          onClick={() => { logout(); setIsProfileOpen(false); }} 
                          className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700"
                        >
                          {t('লগআউট', 'Logout')}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button onClick={login} className="flex items-center bg-red-700 text-white hover:bg-red-800 px-4 py-2 rounded-md text-sm font-bold transition-colors flex-shrink-0">
                    <LogIn className="w-4 h-4 mr-2" /> {t('বুক করুন', 'Book Now')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="xl:hidden flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="flex items-center justify-center px-2 sm:px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-red-100 hover:text-red-700 transition-colors text-xs sm:text-sm font-bold flex-shrink-0"
            >
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              {language === 'bn' ? 'EN' : 'BN'}
            </button>
            <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center justify-center p-1.5 sm:p-2 rounded-md text-slate-900 hover:bg-slate-100 focus:outline-none flex-shrink-0">
              {isOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
            <button 
              onClick={user ? handleNotificationClick : login}
              className="relative inline-flex items-center justify-center p-1.5 sm:p-2 rounded-md text-slate-900 hover:bg-slate-100 focus:outline-none flex-shrink-0"
              title={user ? "Notifications" : "Login to see notifications"}
            >
              <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                  {notificationCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="xl:hidden bg-white border-t border-slate-100 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {(!user || profile?.profileCompleted) && navLinks.map((link) => (
              <Link key={link.name} to={link.path} onClick={() => setIsOpen(false)} className="block text-slate-700 hover:bg-red-50 hover:text-red-700 px-3 py-2 rounded-md text-base font-medium">
                {link.name}
              </Link>
            ))}
            {profile?.role === 'admin' && (
              <button 
                onClick={() => { setEditMode(!editMode); setIsOpen(false); }} 
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-bold mt-2 flex items-center ${editMode ? 'bg-red-600 text-white hover:bg-red-700' : 'text-amber-800 bg-amber-50 hover:bg-amber-100'}`}
              >
                <Edit className="w-5 h-5 mr-2" /> {editMode ? t('সম্পাদনা বন্ধ করুন', 'Stop Editing') : t('ওয়েব সম্পাদনা', 'Edit Web')}
              </button>
            )}
            {loading ? (
              <div className="w-full h-10 bg-slate-100 animate-pulse rounded-md mt-2"></div>
            ) : user ? (
              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="px-3 py-2 text-sm font-bold text-slate-900 flex items-center">
                  <User className="w-5 h-5 mr-2" /> {t('প্রোফাইল', 'Profile')}
                </div>
                <Link to="/my-stays" onClick={() => setIsOpen(false)} className="block text-slate-700 hover:bg-red-50 hover:text-red-700 px-3 py-2 rounded-md text-base font-medium pl-8">
                  {t('আমার বুকিং', 'My Stays')}
                </Link>
                {profile?.profileCompleted && (
                  <Link to="/profile" onClick={() => setIsOpen(false)} className="block text-slate-700 hover:bg-red-50 hover:text-red-700 px-3 py-2 rounded-md text-base font-medium pl-8">
                    {t('অ্যাকাউন্ট পরিচালনা', 'Manage Account')}
                  </Link>
                )}
                {profile?.role === 'admin' && (
                  <Link to="/admin" onClick={() => setIsOpen(false)} className="block text-slate-700 hover:bg-red-50 hover:text-red-700 px-3 py-2 rounded-md text-base font-medium pl-8">
                    {t('অ্যাডমিন প্যানেল', 'Admin Panel')}
                  </Link>
                )}
                <button onClick={() => { logout(); setIsOpen(false); }} className="w-full text-left flex items-center text-slate-700 hover:bg-red-50 hover:text-red-700 px-3 py-2 rounded-md text-base font-medium pl-8">
                  {t('লগআউট', 'Logout')}
                </button>
              </div>
            ) : (
              <button onClick={() => { login(); setIsOpen(false); }} className="w-full text-left flex items-center bg-red-700 text-white px-3 py-2 rounded-md text-base font-bold mt-2">
                <LogIn className="w-5 h-5 mr-2" /> {t('বুক করুন', 'Book Now')}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
