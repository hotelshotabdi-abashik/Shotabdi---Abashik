import { MessageCircle, PhoneCall, Mail } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function HelpDesk() {
  const { t } = useLanguage();
  return (
    <div className="bg-slate-50 py-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">{t('হেল্প ডেস্ক', 'Help Desk')}</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">{t('যেকোনো প্রয়োজনে আমাদের সাথে যোগাযোগ করুন। আমরা ২৪ ঘণ্টা আপনার সেবায় নিয়োজিত।', 'Contact us for any need. We are at your service 24 hours a day.')}</p>
          <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mt-6"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <PhoneCall className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{t('ফোন করুন', 'Call Us')}</h3>
            <p className="text-slate-600 mb-4">{t('সরাসরি কথা বলতে কল করুন:', 'Call to speak directly:')}</p>
            <p className="font-bold text-red-600">+880 1717-425702</p>
            <p className="font-bold text-red-600">+880 1334-935566</p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{t('ইমেইল করুন', 'Email Us')}</h3>
            <p className="text-slate-600 mb-4">{t('যেকোনো তথ্যের জন্য ইমেইল করুন:', 'Email for any information:')}</p>
            <a href="mailto:hotel@shotabdi-abashik.bd" className="font-bold text-red-600 hover:underline block">hotel@shotabdi-abashik.bd</a>
            <a href="mailto:hotelshotabdiabashik@gmail.com" className="font-bold text-red-600 hover:underline block">hotelshotabdiabashik@gmail.com</a>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{t('মেসেজ করুন', 'Message Us')}</h3>
            <p className="text-slate-600 mb-4">{t('আমাদের ফেসবুক পেজে মেসেজ করুন অথবা ওয়েবসাইটের মাধ্যমে যোগাযোগ করুন।', 'Message us on our Facebook page or contact us through the website.')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
