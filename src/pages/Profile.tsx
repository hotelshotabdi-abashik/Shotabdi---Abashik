import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { UserCircle, FileText, Phone, User, CheckCircle2, Shield, Lock, Smartphone, Globe, Camera, LogOut, Key, X, Scan, Upload, AlertCircle, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import PhoneInput from '../components/PhoneInput';
import { sendEmail } from '../services/NotificationService';
import { GoogleGenAI, Type } from "@google/genai";

export default function Profile() {
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nidInputRef = useRef<HTMLInputElement>(null);
  
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
      nidNumber: '',
      nidStatus: 'Unverified',
      nidBanglaName: '',
      fatherNameBangla: '',
      motherNameBangla: '',
      dateOfBirth: ''
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
      if (profile.profileCompleted) {
        setFormData({
          legalName: profile.legalName || '',
          phone: profile.phone || '',
          guardianName: profile.guardianName || '',
          guardianPhone: profile.guardianPhone || '',
          nidNumber: profile.nidNumber || '',
          nidStatus: profile.nidStatus || 'Unverified',
          nidBanglaName: profile.nidBanglaName || '',
          fatherNameBangla: profile.fatherNameBangla || '',
          motherNameBangla: profile.motherNameBangla || '',
          dateOfBirth: profile.dateOfBirth || ''
        });
      }

      if (profile.lastExtractionTime) {
        const lastExtTime = typeof profile.lastExtractionTime === 'number' 
          ? profile.lastExtractionTime 
          : (profile.lastExtractionTime as any).toDate?.().getTime() || 0;
          
        const now = new Date().getTime();
        const diff = now - lastExtTime;
        const thirtyMins = 30 * 60 * 1000;
        if (diff < thirtyMins) {
          setTimeRemaining(Math.ceil((thirtyMins - diff) / 60000));
          
          // Set up interval to update timer
          const interval = setInterval(() => {
            const currentNow = new Date().getTime();
            const currentDiff = currentNow - lastExtTime;
            if (currentDiff < thirtyMins) {
              setTimeRemaining(Math.ceil((thirtyMins - currentDiff) / 60000));
            } else {
              setTimeRemaining(null);
              clearInterval(interval);
            }
          }, 60000);
          
          return () => clearInterval(interval);
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

    const { legalName, phone, guardianName, guardianPhone, nidNumber } = formData;
    if (!legalName.trim() || !phone.trim() || !guardianName.trim() || !guardianPhone.trim() || !nidNumber.trim()) {
      toast.error(t("সবগুলো তথ্য পূরণ করা বাধ্যতামূলক।", "All fields are required."));
      return;
    }

    setShowTermsModal(true);
  };

  const [nidFront, setNidFront] = useState<File | null>(null);

  const handleNidVerification = async (selectedFile?: File) => {
    const fileToProcess = selectedFile || nidFront;
    if (!user || !fileToProcess) {
      toast.error(t('অনুগ্রহ করে NID-এর সামনের ছবি নির্বাচন করুন।', 'Please select the front image of your NID.'));
      return;
    }

    setIsExtracting(true);
    const toastId = toast.loading(t('NID ভেরিফাই করা হচ্ছে...', 'Verifying NID...'));

    let frontUrl = '';

    try {
      const { uploadToR2, deleteFromR2 } = await import('../lib/r2');
      
      // 1. Upload to R2
      frontUrl = await uploadToR2(fileToProcess, `nid/${user.uid}/front`);

      // 2. Extract with Gemini (5-check logic for maximum accuracy)
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const getBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
        });
      };

      const frontBase64 = await getBase64(fileToProcess);
      
      const extractionPrompt = `Extract the following information from this Bangladeshi NID front image. 
      CRITICAL: Please analyze the image carefully, focusing on the white/light text areas. 
      Perform 5 internal checks to ensure the Bangla names are 100% accurate.
      
      Fields to extract:
      1. Full Name (English) as legalName
      2. Full Name (Bangla) as nidBanglaName
      3. Father's Name (Bangla) as fatherNameBangla
      4. Mother's Name (Bangla) as motherNameBangla
      5. NID Number as nidNumber
      6. Date of Birth as dateOfBirth (format: DD MMM YYYY)
      
      Return the data in JSON format. If you cannot extract a field, leave it as an empty string.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: extractionPrompt },
              { inlineData: { data: frontBase64, mimeType: nidFront.type } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              legalName: { type: Type.STRING },
              nidBanglaName: { type: Type.STRING },
              fatherNameBangla: { type: Type.STRING },
              motherNameBangla: { type: Type.STRING },
              nidNumber: { type: Type.STRING },
              dateOfBirth: { type: Type.STRING }
            },
            required: ["legalName", "nidBanglaName", "fatherNameBangla", "motherNameBangla", "nidNumber", "dateOfBirth"]
          }
        }
      });

      const data = JSON.parse(response.text);

      // 3. Update Firestore
      const userRef = doc(db, 'users', user.uid);
      const updateData = {
        ...data,
        nidStatus: 'Verified',
        profileCompleted: true,
        lastExtractionTime: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };

      await updateDoc(userRef, updateData);
      await refreshProfile();

      // 4. Delete from R2
      await deleteFromR2(frontUrl);

      // 5. Send Congratulations Email
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: 'Congratulations! Your NID is Verified - Hotel Shotabdi',
          type: 'notification',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background-color: #dc2626; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0;">Congratulations!</h1>
              </div>
              <div style="padding: 30px; color: #1e293b; line-height: 1.6;">
                <p>Dear ${data.legalName},</p>
                <p>We are pleased to inform you that your NID verification is successful. Your account is now fully verified and ready for all services at Hotel Shotabdi Abashik.</p>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Verified Information:</strong></p>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Name: ${data.legalName} (${data.nidBanglaName})</li>
                    <li>NID: ${data.nidNumber}</li>
                    <li>DOB: ${data.dateOfBirth}</li>
                  </ul>
                </div>
                <p>Thank you for choosing Hotel Shotabdi Abashik.</p>
                <p>Best regards,<br>The Management Team</p>
              </div>
            </div>
          `
        });
      }

      toast.success(t('অভিনন্দন! আপনার NID সফলভাবে ভেরিফাই করা হয়েছে।', 'Congratulations! Your NID has been successfully verified.'), { id: toastId });
      setNidFront(null);
    } catch (error: any) {
      console.error(error);
      
      // Delete images if they were uploaded but extraction failed
      const { deleteFromR2 } = await import('../lib/r2');
      if (frontUrl) await deleteFromR2(frontUrl);

      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
        toast.error(t('সিস্টেম এখন ব্যস্ত। অনুগ্রহ করে ২৪ ঘণ্টা পর আবার চেষ্টা করুন।', 'System is busy. Please try again after 24 hours.'), { id: toastId, duration: 5000 });
      } else {
        toast.error(t('ভেরিফিকেশন ব্যর্থ হয়েছে। অনুগ্রহ করে পরিষ্কার ছবি আপলোড করুন।', 'Verification failed. Please upload clear images.'), { id: toastId });
      }
    } finally {
      setIsExtracting(false);
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
      
      const updateData = {
        ...formData,
        profileCompleted: true,
        lastUpdated: serverTimestamp()
      };

      await updateDoc(userRef, updateData);
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



                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                      <User className="w-5 h-5 mr-2 text-red-600" /> {t('ব্যক্তিগত তথ্য', 'Personal Information')}
                    </h3>
                    {formData.nidStatus === 'Verified' && (
                      <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg text-xs font-bold">
                        <BadgeCheck className="w-4 h-4" />
                        {t('ভেরিফাইড', 'Verified')}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('পূর্ণ নাম (NID অনুযায়ী)', 'Full Name (As per NID)')} <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="legalName" 
                      required 
                      value={formData.legalName} 
                      onChange={handleChange}
                      disabled={timeRemaining === null || timeRemaining <= 0}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                      placeholder={t("আপনার পূর্ণ নাম", "Your full name")}
                    />
                  </div>
                  {formData.nidStatus === 'Verified' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('নাম (বাংলায়)', 'Name (Bangla)')}</label>
                        <input 
                          type="text" 
                          name="nidBanglaName"
                          value={formData.nidBanglaName} 
                          onChange={handleChange}
                          disabled={timeRemaining === null || timeRemaining <= 0}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('পিতার নাম (বাংলায়)', "Father's Name (Bangla)")}</label>
                          <input 
                            type="text" 
                            name="fatherNameBangla"
                            value={formData.fatherNameBangla} 
                            onChange={handleChange}
                            disabled={timeRemaining === null || timeRemaining <= 0}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('মাতার নাম (বাংলায়)', "Mother's Name (Bangla)")}</label>
                          <input 
                            type="text" 
                            name="motherNameBangla"
                            value={formData.motherNameBangla} 
                            onChange={handleChange}
                            disabled={timeRemaining === null || timeRemaining <= 0}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('জন্ম তারিখ', 'Date of Birth')}</label>
                        <input 
                          type="text" 
                          name="dateOfBirth"
                          value={formData.dateOfBirth} 
                          onChange={handleChange}
                          disabled={timeRemaining === null || timeRemaining <= 0}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <p>{t('আপনি যেকোনো সময় NID স্ক্যান করে তথ্য আপডেট করতে পারবেন। ম্যানুয়াল পরিবর্তনের জন্য স্ক্যান করার পর ৩০ মিনিট সময় পাবেন।', 'You can scan NID anytime. You have 30 minutes to manually edit after scanning.')}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('মোবাইল নম্বর', 'Mobile Number')} <span className="text-red-500">*</span></label>
                    <PhoneInput 
                      name="phone" 
                      required 
                      value={formData.phone} 
                      onChange={(val) => setFormData({ ...formData, phone: val })}
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
                      />
                    </div>
                  </div>
                </div>

                {/* NID Info */}
                <div className="space-y-4 pt-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-red-600" /> {t('পরিচয়পত্র (NID)', 'Identity Card (NID)')}
                    </h3>
                    <div className="flex items-center gap-2">
                      {formData.nidStatus === 'Verified' && (
                        <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg text-[10px] font-bold">
                          <BadgeCheck className="w-3 h-3" />
                          {t('ভেরিফাইড', 'Verified')}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => nidInputRef.current?.click()}
                        disabled={isExtracting}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isExtracting ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Scan className="w-3 h-3" />
                        )}
                        {t('স্ক্যান NID', 'Scan NID')}
                      </button>
                      <input 
                        ref={nidInputRef}
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNidFront(file);
                            // Trigger verification immediately after selection
                            setTimeout(() => handleNidVerification(file), 100);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {timeRemaining !== null && timeRemaining > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        {t('ম্যানুয়াল পরিবর্তনের জন্য আরও', 'Manual edit available for')} <strong>{timeRemaining} {t('মিনিট', 'minutes')}</strong> {t('সময় আছে।', 'left.')}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('NID নম্বর', 'NID Number')} <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="nidNumber" 
                      required 
                      value={formData.nidNumber} 
                      onChange={handleChange}
                      disabled={timeRemaining === null || timeRemaining <= 0}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                      placeholder={t("আপনার NID নম্বর", "Your NID number")}
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    type="submit" 
                    disabled={loading}
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
    </div>
  );
}
