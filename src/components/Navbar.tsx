import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useContent } from '../context/ContentContext';
import { Menu, X, LogIn, LogOut, User, Globe, Edit, Bell, Calendar, Home, Bed, Utensils, Map, Star, Headphones, Info, ArrowLeft } from 'lucide-react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';

import { EditableImage } from './EditableImage';

export default function Navbar() {
  const { user, profile, login, logout, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { editMode, setEditMode } = useContent();
  const [isOpen, setIsOpen] = useState(false);
  const [mobileMenuSection, setMobileMenuSection] = useState<'main' | 'profile'>('main');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isFullScreenNotification, setIsFullScreenNotification] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const mobileNotificationDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'general'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data());
      }
    });
    return () => unsubscribe();
  }, []);

  const websiteName = settings?.websiteName || t('হোটেল শতাব্দী আবাসিক', 'Hotel Shotabdi Abashik');
  const logoUrl = settings?.logoUrl || "https://pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev/logo/shotabdi%20logo.png";

  const navLinks = [
    { name: t('হোম', 'Home'), path: '/' },
    { name: t('রুম', 'Rooms'), path: '/rooms' },
    { name: t('আমাদের সম্পর্কে', 'About Us'), path: '/about' },
    { name: t('রেস্টুরেন্ট', 'Restaurant'), path: '/restaurant' },
    { name: t('ট্যুর ডেস্ক', 'Tour Desk'), path: '/tour-desk' },
    { name: t('গ্যালারি', 'Gallery'), path: '/gallery' },
    { name: t('রিভিউ', 'Reviews'), path: '/reviews' },
    { name: t('হেল্প ডেস্ক', 'Help Desk'), path: '/help-desk' },
  ];

  useEffect(() => {
    setIsOpen(false);
    setMobileMenuSection('main');
    setIsProfileOpen(false);
    setIsNotificationOpen(false);
    setIsFullScreenNotification(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Profile dropdowns
      const isOutsideProfile = 
        (!dropdownRef.current || !dropdownRef.current.contains(target)) &&
        (!mobileDropdownRef.current || !mobileDropdownRef.current.contains(target));
      
      if (isOutsideProfile) {
        setIsProfileOpen(false);
      }

      // Notification dropdowns
      const isOutsideNotification = 
        (!notificationDropdownRef.current || !notificationDropdownRef.current.contains(target)) &&
        (!mobileNotificationDropdownRef.current || !mobileNotificationDropdownRef.current.contains(target));

      if (isOutsideNotification) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [hasSeenNotifications, setHasSeenNotifications] = useState(false);

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
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
      setNotificationCount(notifs.length);
      if (notifs.length > 0) {
        setHasSeenNotifications(false);
      }
    });

    return () => unsubscribe();
  }, [user, profile]);

  useEffect(() => {
    if (isOpen || isFullScreenNotification || isProfileOpen || isNotificationOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isFullScreenNotification, isProfileOpen, isNotificationOpen]);

  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
    setHasSeenNotifications(true);
  };

  const handleNotificationItemClick = (notif: any) => {
    setIsNotificationOpen(false);
    setIsFullScreenNotification(false);
    setHasSeenNotifications(true);
    
    if (profile?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/my-stays');
    }
    
    // Scroll to the booking after a short delay to allow page load
    setTimeout(() => {
      const element = document.getElementById(`booking-${notif.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-red-500', 'transition-all', 'duration-1000');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-red-500');
        }, 3000);
      }
    }, 500);
  };

  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsBottomNavVisible(true);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        setIsBottomNavVisible(false);
      }, 3000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleScroll);
      window.removeEventListener('mousemove', handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const handleNavClick = (path: string, e: React.MouseEvent) => {
    setIsOpen(false);
    if (path === '/' && window.location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isHome = location.pathname === '/';
  const isSolid = scrolled || !isHome;

  return (
    <>
    <nav className={`fixed w-full top-0 z-[9999] transition-all duration-500 ${isSolid ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent shadow-none'} text-black`}>
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between h-14 py-1 items-center">
          <div className="flex items-center flex-1 mr-2 sm:mr-4 min-w-0">
            <Link to="/" className="flex items-center gap-2 min-w-0" onClick={(e) => handleNavClick('/', e)}>
              <EditableImage 
                contentKey="site_logo" 
                defaultSrc={logoUrl} 
                className="h-6 sm:h-8 w-auto flex-shrink-0 object-contain" 
                alt={`${websiteName} Logo`}
                folder="shotabdi-abashik/logo"
              />
              <span className={`font-bold text-[10px] sm:text-xs md:text-sm lg:text-base leading-tight truncate text-black`}>
                {websiteName}
              </span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-0.5 xl:gap-1 flex-shrink-0">
            {profile?.role === 'admin' && (
              <button 
                onClick={() => setEditMode(!editMode)} 
                className={`flex items-center px-2 py-1.5 rounded-md text-xs xl:text-sm font-bold transition-colors whitespace-nowrap ${editMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
              >
                <Edit className="w-3 h-3 xl:w-4 xl:h-4 mr-1" /> {editMode ? t('সম্পাদনা বন্ধ করুন', 'Stop Editing') : t('ওয়েব সম্পাদনা', 'Edit Web')}
              </button>
            )}
            {(!user || profile?.profileCompleted) && navLinks.map((link) => (
              <Link key={link.name} to={link.path} onClick={(e) => handleNavClick(link.path, e)} className={`hover:bg-red-50 hover:text-red-700 px-1 md:px-1.5 xl:px-2 py-2 rounded-md text-[10px] md:text-xs xl:text-sm font-medium transition-colors whitespace-nowrap text-black`}>
                {link.name}
              </Link>
            ))}

            <button
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className={`flex items-center justify-center ml-1 px-2 xl:px-3 py-1.5 rounded-full transition-colors text-xs xl:text-sm font-bold flex-shrink-0 bg-slate-100 text-black hover:bg-red-100 hover:text-red-700`}
            >
              <Globe className="w-3 h-3 xl:w-4 xl:h-4 mr-1" />
              {language === 'bn' ? 'EN' : 'BN'}
            </button>
            
            {loading ? (
              <div className="w-24 h-8 xl:h-10 bg-slate-100/20 animate-pulse rounded-md ml-1 xl:ml-2 flex-shrink-0"></div>
            ) : (
              <div className={`flex items-center ml-1 xl:ml-2 border-l pl-1 xl:pl-2 flex-shrink-0 ${isSolid ? 'border-slate-200' : 'border-white/20'}`}>
                <div className="relative" ref={notificationDropdownRef}>
                  <button 
                    onClick={user ? handleNotificationClick : login}
                    className={`relative flex items-center justify-center w-8 h-8 xl:w-10 xl:h-10 rounded-full transition-colors focus:outline-none mr-1 xl:mr-2 flex-shrink-0 bg-slate-100 text-black hover:bg-red-100 hover:text-red-700`}
                    title={user ? "Notifications" : "Login to see notifications"}
                  >
                    <Bell className="w-4 h-4 xl:w-5 xl:h-5" />
                    {notificationCount > 0 && !hasSeenNotifications && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 xl:px-2 xl:py-1 text-[10px] xl:text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                        {notificationCount}
                      </span>
                    )}
                  </button>

                    {isNotificationOpen && user && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-2 border border-slate-100 z-50 max-h-96 overflow-y-auto">
                        <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                          <h3 className="font-bold text-slate-800">{t('নোটিফিকেশন', 'Notifications')}</h3>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsNotificationOpen(false);
                              setIsFullScreenNotification(true);
                            }}
                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                          >
                            {t('সব দেখুন', 'View All')}
                          </button>
                        </div>
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-slate-50">
                            {notifications.slice(0, 5).map((notif: any) => (
                              <div 
                                key={notif.id} 
                                onClick={() => handleNotificationItemClick(notif)}
                                className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <p className="text-sm text-slate-800 font-medium">
                                  {profile?.role === 'admin' 
                                    ? `${notif.userName || 'Guest'} requested a booking` 
                                    : `Booking ${notif.status}`}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {notif.roomName} • {new Date(notif.checkIn).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-6 text-center text-slate-500 text-sm">
                            {t('কোনো নোটিফিকেশন নেই', 'No notifications')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {user ? (
                    <div className="relative" ref={dropdownRef}>
                      <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={`flex items-center gap-2 p-1 rounded-full transition-colors focus:outline-none hover:bg-slate-100`}
                      >
                        {user.photoURL || profile?.photoURL ? (
                          <img 
                            src={user.photoURL || profile?.photoURL} 
                            alt="Profile" 
                            className="w-8 h-8 xl:w-9 xl:h-9 rounded-full object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={`w-8 h-8 xl:w-9 xl:h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-200 text-slate-500`}>
                            <User className="w-4 h-4 xl:w-5 xl:h-5" />
                          </div>
                        )}
                      </button>

                      {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 border border-slate-100 z-50 overflow-hidden">
                          <button 
                            onClick={() => { navigate('/my-stays'); setIsProfileOpen(false); }}
                            className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            <Calendar className="w-4 h-4 mr-3" /> {t('আমার বুকিং', 'My Stays')}
                          </button>
                          <button 
                            onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
                            className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            <User className="w-4 h-4 mr-3" /> {t('অ্যাকাউন্ট', 'Account')}
                          </button>
                          {profile?.role === 'admin' && (
                            <button 
                              onClick={() => { navigate('/admin'); setIsProfileOpen(false); }}
                              className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                            >
                              <Edit className="w-4 h-4 mr-3" /> {t('অ্যাডমিন', 'Admin')}
                            </button>
                          )}
                          <div className="border-t border-slate-50 my-1"></div>
                          <button 
                            onClick={() => { logout(); setIsProfileOpen(false); }} 
                            className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4 mr-3" /> {t('লগআউট', 'Logout')}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                  <button onClick={login} className="flex items-center bg-red-700 text-white hover:bg-red-800 px-2 md:px-3 xl:px-4 py-1.5 xl:py-2 rounded-md text-[10px] md:text-xs xl:text-sm font-bold transition-colors flex-shrink-0">
                    <LogIn className="w-3 h-3 xl:w-4 xl:h-4 mr-1 xl:mr-2" /> {t('লগইন', 'Login')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className={`flex items-center justify-center px-2 sm:px-3 py-1.5 rounded-full transition-colors text-xs sm:text-sm font-bold flex-shrink-0 ${isSolid ? 'bg-slate-100 text-black' : 'bg-white/20 text-white'}`}
            >
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              {language === 'bn' ? 'EN' : 'BN'}
            </button>
            
            {user ? (
              <div className="relative" ref={mobileDropdownRef}>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors focus:outline-none flex-shrink-0 overflow-hidden border ${isSolid ? 'bg-slate-100 text-black border-slate-200' : 'bg-white/20 text-white border-white/30'}`}
                >
                  {user.photoURL || profile?.photoURL ? (
                    <img 
                      src={user.photoURL || profile?.photoURL} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 border border-slate-100 z-50 overflow-hidden">
                    <button 
                      onClick={() => { navigate('/my-stays'); setIsProfileOpen(false); }}
                      className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <Calendar className="w-4 h-4 mr-3" /> {t('আমার বুকিং', 'My Stays')}
                    </button>
                    <button 
                      onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
                      className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <User className="w-4 h-4 mr-3" /> {t('অ্যাকাউন্ট', 'Account')}
                    </button>
                    {profile?.role === 'admin' && (
                      <button 
                        onClick={() => { navigate('/admin'); setIsProfileOpen(false); }}
                        className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        <Edit className="w-4 h-4 mr-3" /> {t('অ্যাডমিন', 'Admin')}
                      </button>
                    )}
                    <div className="border-t border-slate-50 my-1"></div>
                    <button 
                      onClick={() => { logout(); setIsProfileOpen(false); }} 
                      className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" /> {t('লগআউট', 'Logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={login} className="flex items-center bg-red-700 text-white hover:bg-red-800 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors flex-shrink-0">
                <LogIn className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> {t('লগইন', 'Login')}
              </button>
            )}

            <div className="relative" ref={mobileNotificationDropdownRef}>
              <button 
                onClick={user ? handleNotificationClick : login}
                className={`relative inline-flex items-center justify-center p-1.5 sm:p-2 rounded-md transition-colors focus:outline-none flex-shrink-0 text-black hover:bg-slate-100`}
                title={user ? "Notifications" : "Login to see notifications"}
              >
                <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                {notificationCount > 0 && !hasSeenNotifications && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                    {notificationCount}
                  </span>
                )}
              </button>
              
              {isNotificationOpen && user && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg py-2 border border-slate-100 z-50 max-h-96 overflow-y-auto">
                  <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">{t('নোটিফিকেশন', 'Notifications')}</h3>
                    <button 
                      onClick={() => {
                        setIsNotificationOpen(false);
                        setIsFullScreenNotification(true);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      {t('সব দেখুন', 'View All')}
                    </button>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {notifications.slice(0, 5).map((notif: any) => (
                        <div 
                          key={notif.id} 
                          onClick={() => handleNotificationItemClick(notif)}
                          className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <p className="text-sm text-slate-800 font-medium">
                            {profile?.role === 'admin' 
                              ? `${notif.userName || 'Guest'} requested a booking` 
                              : `Booking ${notif.status}`}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {notif.roomName} • {new Date(notif.checkIn).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-slate-500 text-sm">
                      {t('কোনো নোটিফিকেশন নেই', 'No notifications')}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => setIsOpen(!isOpen)} className={`inline-flex items-center justify-center p-1.5 sm:p-2 rounded-md transition-colors focus:outline-none flex-shrink-0 text-black hover:bg-slate-100`}>
              {isOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>
        </div>
      </div>

      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[100000] bg-white flex flex-col h-[100dvh] overflow-hidden animate-in fade-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white sticky top-0 z-[100001]">
            {mobileMenuSection === 'main' ? (
              <Link to="/" className="flex items-center gap-2 min-w-0" onClick={(e) => handleNavClick('/', e)}>
                <EditableImage 
                  contentKey="site_logo" 
                  defaultSrc={logoUrl} 
                  className="h-6 w-auto flex-shrink-0 object-contain" 
                  alt={`${websiteName} Logo`}
                  folder="shotabdi-abashik/logo"
                />
                <span className="font-bold text-xs text-slate-900 leading-tight truncate">
                  {websiteName}
                </span>
              </Link>
            ) : (
              <button 
                onClick={() => setMobileMenuSection('main')}
                className="flex items-center gap-2 text-slate-900 font-bold"
              >
                <ArrowLeft className="w-6 h-6" />
                <span>{t('পিছনে', 'Back')}</span>
              </button>
            )}
            <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {mobileMenuSection === 'main' ? (
              <>
                {(!user || profile?.profileCompleted) && navLinks.map((link) => (
                  <Link key={link.name} to={link.path} onClick={() => setIsOpen(false)} className="block text-slate-700 hover:bg-red-50 hover:text-red-700 px-4 py-3 rounded-xl text-lg font-medium transition-colors">
                    {link.name}
                  </Link>
                ))}
                
                {profile?.role === 'admin' && (
                  <button 
                    onClick={() => { setEditMode(!editMode); setIsOpen(false); }} 
                    className={`block w-full text-left px-4 py-3 rounded-xl text-lg font-bold mt-4 flex items-center ${editMode ? 'bg-red-600 text-white hover:bg-red-700' : 'text-amber-800 bg-amber-50 hover:bg-amber-100'}`}
                  >
                    <Edit className="w-5 h-5 mr-3" /> {editMode ? t('সম্পাদনা বন্ধ করুন', 'Stop Editing') : t('ওয়েব সম্পাদনা', 'Edit Web')}
                  </button>
                )}

                {user && (
                  <div className="border-t border-slate-100 pt-6 mt-6">
                    <button 
                      onClick={() => setMobileMenuSection('profile')}
                      className="w-full flex items-center justify-between text-slate-700 hover:bg-red-50 hover:text-red-700 px-4 py-4 rounded-xl text-lg font-bold transition-colors bg-slate-50"
                    >
                      <div className="flex items-center">
                        <User className="w-6 h-6 mr-3 text-red-700" />
                        <span>{t('প্রোফাইল মেনু', 'Profile Menu')}</span>
                      </div>
                      <ArrowLeft className="w-5 h-5 rotate-180 text-slate-400" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2 animate-in slide-in-from-right duration-200">
                <div className="px-4 py-2 text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center mb-2">
                  <User className="w-4 h-4 mr-2" /> {t('আপনার অ্যাকাউন্ট', 'Your Account')}
                </div>
                
                <Link to="/my-stays" onClick={() => setIsOpen(false)} className="block text-slate-700 hover:bg-red-50 hover:text-red-700 px-4 py-4 rounded-xl text-lg font-medium transition-colors border border-slate-100">
                  {t('আমার বুকিং', 'My Stays')}
                </Link>
                
                {profile?.profileCompleted && (
                  <Link to="/profile" onClick={() => setIsOpen(false)} className="block text-slate-700 hover:bg-red-50 hover:text-red-700 px-4 py-4 rounded-xl text-lg font-medium transition-colors border border-slate-100">
                    {t('অ্যাকাউন্ট পরিচালনা', 'Manage Account')}
                  </Link>
                )}
                
                {profile?.role === 'admin' && (
                  <Link to="/admin" onClick={() => setIsOpen(false)} className="block text-slate-700 hover:bg-red-50 hover:text-red-700 px-4 py-4 rounded-xl text-lg font-medium transition-colors border border-slate-100">
                    {t('অ্যাডমিন প্যানেল', 'Admin Panel')}
                  </Link>
                )}
                
                <button 
                  onClick={() => { logout(); setIsOpen(false); }} 
                  className="w-full text-left flex items-center text-red-600 hover:bg-red-50 px-4 py-4 rounded-xl text-lg font-bold transition-colors mt-8 border border-red-100 bg-red-50/30"
                >
                  <LogOut className="w-6 h-6 mr-3" /> {t('লগআউট', 'Logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Screen Notifications Modal */}
      {isFullScreenNotification && (
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white sticky top-0">
            <h2 className="text-xl font-bold text-slate-900">{t('সব নোটিফিকেশন', 'All Notifications')}</h2>
            <button 
              onClick={() => setIsFullScreenNotification(false)}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            <div className="max-w-3xl mx-auto">
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notif: any) => (
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationItemClick(notif)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-900">
                          {profile?.role === 'admin' 
                            ? `${notif.userName || 'Guest'} requested a booking` 
                            : `Booking ${notif.status}`}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          notif.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          notif.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {notif.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p><span className="font-medium">Room:</span> {notif.roomName}</p>
                        <p><span className="font-medium">Check-in:</span> {new Date(notif.checkIn).toLocaleDateString()}</p>
                        <p><span className="font-medium">Check-out:</span> {new Date(notif.checkOut).toLocaleDateString()}</p>
                        {profile?.role === 'admin' && (
                          <p><span className="font-medium">Contact:</span> {notif.userPhone || 'N/A'}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">{t('কোনো নোটিফিকেশন নেই', 'No notifications')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
