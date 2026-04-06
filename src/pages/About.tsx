import { MapPin, Phone, Mail, Globe, Clock, ShieldCheck, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { EditableText } from '../components/EditableText';
import { Helmet } from 'react-helmet-async';
import { useContent } from '../context/ContentContext';

export default function About() {
  const { t } = useLanguage();
  const { content } = useContent();
  const logoUrl = content.site_logo || "https://pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev/logo/shotabdi%20logo.png";
  const websiteName = "HOTEL SHOTABDI ABASHIK";
  const pageTitle = `${t('আমাদের সম্পর্কে', 'About Us')} | ${websiteName}`;
  const description = t(
    'হোটেল শতাব্দী আবাসিক হলো বাংলাদেশের সিলেটে অবস্থিত একটি সাশ্রয়ী মূল্যের আবাসিক হোটেল। এটি কুমারগাঁও বাস টার্মিনালের কাছে অবস্থিত।',
    'Hotel Shotabdi Abashik is an affordable residential hotel located in Sylhet, Bangladesh near Kumargaon Bus Terminal.'
  );

  return (
    <div className="bg-slate-50 py-16 min-h-screen">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={logoUrl} />
        <meta property="twitter:title" content={pageTitle} />
        <meta property="twitter:description" content={description} />
        <meta property="twitter:image" content={logoUrl} />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
            <EditableText contentKey="about_title" defaultText={t('আমাদের সম্পর্কে', 'About Us')} />
          </h1>
          <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mt-6"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-900">
              <EditableText contentKey="about_subtitle" defaultText={t('হোটেল শতাব্দী আবাসিক', 'Hotel Shotabdi Abashik')} />
            </h2>
            <div className="text-lg text-slate-600 leading-relaxed">
              <EditableText contentKey="about_desc_1" defaultText={t('হোটেল শতাব্দী আবাসিক হলো বাংলাদেশের সিলেটে অবস্থিত একটি সাশ্রয়ী মূল্যের আবাসিক হোটেল। এটি কুমারগাঁও বাস টার্মিনালের কাছে অবস্থিত, যা ভ্রমণকারীদের জন্য একটি সুবিধাজনক অবস্থান।', 'Hotel Shotabdi Abashik is an affordable residential hotel located in Sylhet, Bangladesh. It is situated near Kumargaon Bus Terminal, making it a convenient location for travelers.')} multiline />
            </div>
            <div className="text-lg text-slate-600 leading-relaxed">
              <EditableText contentKey="about_desc_2" defaultText={t('শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয় (SUST) এবং মাউন্ট এডোরা হাসপাতালের কাছাকাছি হওয়ায় এটি শিক্ষার্থী, রোগীর আত্মীয়স্বজন এবং সাধারণ পর্যটকদের জন্য একটি আদর্শ পছন্দ।', 'Being close to Shahjalal University of Science and Technology (SUST) and Mount Adora Hospital, it is an ideal choice for students, patients\' relatives, and general tourists.')} multiline />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    <EditableText contentKey="about_feature_1_title" defaultText={t('নিরাপদ পরিবেশ', 'Safe Environment')} />
                  </h4>
                  <div className="text-sm text-slate-600">
                    <EditableText contentKey="about_feature_1_desc" defaultText={t('২৪ ঘণ্টা নিরাপত্তা ব্যবস্থা।', '24-hour security system.')} multiline />
                  </div>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    <EditableText contentKey="about_feature_2_title" defaultText={t('পারিবারিক পরিবেশ', 'Family Environment')} />
                  </h4>
                  <div className="text-sm text-slate-600">
                    <EditableText contentKey="about_feature_2_desc" defaultText={t('পরিবার নিয়ে থাকার জন্য উপযুক্ত।', 'Suitable for staying with family.')} multiline />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
            <h3 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-4">{t('যোগাযোগের তথ্য', 'Contact Information')}</h3>
            <ul className="space-y-6">
              <li className="flex items-start">
                <MapPin className="w-6 h-6 mr-4 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <span className="block font-bold text-slate-900">{t('ঠিকানা', 'Address')}</span>
                  <span className="text-slate-600">{t('কুমারগাঁও বাস টার্মিনাল, সুনামগঞ্জ রোড, সিলেট, বাংলাদেশ', 'Kumargaon Bus Terminal, Sunamganj Road, Sylhet, Bangladesh')}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Phone className="w-6 h-6 mr-4 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <span className="block font-bold text-slate-900">{t('ফোন নম্বর', 'Phone Number')}</span>
                  <span className="text-slate-600">+880 1717-425702 <br/> +880 1334-935566</span>
                </div>
              </li>
              <li className="flex items-start">
                <Mail className="w-6 h-6 mr-4 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <span className="block font-bold text-slate-900">{t('ইমেইল', 'Email')}</span>
                  <a href="mailto:hotel@shotabdi-abashik.bd" className="text-red-600 hover:underline block">hotel@shotabdi-abashik.bd</a>
                  <a href="mailto:hotelshotabdiabashik@gmail.com" className="text-red-600 hover:underline block">hotelshotabdiabashik@gmail.com</a>
                </div>
              </li>
              <li className="flex items-start">
                <Globe className="w-6 h-6 mr-4 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <span className="block font-bold text-slate-900">{t('ওয়েবসাইট', 'Website')}</span>
                  <a href="https://hotelshotabdiabashik.bd" target="_blank" rel="noreferrer" className="text-red-600 hover:underline">hotelshotabdiabashik.bd</a>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
