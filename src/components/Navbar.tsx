import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useContent } from '../context/ContentContext';
import { Menu, X, LogIn, LogOut, User, Globe, Edit, Bell } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

import { EditableImage } from './EditableImage';

export default function Navbar() {
  const { user, profile, login, logout, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { editMode, setEditMode } = useContent();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isFullScreenNotification, setIsFullScreenNotification] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
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

  const handleLogoClick = (e: React.MouseEvent) => {
    setIsOpen(false);
    if (window.location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className={`fixed w-full top-0 z-50 transition-all duration-500 ${scrolled ? 'bg-transparent shadow-none' : 'bg-white shadow-sm'} text-slate-900`}>
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between h-14 py-1 items-center">
          <div className="flex items-center flex-1 mr-2 sm:mr-4 min-w-0">
            <Link to="/" className="flex items-center gap-2 min-w-0" onClick={handleLogoClick}>
              <EditableImage 
                contentKey="site_logo" 
                defaultSrc="https://pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev/logo/shotabdi%20logo.png" 
                className="h-6 sm:h-8 w-auto flex-shrink-0 object-contain" 
                alt="Hotel Shotabdi Abashik Logo"
                folder="shotabdi-abashik/logo"
              />
              <span className="font-bold text-[10px] sm:text-xs md:text-sm lg:text-base text-slate-900 leading-tight truncate">
                {t('হোটেল শতাব্দী আবাসিক', 'Hotel Shotabdi Abashik')}
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
              <Link key={link.name} to={link.path} className="text-slate-700 hover:bg-red-50 hover:text-red-700 px-1 md:px-1.5 xl:px-2 py-2 rounded-md text-[10px] md:text-xs xl:text-sm font-medium transition-colors whitespace-nowrap">
                {link.name}
              </Link>
            ))}

            <button
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="flex items-center justify-center ml-1 px-2 xl:px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-red-100 hover:text-red-700 transition-colors text-xs xl:text-sm font-bold flex-shrink-0"
            >
              <Globe className="w-3 h-3 xl:w-4 xl:h-4 mr-1" />
              {language === 'bn' ? 'EN' : 'BN'}
            </button>
            
            {loading ? (
              <div className="w-24 h-8 xl:h-10 bg-slate-100 animate-pulse rounded-md ml-1 xl:ml-2 flex-shrink-0"></div>
            ) : (
              <div className="flex items-center ml-1 xl:ml-2 border-l border-slate-200 pl-1 xl:pl-2 flex-shrink-0">
                <div className="relative" ref={notificationDropdownRef}>
                  <button 
                    onClick={user ? handleNotificationClick : login}
                    className="relative flex items-center justify-center w-8 h-8 xl:w-10 xl:h-10 rounded-full bg-slate-100 text-slate-700 hover:bg-red-100 hover:text-red-700 transition-colors focus:outline-none mr-1 xl:mr-2 flex-shrink-0"
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

                {user ? (
                  <div className="flex items-center gap-0.5 xl:gap-1">
                    <Link 
                      to="/my-stays" 
                      className="text-slate-700 hover:bg-red-50 hover:text-red-700 px-1.5 md:px-2 xl:px-3 py-1.5 rounded-md text-[10px] md:text-xs xl:text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      {t('আমার বুকিং', 'My Stays')}
                    </Link>
                    {profile?.profileCompleted && (
                      <Link 
                        to="/profile" 
                        className="text-slate-700 hover:bg-red-50 hover:text-red-700 px-1.5 md:px-2 xl:px-3 py-1.5 rounded-md text-[10px] md:text-xs xl:text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        {t('অ্যাকাউন্ট', 'Account')}
                      </Link>
                    )}
                    {profile?.role === 'admin' && (
                      <Link 
                        to="/admin" 
                        className="text-slate-700 hover:bg-red-50 hover:text-red-700 px-1.5 md:px-2 xl:px-3 py-1.5 rounded-md text-[10px] md:text-xs xl:text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        {t('অ্যাডমিন', 'Admin')}
                      </Link>
                    )}
                    <button 
                      onClick={logout} 
                      className="flex items-center text-slate-700 hover:bg-red-50 hover:text-red-700 px-1.5 md:px-2 xl:px-3 py-1.5 rounded-md text-[10px] md:text-xs xl:text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      <LogOut className="w-3 h-3 xl:w-4 xl:h-4 mr-1" /> {t('লগআউট', 'Logout')}
                    </button>
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
              className="flex items-center justify-center px-2 sm:px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-red-100 hover:text-red-700 transition-colors text-xs sm:text-sm font-bold flex-shrink-0"
            >
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              {language === 'bn' ? 'EN' : 'BN'}
            </button>
            
            {!user && (
              <button onClick={login} className="flex items-center bg-red-700 text-white hover:bg-red-800 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors flex-shrink-0">
                <LogIn className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> {t('লগইন', 'Login')}
              </button>
            )}

            <div className="relative" ref={notificationDropdownRef}>
              <button 
                onClick={user ? handleNotificationClick : login}
                className="relative inline-flex items-center justify-center p-1.5 sm:p-2 rounded-md text-slate-900 hover:bg-slate-100 focus:outline-none flex-shrink-0"
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

            <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center justify-center p-1.5 sm:p-2 rounded-md text-slate-900 hover:bg-slate-100 focus:outline-none flex-shrink-0">
              {isOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white sticky top-0">
            <Link to="/" className="flex items-center gap-2 min-w-0" onClick={handleLogoClick}>
              <EditableImage 
                contentKey="site_logo" 
                defaultSrc="https://pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev/logo/shotabdi%20logo.png" 
                className="h-6 w-auto flex-shrink-0 object-contain" 
                alt="Hotel Shotabdi Abashik Logo"
                folder="shotabdi-abashik/logo"
              />
              <span className="font-bold text-xs text-slate-900 leading-tight truncate">
                {t('হোটেল শতাব্দী আবাসিক', 'Hotel Shotabdi Abashik')}
              </span>
            </Link>
            <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
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
            {loading ? (
              <div className="w-full h-12 bg-slate-100 animate-pulse rounded-xl mt-4"></div>
            ) : user ? (
              <div className="border-t border-slate-100 pt-6 mt-6 space-y-2">
                <div className="px-4 py-2 text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <User className="w-4 h-4 mr-2" /> {t('প্রোফাইল', 'Profile')}
                </div>
                <Link to="/my-stays" onClick={() => setIsOpen(false)} className="block text-slate-700 hover:bg-red-50 hover:text-red-700 px-4 py-3 rounded-xl text-lg font-medium transition-colors">
                  {t('আমার বুকিং', 'My Stays')}
                </Link>
                {profile?.profileCompleted && (
                  <Link to="/profile" onClick={() => setIsOpen(false)} className="block text-slate-700 hover:bg-red-50 hover:text-red-700 px-4 py-3 rounded-xl text-lg font-medium transition-colors">
                    {t('অ্যাকাউন্ট পরিচালনা', 'Manage Account')}
                  </Link>
                )}
                {profile?.role === 'admin' && (
                  <Link to="/admin" onClick={() => setIsOpen(false)} className="block text-slate-700 hover:bg-red-50 hover:text-red-700 px-4 py-3 rounded-xl text-lg font-medium transition-colors">
                    {t('অ্যাডমিন প্যানেল', 'Admin Panel')}
                  </Link>
                )}
                <button onClick={() => { logout(); setIsOpen(false); }} className="w-full text-left flex items-center text-red-600 hover:bg-red-50 px-4 py-3 rounded-xl text-lg font-medium transition-colors mt-2">
                  <LogOut className="w-5 h-5 mr-3" /> {t('লগআউট', 'Logout')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {/* Full Screen Notifications Modal */}
      {isFullScreenNotification && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
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
    </nav>
  );
}
