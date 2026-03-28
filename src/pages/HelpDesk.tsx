import { MessageCircle, PhoneCall, Mail, Phone, Send } from 'lucide-react';
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
            
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-2">+880 1717-425702</p>
                <div className="flex justify-center gap-2">
                  <a href="tel:+8801717425702" className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                    <Phone className="w-4 h-4" /> {t('কল', 'Call')}
                  </a>
                  <a href="https://wa.me/8801717425702" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-2">+880 1334-935566</p>
                <div className="flex justify-center gap-2">
                  <a href="tel:+8801334935566" className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                    <Phone className="w-4 h-4" /> {t('কল', 'Call')}
                  </a>
                  <a href="https://wa.me/8801334935566" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{t('ইমেইল করুন', 'Email Us')}</h3>
            <p className="text-slate-600 mb-4">{t('যেকোনো তথ্যের জন্য ইমেইল করুন:', 'Email for any information:')}</p>
            
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-2 text-sm break-all">hotel@shotabdi-abashik.bd</p>
                <a href="mailto:hotel@shotabdi-abashik.bd" className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                  <Send className="w-4 h-4" /> {t('ইমেইল পাঠান', 'Send Email')}
                </a>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-2 text-sm break-all">hotelshotabdiabashik@gmail.com</p>
                <a href="mailto:hotelshotabdiabashik@gmail.com" className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                  <Send className="w-4 h-4" /> {t('ইমেইল পাঠান', 'Send Email')}
                </a>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{t('মেসেজ করুন', 'Message Us')}</h3>
            <p className="text-slate-600 mb-6">{t('আমাদের ফেসবুক পেজে মেসেজ করুন অথবা ওয়েবসাইটের মাধ্যমে যোগাযোগ করুন।', 'Message us on our Facebook page or contact us through the website.')}</p>
            
            <a 
              href="https://www.facebook.com/hotelshotabdi" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 bg-[#1877F2] text-white px-6 py-3 rounded-xl hover:bg-[#166fe5] transition-all shadow-lg shadow-blue-100 font-bold"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96C18.34 21.21 22 17.06 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
              </svg>
              {t('ফেসবুক মেসেঞ্জার', 'Facebook Messenger')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
