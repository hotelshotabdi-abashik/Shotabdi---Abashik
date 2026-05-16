import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2, X, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { uploadToR2 } from '../lib/r2';

interface IdentityVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: (data: any) => void;
}

export const IdentityVerification: React.FC<IdentityVerificationProps> = ({ isOpen, onClose, onVerified }) => {
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [nidPreview, setNidPreview] = useState<string | null>(null);
  const [nidNumber, setNidNumber] = useState(profile?.nidNumber || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast.error(t('ক্যামেরা চালু করতে সমস্যা হয়েছে।', 'Failed to start camera.'));
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        canvasRef.current.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `nid_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setNidFile(file);
            setNidPreview(canvasRef.current?.toDataURL('image/jpeg') || null);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNidFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNidPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerify = async () => {
    if (!nidFile) {
      toast.error(t('অনুগ্রহ করে এনআইডির ছবি দিন।', 'Please provide NID image.'));
      return;
    }
    if (!nidNumber || nidNumber.length < 10) {
      toast.error(t('সঠিক এনআইডি নম্বর দিন।', 'Please enter a valid NID number.'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Upload to R2
      const nidImageUrl = await uploadToR2(nidFile, 'identities');

      // 2. Update Firestore
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          nidImageUrl,
          nidNumber,
          identityVerified: true,
          verificationData: {
            verifiedAt: new Date().toISOString(),
            method: 'r2_upload'
          }
        });
        await refreshProfile();
        toast.success(t('আপনার তথ্য জমা দেওয়া হয়েছে!', 'Information submitted successfully!'));
        setStep(2);
        if (onVerified) onVerified({ nidImageUrl, nidNumber });
      }
    } catch (err) {
      console.error(err);
      setError(t('আপলোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'Failed to upload. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold">NID Submission</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <h4 className="text-xl font-bold text-slate-900 mb-2">{t('এনআইডি আপলোড করুন', 'Upload NID')}</h4>
                  <p className="text-slate-500 text-sm">{t('আপনার এনআইডির পরিষ্কার ছবি এবং নম্বর দিন', 'Provide a clear photo and number of your ID')}</p>
                </div>

                <div className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden relative">
                  {cameraActive ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : nidPreview ? (
                    <img src={nidPreview} alt="NID Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto mb-2">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">{t('এনআইডির ছবি নেই', 'No NID photo')}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {cameraActive ? (
                    <button 
                      onClick={capturePhoto}
                      className="col-span-2 bg-red-600 text-white py-3 rounded-xl font-bold active:scale-95 transition-all"
                    >
                      {t('ছবি তুলুন', 'Capture Photo')}
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={startCamera}
                        className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all"
                      >
                        <Camera className="w-4 h-4" /> {t('ক্যামেরা', 'Camera')}
                      </button>
                      <label className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold cursor-pointer text-sm active:scale-95 transition-all">
                        <Upload className="w-4 h-4" /> {t('আপলোড', 'Upload')}
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </>
                  )}
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t('এনআইডি নম্বর', 'NID Number')}</label>
                  <input 
                    type="text"
                    value={nidNumber}
                    onChange={(e) => setNidNumber(e.target.value)}
                    placeholder={t('XXXXXXXXXX', '10 or 17 digit number')}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-mono"
                  />
                </div>

                <button 
                  disabled={loading || !nidFile || !nidNumber}
                  onClick={handleVerify}
                  className="w-full bg-red-700 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold mt-4 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('আপলোড হচ্ছে...', 'Uploading...')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      {t('জমা দিন', 'Submit NID')}
                    </>
                  )}
                </button>

                {error && (
                  <p className="text-red-500 text-xs text-center font-medium">{error}</p>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-bold text-slate-900">{t('সফল!', 'Success!')}</h4>
                  <p className="text-slate-500 font-medium">{t('আপনার এনআইডি জমা দেওয়া হয়েছে।', 'Your NID has been submitted successfully.')}</p>
                </div>
                <button onClick={onClose} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg">Done</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </div>
  );
};
