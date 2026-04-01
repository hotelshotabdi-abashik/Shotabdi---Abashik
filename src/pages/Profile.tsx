import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { UserCircle, FileText, Phone, User, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import PhoneInput from '../components/PhoneInput';

export default function Profile() {
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('profileDraft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Ignore parse error
      }
    }
    return {
      legalName: '',
      phone: '',
      guardianName: '',
      guardianPhone: '',
      nidNumber: ''
    };
  });

  useEffect(() => {
    if (profile) {
      // If profile is completed, use profile data instead of draft
      if (profile.profileCompleted) {
        setFormData({
          legalName: profile.legalName || '',
          phone: profile.phone || '',
          guardianName: profile.guardianName || '',
          guardianPhone: profile.guardianPhone || '',
          nidNumber: profile.nidNumber || ''
        });
      }

      // Check 30-minute cooldown
      if (profile.lastUpdated) {
        const lastUpdatedTime = typeof profile.lastUpdated === 'number' 
          ? profile.lastUpdated 
          : (profile.lastUpdated as any).toDate?.().getTime() || 0;
          
        const now = new Date().getTime();
        const diff = now - lastUpdatedTime;
        const thirtyMins = 30 * 60 * 1000;
        if (diff < thirtyMins) {
          setTimeRemaining(Math.ceil((thirtyMins - diff) / 60000));
        } else {
          setTimeRemaining(null);
        }
      }
    }
  }, [profile]);

  useEffect(() => {
    // Save to local storage if profile is not completed
    if (!profile?.profileCompleted) {
      localStorage.setItem('profileDraft', JSON.stringify(formData));
    }
  }, [formData, profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (timeRemaining !== null && timeRemaining > 0) {
      toast.error(t(`অনুগ্রহ করে আরও ${timeRemaining} মিনিট অপেক্ষা করুন।`, `Please wait ${timeRemaining} more minutes.`));
      return;
    }

    const { legalName, phone, guardianName, guardianPhone, nidNumber } = formData;
    if (!legalName.trim() || !phone.trim() || !guardianName.trim() || !guardianPhone.trim() || !nidNumber.trim()) {
      toast.error(t("সবগুলো তথ্য পূরণ করা বাধ্যতামূলক।", "All fields are required."));
      return;
    }

    const isValidPhone = (fullPhone: string) => {
      const codes = ['+880', '+1', '+44', '+91', '+92', '+971', '+966', '+60', '+65', '+61'];
      let numberPart = fullPhone;
      for (const code of codes) {
        if (fullPhone.startsWith(code)) {
          numberPart = fullPhone.slice(code.length);
          break;
        }
      }
      const digitsOnly = numberPart.replace(/\D/g, '');
      return digitsOnly.length >= 9 && digitsOnly.length <= 12;
    };

    if (!isValidPhone(phone)) {
      toast.error(t("মোবাইল নম্বর ৯ থেকে ১২ ডিজিটের মধ্যে হতে হবে।", "Mobile number must be between 9 and 12 digits."));
      return;
    }

    if (!isValidPhone(guardianPhone)) {
      toast.error(t("অভিভাবকের মোবাইল নম্বর ৯ থেকে ১২ ডিজিটের মধ্যে হতে হবে।", "Guardian mobile number must be between 9 and 12 digits."));
      return;
    }
    
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...formData,
        profileCompleted: true,
        lastUpdated: serverTimestamp()
      });
      await refreshProfile();
      localStorage.removeItem('profileDraft');
      toast.success(t("প্রোফাইল সফলভাবে আপডেট করা হয়েছে!", "Profile updated successfully!"));
      navigate('/');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t("প্রোফাইল আপডেট করতে সমস্যা হয়েছে।", "Failed to update profile."));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">{t('অনুগ্রহ করে লগইন করুন।', 'Please login.')}</div>;
  }

  return (
    <div className="bg-slate-50 py-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-red-700 px-8 py-10 text-white text-center">
            <UserCircle className="w-20 h-20 mx-auto mb-4 opacity-90" />
            <h1 className="text-3xl font-bold mb-2">
              {profile?.profileCompleted ? t('অ্যাকাউন্ট ম্যানেজ করুন', 'Manage Account') : t('প্রোফাইল সম্পূর্ণ করুন', 'Complete Profile')}
            </h1>
            <p className="text-red-100">
              {profile?.profileCompleted 
                ? t('আপনার প্রোফাইলের তথ্য আপডেট করুন (প্রতি ৩০ মিনিটে একবার)।', 'Update your profile information (once every 30 minutes).') 
                : t('বুকিং করার জন্য আপনার সঠিক তথ্য প্রদান করা আবশ্যক। সবগুলো ঘর পূরণ করুন।', 'You must provide your correct information to make a booking. Please fill all fields.')}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {!profile?.profileCompleted && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-6 flex items-center">
                <div className="bg-red-100 p-2 rounded-full mr-3">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-sm">{t('প্রোফাইল অসম্পূর্ণ!', 'Profile Incomplete!')}</p>
                  <p className="text-xs">{t('ওয়েবসাইট ব্যবহার করতে এবং বুকিং করতে নিচের সব তথ্য পূরণ করুন।', 'Please fill all the information below to use the website and make bookings.')}</p>
                </div>
              </div>
            )}

            {timeRemaining !== null && timeRemaining > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl mb-6">
                {t('আপনি সম্প্রতি প্রোফাইল আপডেট করেছেন। আবার আপডেট করতে', 'You have recently updated your profile. To update again wait')} <strong>{timeRemaining} {t('মিনিট', 'minutes')}</strong> {t('অপেক্ষা করুন।', '')}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center">
                  <User className="w-5 h-5 mr-2 text-red-600" /> {t('ব্যক্তিগত তথ্য', 'Personal Information')}
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('পূর্ণ নাম (NID অনুযায়ী)', 'Full Name (As per NID)')} <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="legalName" 
                    required 
                    value={formData.legalName} 
                    onChange={handleChange}
                    disabled={timeRemaining !== null && timeRemaining > 0}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder={t("আপনার পূর্ণ নাম", "Your full name")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('মোবাইল নম্বর', 'Mobile Number')} <span className="text-red-500">*</span></label>
                  <PhoneInput 
                    name="phone" 
                    required 
                    value={formData.phone} 
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                    disabled={timeRemaining !== null && timeRemaining > 0}
                  />
                </div>
              </div>

              {/* Guardian Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-red-600" /> {t('অভিভাবকের তথ্য', 'Guardian Information')}
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('অভিভাবকের নাম', 'Guardian Name')} <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="guardianName" 
                    required 
                    value={formData.guardianName} 
                    onChange={handleChange}
                    disabled={timeRemaining !== null && timeRemaining > 0}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder={t("পিতা/মাতা/স্বামীর নাম", "Father/Mother/Husband's Name")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('অভিভাবকের মোবাইল নম্বর', 'Guardian Mobile Number')} <span className="text-red-500">*</span></label>
                  <PhoneInput 
                    name="guardianPhone" 
                    required 
                    value={formData.guardianPhone} 
                    onChange={(val) => setFormData({ ...formData, guardianPhone: val })}
                    disabled={timeRemaining !== null && timeRemaining > 0}
                  />
                </div>
              </div>
            </div>

            {/* NID Info */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-red-600" /> {t('পরিচয়পত্র (NID)', 'Identity Card (NID)')}
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('NID নম্বর', 'NID Number')} <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="nidNumber" 
                  required 
                  value={formData.nidNumber} 
                  onChange={handleChange}
                  disabled={timeRemaining !== null && timeRemaining > 0}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder={t("আপনার NID নম্বর", "Your NID number")}
                />
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit" 
                disabled={loading || (timeRemaining !== null && timeRemaining > 0)}
                className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? t('সংরক্ষণ করা হচ্ছে...', 'Saving...') : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {t('সংরক্ষণ করুন', 'Save')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
