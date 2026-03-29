import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Globe, Facebook, Instagram, Twitter, Youtube, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

const iconMap: { [key: string]: any } = {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Globe
};

export default function Footer() {
  const { t } = useLanguage();
  const [socialLinks, setSocialLinks] = useState<any[]>([]);

  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        const q = query(collection(db, 'socialLinks'), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        const links = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSocialLinks(links);
      } catch (error) {
        console.error("Error fetching social links:", error);
      }
    };
    fetchSocialLinks();
  }, []);

  const defaultSocialLinks = [
    { id: 'default-fb', platform: 'Facebook', url: 'https://www.facebook.com/hotelshotabdi', icon: 'Facebook' }
  ];

  const displayLinks = socialLinks.length > 0 ? socialLinks : defaultSocialLinks;

  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-white text-lg font-bold mb-4">{t('হোটেল শতাব্দী আবাসিক', 'Hotel Shotabdi Abashik')}</h3>
          <p className="text-sm leading-relaxed">
            {t('সিলেটের কুমারগাঁও বাস টার্মিনালের কাছে অবস্থিত একটি সাশ্রয়ী মূল্যের আবাসিক হোটেল। শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয় (SUST) এবং মাউন্ট এডোরা হাসপাতালের কাছাকাছি।', 'An affordable residential hotel located near Kumargaon Bus Terminal in Sylhet. Close to Shahjalal University of Science and Technology (SUST) and Mount Adora Hospital.')}
          </p>
        </div>
        
        <div>
          <h3 className="text-white text-lg font-bold mb-4">{t('যোগাযোগ', 'Contact')}</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start">
              <MapPin className="w-5 h-5 mr-2 text-red-500 flex-shrink-0" />
              <span>{t('কুমারগাঁও বাস টার্মিনাল, সুনামগঞ্জ রোড, সিলেট, বাংলাদেশ', 'Kumargaon Bus Terminal, Sunamganj Road, Sylhet, Bangladesh')}</span>
            </li>
            <li className="flex items-center">
              <Phone className="w-5 h-5 mr-2 text-red-500 flex-shrink-0" />
              <span>+880 1717-425702 <br/> +880 1334-935566</span>
            </li>
            <li className="flex items-start">
              <Mail className="w-5 h-5 mr-2 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex flex-col">
                <a href="mailto:hotel@shotabdi-abashik.bd" className="hover:text-white transition-colors">hotel@shotabdi-abashik.bd</a>
                <a href="mailto:hotelshotabdiabashik@gmail.com" className="hover:text-white transition-colors">hotelshotabdiabashik@gmail.com</a>
              </div>
            </li>
            {displayLinks.map((link) => {
              const IconComponent = iconMap[link.icon] || Globe;
              return (
                <li key={link.id} className="flex items-center">
                  <IconComponent className="w-5 h-5 mr-2 text-red-500 flex-shrink-0" />
                  <a href={link.url} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                    {link.url.replace('https://', '').replace('www.', '')}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="text-white text-lg font-bold mb-4">{t('গুরুত্বপূর্ণ লিংক', 'Important Links')}</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/rooms" className="hover:text-red-400 transition-colors">{t('রুম বুকিং', 'Room Booking')}</Link></li>
            <li><Link to="/about" className="hover:text-red-400 transition-colors">{t('আমাদের সম্পর্কে', 'About Us')}</Link></li>
            <li><Link to="/help-desk" className="hover:text-red-400 transition-colors">{t('হেল্প ডেস্ক', 'Help Desk')}</Link></li>
            <li><Link to="/tour-desk" className="hover:text-red-400 transition-colors">{t('ট্যুর ডেস্ক', 'Tour Desk')}</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-red-400 transition-colors">{t('গোপনীয়তা নীতি', 'Privacy Policy')}</Link></li>
            <li><Link to="/terms-of-service" className="hover:text-red-400 transition-colors">{t('পরিষেবার শর্তাবলী', 'Terms of Service')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-sm flex flex-col gap-2">
        <p>&copy; {new Date().getFullYear()} Hotel Shotabdi Abashik. All rights reserved.</p>
      </div>
    </footer>
  );
}
