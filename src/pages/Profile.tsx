import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { UserCircle, FileText, Phone, User, CheckCircle2, Shield, Lock, Smartphone, Globe, Camera, LogOut, Key, X, BadgeCheck, Fingerprint, Trash2, AlertTriangle, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import PhoneInput from '../components/PhoneInput';
import { sendEmail } from '../services/NotificationService';
import { IdentityVerification } from '../components/IdentityVerification';
import { deleteFromR2, fixR2Url } from '../lib/r2';

export default function Profile() {
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [extractingNid, setExtractingNid] = useState(false);
  const [extractedNidData, setExtractedNidData] = useState<any>(null);
  const [showExtractedModal, setShowExtractedModal] = useState(false);

  const handleExtractUploadedNid = async () => {
    if (!profile?.nidImageUrl) {
      toast.error(t('কোন পরিচয়পত্র (NID) আপলোড করা নেই।', 'No identity card (NID) uploaded.'));
      return;
    }
    setExtractingNid(true);
    try {
      const response = await fetch('/api/extract-nid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: fixR2Url(profile.nidImageUrl) }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract NID information');
      }
      
      const data = await response.json();
      if (data) {
        setExtractedNidData(data);
        setShowExtractedModal(true);
        toast.success(t('এনআইডি তথ্য সফলভাবে এক্সট্র্যাক্ট করা হয়েছে!', 'NID info successfully extracted!'));
      } else {
        toast.error(t('তথ্য এক্সট্র্যাক্ট করা যায়নি। অনুগ্রহ করে স্পষ্ট ছবি দিন।', 'Failed to extract info. Please verify the NID image is clear.'));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t('তথ্য এক্সট্র্যাক্ট করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।', 'Failed to extract NID information. Please try again.'));
    } finally {
      setExtractingNid(false);
    }
  };

  const handleApplyExtractedData = () => {
    if (!extractedNidData) return;
    setFormData({
      ...formData,
      legalName: extractedNidData.fullNameEn || formData.legalName,
      nidNumber: extractedNidData.nidNumber || formData.nidNumber,
    });
    setShowExtractedModal(false);
    toast.success(t('তথ্য ফরমে যুক্ত করা হয়েছে! পরিবর্তনগুলো স্থায়ী করতে নিচে সংরক্ষণ বাটন চাপুন।', 'Data applied to form! Click Save below to persist.'));
  };
  
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

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    verificationCode: '',
    enteredCode: '',
    step: 'initial' // initial, verify, reset
  });

  useEffect(() => {
    if (profile) {
      // Sync profile data dynamically into form fields, while retaining any edited/draft values
      setFormData(prev => ({
        legalName: prev.legalName || profile.legalName || '',
        phone: prev.phone || profile.phone || '',
        guardianName: prev.guardianName || profile.guardianName || '',
        guardianPhone: prev.guardianPhone || profile.guardianPhone || '',
        nidNumber: prev.nidNumber || profile.nidNumber || ''
      }));

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
    if (!profile?.profileCompleted) {
      localStorage.setItem('profileDraft', JSON.stringify(formData));
    }
  }, [formData, profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('অনুগ্রহ করে একটি ছবি নির্বাচন করুন।', 'Please select an image file.'));
      return;
    }

    setLoading(true);
    try {
      const { uploadToR2 } = await import('../lib/r2');
      const fileUrl = await uploadToR2(file, 'shotabdi-abashik/profiles');
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL: fileUrl });
      await refreshProfile();
      toast.success(t('প্রোফাইল ছবি আপডেট করা হয়েছে!', 'Profile picture updated!'));
    } catch (error) {
      console.error(error);
      toast.error(t('ছবি আপলোড করতে সমস্যা হয়েছে।', 'Failed to upload image.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (timeRemaining !== null && timeRemaining > 0) {
      toast.error(t(`অনুগ্রহ করে আরও ${timeRemaining} মিনিট অপেক্ষা করুন।`, `Please wait ${timeRemaining} more minutes.`));
      return;
    }

    const { legalName, phone, guardianName, guardianPhone, nidNumber } = formData;
    const finalNidNumber = nidNumber || profile?.nidNumber || '';

    if (!legalName.trim() || !phone.trim() || !guardianName.trim() || !guardianPhone.trim() || !finalNidNumber.trim()) {
      toast.error(t("সবগুলো তথ্য পূরণ করা বাধ্যতামূলক।", "All fields are required."));
      return;
    }

    // Keep formData synced with correct NID number value
    if (!nidNumber && finalNidNumber) {
      setFormData(prev => ({ ...prev, nidNumber: finalNidNumber }));
    }

    setShowTermsModal(true);
  };

  const handleDeleteNid = async () => {
    if (!user || !profile?.nidImageUrl) return;
    
    if (!window.confirm(t('আপনি কি নিশ্চিত যে আপনি আপনার এনআইডি তথ্য মুছে ফেলতে চান?', 'Are you sure you want to delete your NID information?'))) {
      return;
    }

    setLoading(true);
    try {
      // 1. Delete from R2
      await deleteFromR2(profile.nidImageUrl);
      
      // 2. Clear from Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        nidImageUrl: null,
        nidNumber: '',
        verificationStatus: 'none',
        identityVerified: false,
        verificationData: null
      });
      
      await refreshProfile();
      setFormData({ ...formData, nidNumber: '' });
      toast.success(t('এনআইডি তথ্য মুছে ফেলা হয়েছে।', 'NID information deleted.'));
    } catch (error) {
      console.error(error);
      toast.error(t('মুছে ফেলতে সমস্যা হয়েছে।', 'Failed to delete.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showTermsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showTermsModal]);

  const confirmSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const finalNidNumber = formData.nidNumber || profile?.nidNumber || '';
      await updateDoc(userRef, {
        ...formData,
        nidNumber: finalNidNumber,
        profileCompleted: true,
        lastUpdated: serverTimestamp()
      });
      await refreshProfile();
      localStorage.removeItem('profileDraft');
      toast.success(t("প্রোফাইল সফলভাবে আপডেট করা হয়েছে!", "Profile updated successfully!"));
      setShowTermsModal(false);
      navigate('/');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t("প্রোফাইল আপডেট করতে সমস্যা হয়েছে।", "Failed to update profile."));
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityAction = async (action: 'change' | 'reset') => {
    if (!user?.email) return;
    
    setLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSecurityData({ ...securityData, verificationCode: code, step: 'verify' });
    
    try {
      await sendEmail({
        to: user.email,
        subject: 'Security Verification Code - Hotel Shotabdi',
        type: 'verification',
        html: `
          <h2 style="color: #dc2626; margin-top: 0;">Security Verification</h2>
          <p>Your verification code for security action at Hotel Shotabdi is:</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${code}</p>
          </div>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });
      toast.success(t('ভেরিফিকেশন কোড পাঠানো হয়েছে।', 'Verification code sent to your email.'));
    } catch (error) {
      toast.error(t('কোড পাঠাতে সমস্যা হয়েছে।', 'Failed to send code.'));
    } finally {
      setLoading(false);
    }
  };

  const verifySecurityCode = () => {
    if (securityData.enteredCode === securityData.verificationCode) {
      setSecurityData({ ...securityData, step: 'reset' });
    } else {
      toast.error(t('ভুল কোড।', 'Incorrect code.'));
    }
  };

  const resetPassword = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error(t('পাসওয়ার্ড মিলছে না।', 'Passwords do not match.'));
      return;
    }
    
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await updatePassword(auth.currentUser, securityData.newPassword);
      toast.success(t('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!', 'Password changed successfully!'));
      setSecurityData({ ...securityData, step: 'initial', currentPassword: '', newPassword: '', confirmPassword: '', enteredCode: '' });
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error(t('অনুগ্রহ করে আবার লগইন করে চেষ্টা করুন।', 'Please login again to change password.'));
      } else {
        toast.error(t('পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।', 'Failed to change password.'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">{t('অনুগ্রহ করে লগইন করুন।', 'Please login.')}</div>;
  }

  const deviceInfo = {
    browser: navigator.userAgent.split(') ')[0].split(' (')[1] || 'Unknown Device',
    platform: navigator.platform,
    language: navigator.language
  };

  return (
    <div className="bg-slate-50 py-10 sm:py-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-red-700 px-6 py-8 sm:px-8 sm:py-10 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <Shield className="w-64 h-64 -ml-20 -mt-20" />
            </div>
            
            <div className="relative z-10">
              <div className="relative inline-block group mb-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full border-4 border-white/30 overflow-hidden bg-white/10 flex items-center justify-center">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-16 h-16 sm:w-20 sm:h-20 opacity-90" />
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-white text-red-700 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  accept="image/*" 
                />
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                {profile?.profileCompleted ? t('অ্যাকাউন্ট ম্যানেজ করুন', 'Manage Account') : t('প্রোফাইল সম্পূর্ণ করুন', 'Complete Profile')}
              </h1>
              <p className="text-red-100 text-sm sm:text-base max-w-md mx-auto">
                {user.email}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === 'profile' ? 'text-red-700 border-b-2 border-red-700 bg-red-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <User className="w-4 h-4" />
              {t('প্রোফাইল', 'Profile')}
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === 'security' ? 'text-red-700 border-b-2 border-red-700 bg-red-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Shield className="w-4 h-4" />
              {t('নিরাপত্তা', 'Security')}
            </button>
          </div>
          
          <div className="p-6 sm:p-8">
            {activeTab === 'profile' ? (
              <form onSubmit={handleSubmit} className="space-y-6">
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
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl mb-6 text-sm">
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
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-red-600" /> {t('পরিচয়পত্র (NID)', 'Identity Card (NID)')}
              </span>
              <div className="flex items-center gap-2">
                {profile?.verificationStatus === 'verified' ? (
                  <span className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                    <BadgeCheck className="w-4 h-4" />
                    {t('যাচাইকৃত', 'Verified')}
                  </span>
                ) : profile?.verificationStatus === 'pending' ? (
                  <span className="flex items-center gap-1.5 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    {t('রিভিউ হচ্ছে', 'Under Review')}
                  </span>
                ) : profile?.verificationStatus === 'rejected' ? (
                  <span className="flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    {t('প্রত্যাখ্যাত', 'Rejected')}
                  </span>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setIsVerificationModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold hover:bg-red-200 transition-colors"
                  >
                    <Fingerprint className="w-4 h-4" />
                    {t('এখনি জমা দিন', 'Submit Now')}
                  </button>
                )}
              </div>
            </h3>
            
            {profile?.verificationStatus === 'rejected' && profile?.rejectionReason && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex gap-3 items-start mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  <span className="font-bold">{t('কারণ:', 'Reason:')}</span> {profile.rejectionReason}
                  <br />
                  <span className="mt-1 block">{t('অনুগ্রহ করে সঠিক তথ্য দিয়ে পুনরায় জমা দিন।', 'Please correct the information and resubmit.')}</span>
                </p>
              </div>
            )}

            {profile?.nidImageUrl ? (
              <div className="space-y-4">
                <div className="relative group aspect-video max-w-sm mx-auto bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                  <img src={fixR2Url(profile.nidImageUrl)} alt="NID" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      type="button"
                      onClick={() => window.open(fixR2Url(profile.nidImageUrl), '_blank')}
                      className="bg-white text-slate-900 p-2 rounded-full hover:scale-110 transition-transform"
                      title={t('বড় করে দেখুন', 'View Full Size')}
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    {(profile?.verificationStatus === 'none' || profile?.verificationStatus === 'rejected' || profile?.verificationStatus === 'pending') && (
                      <button 
                        type="button"
                        onClick={handleDeleteNid}
                        className="bg-red-600 text-white p-2 rounded-full hover:scale-110 transition-transform"
                        title={t('মুছে ফেলুন', 'Delete')}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                
                {profile?.nidNumber && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase mb-1">{t('NID নম্বর', 'NID Number')}</p>
                      <p className="font-mono text-slate-900 tracking-wider bg-white px-3 py-1 rounded inline-block border border-slate-100">{profile.nidNumber}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExtractUploadedNid}
                      disabled={extractingNid}
                      className="flex items-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-xl transition-all border border-indigo-100 disabled:opacity-50 cursor-pointer pointer-events-auto shrink-0 animate-pulse"
                      title={t('এআই দিয়ে তথ্য এক্সট্র্যাক্ট করুন', 'Extract info with AI')}
                    >
                      {extractingNid ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {t('খোঁজা হচ্ছে...', 'Scanning...')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          {t('এআই দিয়ে তথ্য খুঁজুন', 'AI Extract')}
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {(profile?.verificationStatus === 'none' || profile?.verificationStatus === 'rejected') && (
                  <button 
                    type="button"
                    onClick={() => setIsVerificationModalOpen(true)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Camera className="w-5 h-5" />
                    {t('এনআইডি পরিবর্তন করুন', 'Change NID')}
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-medium mb-4">{t('কোন এনআইডি তথ্য পাওয়া যায়নি', 'No NID information found')}</p>
                <button 
                  type="button"
                  onClick={() => setIsVerificationModalOpen(true)}
                  className="bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-red-800 transition-all flex items-center justify-center gap-2 mx-auto"
                >
                  <Shield className="w-4 h-4" />
                  {t('এনআইডি জমা দিন', 'Submit NID')}
                </button>
              </div>
            )}
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
            ) : (
              <div className="space-y-8">
                {/* Login Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center">
                    <Lock className="w-5 h-5 mr-2 text-red-600" /> {t('লগইন তথ্য', 'Login Information')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">{t('ইমেইল', 'Email')}</p>
                      <p className="font-bold text-slate-900 truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">{t('অ্যাকাউন্ট তৈরি', 'Account Created')}</p>
                      <p className="font-bold text-slate-900">
                        {profile?.createdAt ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Device Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center">
                    <Smartphone className="w-5 h-5 mr-2 text-red-600" /> {t('ডিভাইস তথ্য', 'Device Information')}
                  </h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-4">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <Globe className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{deviceInfo.browser}</p>
                      <p className="text-xs text-slate-500">{deviceInfo.platform} • {deviceInfo.language}</p>
                      <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        {t('বর্তমানে সক্রিয়', 'Active Now')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Actions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center">
                    <Key className="w-5 h-5 mr-2 text-red-600" /> {t('নিরাপত্তা অ্যাকশন', 'Security Actions')}
                  </h3>
                  
                  {securityData.step === 'initial' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {auth.currentUser?.providerData.some(p => p.providerId === 'password') ? (
                        <>
                          <button 
                            onClick={() => handleSecurityAction('change')}
                            className="p-4 border border-slate-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all text-left group"
                          >
                            <Lock className="w-6 h-6 text-slate-400 group-hover:text-red-600 mb-2" />
                            <p className="font-bold text-slate-900">{t('পাসওয়ার্ড পরিবর্তন', 'Change Password')}</p>
                            <p className="text-xs text-slate-500">{t('ইমেইল কোড ভেরিফাই করে পরিবর্তন করুন।', 'Change by verifying email code.')}</p>
                          </button>
                          <button 
                            onClick={() => handleSecurityAction('reset')}
                            className="p-4 border border-slate-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all text-left group"
                          >
                            <Key className="w-6 h-6 text-slate-400 group-hover:text-red-600 mb-2" />
                            <p className="font-bold text-slate-900">{t('পাসওয়ার্ড রিসেট', 'Reset Password')}</p>
                            <p className="text-xs text-slate-500">{t('পাসওয়ার্ড ভুলে গেলে রিসেট করুন।', 'Reset if you forgot your password.')}</p>
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleSecurityAction('change')}
                          className="p-4 border border-slate-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all text-left group sm:col-span-2"
                        >
                          <Lock className="w-6 h-6 text-slate-400 group-hover:text-red-600 mb-2" />
                          <p className="font-bold text-slate-900">{t('পাসওয়ার্ড সেট করুন', 'Set Password')}</p>
                          <p className="text-xs text-slate-500">{t('ইমেইল কোড ভেরিফাই করে পাসওয়ার্ড সেট করুন।', 'Set password by verifying email code.')}</p>
                        </button>
                      )}
                    </div>
                  )}

                  {securityData.step === 'verify' && (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-1">{t('আমরা একটি কোড পাঠিয়েছি:', 'We sent a code to:')}</p>
                        <p className="font-bold text-slate-900">
                          {user.email}
                        </p>
                      </div>
                      <input 
                        type="text" 
                        value={securityData.enteredCode}
                        onChange={(e) => setSecurityData({ ...securityData, enteredCode: e.target.value })}
                        placeholder="123456"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 text-center text-2xl font-bold tracking-widest"
                        maxLength={6}
                      />
                      <button 
                        onClick={verifySecurityCode}
                        className="w-full bg-red-700 text-white py-3 rounded-xl font-bold hover:bg-red-800 transition-colors"
                      >
                        {t('কোড ভেরিফাই করুন', 'Verify Code')}
                      </button>
                      <button 
                        onClick={() => setSecurityData({ ...securityData, step: 'initial' })}
                        className="w-full text-slate-500 text-sm font-medium hover:text-slate-700"
                      >
                        {t('বাতিল করুন', 'Cancel')}
                      </button>
                    </div>
                  )}

                  {securityData.step === 'reset' && (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('নতুন পাসওয়ার্ড', 'New Password')}</label>
                        <input 
                          type="password" 
                          value={securityData.newPassword}
                          onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('পাসওয়ার্ড নিশ্চিত করুন', 'Confirm Password')}</label>
                        <input 
                          type="password" 
                          value={securityData.confirmPassword}
                          onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                          placeholder="••••••••"
                        />
                      </div>
                      <button 
                        onClick={resetPassword}
                        className="w-full bg-red-700 text-white py-3 rounded-xl font-bold hover:bg-red-800 transition-colors"
                      >
                        {t('পাসওয়ার্ড আপডেট করুন', 'Update Password')}
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => auth.signOut()}
                    className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-5 h-5" />
                    {t('লগআউট করুন', 'Logout from all devices')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-2xl font-bold text-slate-900">
                {t('শর্তাবলী', 'Terms and Conditions')}
              </h3>
              <button 
                onClick={() => setShowTermsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-grow prose prose-slate max-w-none">
              <div className="mb-6">
                <h4 className="text-lg font-bold text-slate-900 mb-2">Bangla (বাংলা)</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  আমি এতদ্বারা ঘোষণা করছি যে, আমার প্রদানকৃত সকল তথ্য সম্পূর্ণ সত্য এবং নির্ভুল। আমি হোটেল শতাব্দী আবাসিক-এর সকল নিয়ম-কানুন ও শর্তাবলী মেনে চলতে বাধ্য থাকব। কোনো মিথ্যা তথ্য প্রদান করলে বা নিয়ম ভঙ্গ করলে কর্তৃপক্ষ আমার বিরুদ্ধে আইনানুগ ব্যবস্থা গ্রহণ করতে পারবে।
                </p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">English</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  I hereby declare that all information provided by me is completely true and accurate. I will be obliged to follow all the rules and conditions of Hotel Shotabdi Abashik. If any false information is provided or rules are broken, the authority can take legal action against me.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4 justify-end">
              <button 
                onClick={() => setShowTermsModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                {t('বাতিল করুন', 'Cancel')}
              </button>
              <button 
                onClick={confirmSaveProfile}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-700 hover:bg-red-800 transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {t('সম্মত আছি এবং সংরক্ষণ করুন', 'Agree & Save')}
              </button>
            </div>
          </div>
        </div>
      )}
      <IdentityVerification 
        isOpen={isVerificationModalOpen} 
        onClose={() => setIsVerificationModalOpen(false)} 
        onVerified={() => setIsVerificationModalOpen(false)}
      />

      {showExtractedModal && extractedNidData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-500 animate-pulse" />
                <h3 className="text-lg font-bold">{t('এআই পরিচয়পত্র তথ্য এক্সট্রাকশন', 'AI NID Information')}</h3>
              </div>
              <button 
                onClick={() => setShowExtractedModal(false)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-500 text-sm leading-relaxed">
                {t('আপনার আপলোডকৃত পরিচয়পত্র থেকে নিচের তথ্যগুলো সফলভাবে সনাক্ত করা হয়েছে:', 'The following information was successfully extracted from your uploaded NID image:')}
              </p>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {extractedNidData.fullNameEn && (
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase mb-0.5">{t('পূর্ণ নাম (ইংরেজি)', 'Full Name (English)')}</span>
                    <span className="text-slate-800 font-bold text-sm bg-white border border-slate-100 px-2 py-1 rounded block">{extractedNidData.fullNameEn}</span>
                  </div>
                )}
                {extractedNidData.fullNameBn && (
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase mb-0.5">{t('পূর্ণ নাম (বাংলা)', 'Full Name (Bengali)')}</span>
                    <span className="text-slate-800 font-bold text-sm bg-white border border-slate-100 px-2 py-1 rounded block">{extractedNidData.fullNameBn}</span>
                  </div>
                )}
                {extractedNidData.nidNumber && (
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase mb-0.5">{t('এনআইডি নম্বর', 'NID Number')}</span>
                    <span className="font-mono text-indigo-700 font-bold text-sm bg-indigo-50/50 px-2 py-1 rounded border border-indigo-100 inline-block tracking-wider">{extractedNidData.nidNumber}</span>
                  </div>
                )}
                {extractedNidData.dateOfBirth && (
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase mb-0.5">{t('জন্ম তারিখ', 'Date of Birth')}</span>
                    <span className="text-slate-800 font-bold text-sm bg-white border border-slate-100 px-2 py-1 rounded block">{extractedNidData.dateOfBirth}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtractedModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer"
                >
                  {t('বন্ধ করুন', 'Close')}
                </button>
                <button
                  type="button"
                  onClick={handleApplyExtractedData}
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white py-3 rounded-xl font-bold transition-all text-sm shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t('ফরমে বসান', 'Apply to Form')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
