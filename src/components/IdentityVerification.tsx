import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { toast } from 'sonner';

interface IdentityVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: (data: any) => void;
}

export const IdentityVerification: React.FC<IdentityVerificationProps> = ({ isOpen, onClose, onVerified }) => {
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [nidImage, setNidImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
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

  const capturePhoto = (type: 'nid' | 'selfie') => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        if (type === 'nid') setNidImage(dataUrl);
        else setSelfieImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'nid' | 'selfie') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (type === 'nid') setNidImage(dataUrl);
        else setSelfieImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const verify = async () => {
    if (!nidImage || !selfieImage) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/verify-identity', {
        nidImage,
        selfieImage
      });

      const data = response.data;
      setResult(data);

      if (data.isFaceMatch && data.confidence > 0.7) {
        // Update user profile in Firestore
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            identityVerified: true,
            nidNumber: data.idNumber,
            legalName: data.name,
            verificationData: {
              ...data,
              verifiedAt: new Date().toISOString()
            }
          });
          await refreshProfile();
          toast.success(t('আপনার পরিচয় সফলভাবে যাচাই করা হয়েছে!', 'Identity verified successfully!'));
          setStep(4);
          if (onVerified) onVerified(data);
        }
      } else {
        setError(data.reason || t('পরিচয় যাচাইকরণ মেলেনি। আবার চেষ্টা করুন।', 'Verification failed. Please try again.'));
      }
    } catch (err) {
      console.error(err);
      setError(t('পরিচয় যাচাইকরণে সমস্যা হয়েছে। ইন্টারনেটে সমস্যা হতে পারে।', 'Verification failed. Please check your connection.'));
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
            <h3 className="text-lg font-bold">Identity Verification</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between mb-8 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  step >= s ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
            ))}
          </div>

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
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Step 1: Scan NID</h4>
                  <p className="text-slate-500 text-sm">Please upload or capture a clear photo of your National ID Card.</p>
                </div>

                <div className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden relative">
                  {cameraActive ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : nidImage ? (
                    <img src={nidImage} alt="NID" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4">
                        <Upload className="w-8 h-8" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">No photo selected</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {cameraActive ? (
                    <button 
                      onClick={() => capturePhoto('nid')}
                      className="col-span-2 bg-red-600 text-white py-3 rounded-xl font-bold active:scale-95 transition-all"
                    >
                      Capture Photo
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={startCamera}
                        className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold active:scale-95 transition-all text-sm"
                      >
                        <Camera className="w-4 h-4" /> Camera
                      </button>
                      <label className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold cursor-pointer active:scale-95 transition-all text-sm">
                        <Upload className="w-4 h-4" /> Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'nid')} />
                      </label>
                    </>
                  )}
                </div>

                <button 
                  disabled={!nidImage}
                  onClick={() => setStep(2)}
                  className="w-full bg-red-700 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold mt-6 shadow-xl active:scale-95 transition-all"
                >
                  Continue to Selfie
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Step 2: Take a Selfie</h4>
                  <p className="text-slate-500 text-sm">We need to match your face with the photo on your ID.</p>
                </div>

                <div className="aspect-square bg-slate-50 rounded-full border-4 border-slate-100 flex flex-col items-center justify-center overflow-hidden relative mx-auto w-48">
                  {cameraActive ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                  ) : selfieImage ? (
                    <img src={selfieImage} alt="Selfie" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <Camera className="w-10 h-10 text-slate-300 mx-auto" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {cameraActive ? (
                    <button 
                      onClick={() => capturePhoto('selfie')}
                      className="bg-red-600 text-white py-3 rounded-xl font-bold active:scale-95 transition-all"
                    >
                      Take Selfie
                    </button>
                  ) : (
                    <button 
                      onClick={startCamera}
                      className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold active:scale-95 transition-all"
                    >
                      <Camera className="w-5 h-5" /> Open Camera
                    </button>
                  )}
                  {selfieImage && !cameraActive && (
                    <button 
                      onClick={() => {
                        setStep(3);
                        verify();
                      }}
                      className="w-full bg-red-700 text-white py-4 rounded-xl font-bold mt-4 shadow-xl active:scale-95 transition-all"
                    >
                      Confirm and Verify
                    </button>
                  )}
                  <button onClick={() => setStep(1)} className="text-slate-500 font-bold text-sm">Back</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                {loading ? (
                  <>
                    <div className="relative mx-auto w-24 h-24">
                      <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ShieldCheck className="w-10 h-10 text-red-600" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-slate-900">Verifying Identity...</h4>
                      <p className="text-slate-500 text-sm animate-pulse">Our AI is matching your documents and face. Please wait.</p>
                    </div>
                  </>
                ) : error ? (
                  <>
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
                      <AlertCircle className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-red-600">Verification Failed</h4>
                      <p className="text-slate-600 text-sm">{error}</p>
                    </div>
                    <button onClick={() => setStep(1)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Try Again</button>
                  </>
                ) : null}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-bold text-slate-900">Success!</h4>
                  <p className="text-slate-500 font-medium">Your identity has been verified.</p>
                  {result && (
                    <div className="bg-slate-50 p-4 rounded-2xl text-left mt-4 border border-slate-100">
                      <p className="text-xs text-slate-400 font-bold uppercase mb-2">Details Found:</p>
                      <p className="text-sm"><strong>Name:</strong> {result.name}</p>
                      <p className="text-sm"><strong>ID Number:</strong> {result.idNumber}</p>
                    </div>
                  )}
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
