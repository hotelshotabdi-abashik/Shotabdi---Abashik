import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { sendEmail, notifyLogin } from '../services/NotificationService';
import { googleProvider } from '../firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  logoUrl: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, logoUrl }) => {
  const { t } = useLanguage();
  const { refreshProfile } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (verificationStep && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && verificationStep) {
      toast.error(t('ভেরিফিকেশন কোডের মেয়াদ শেষ হয়েছে।', 'Verification code expired.'));
      setVerificationStep(false);
    }
    return () => clearInterval(timer);
  }, [verificationStep, timeLeft, t]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.dispatchEvent(new CustomEvent('stop-lenis'));
      setIsLogin(true);
      setIsForgotPassword(false);
      setEmail('');
      setPassword('');
      setNewPassword('');
      setVerificationStep(false);
      setVerificationCode('');
      setEnteredCode('');
      setTempUser(null);
      setTimeLeft(300);
    } else {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('start-lenis'));
    }
    return () => {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('start-lenis'));
    };
  }, [isOpen]);

  const handleClose = async () => {
    if (verificationStep && tempUser && !isForgotPassword) {
      await auth.signOut();
    }
    onClose();
  };

  if (!isOpen) return null;

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || (!isForgotPassword && !password)) {
      toast.error(t('ইমেইল এবং পাসওয়ার্ড দিন।', 'Please enter email and password.'));
      return;
    }

    if (!isLogin && !isForgotPassword && password !== confirmPassword) {
      toast.error(t('পাসওয়ার্ড মিলছে না।', 'Passwords do not match.'));
      return;
    }

    setLoading(true);
    try {
      if (isForgotPassword) {
        const actionCodeSettings = {
          url: window.location.origin + '/reset-password',
          handleCodeInApp: true,
        };
        await sendPasswordResetEmail(auth, email, actionCodeSettings);
        toast.success(t('পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।', 'Password reset link sent to your email.'));
        setIsForgotPassword(false);
        setLoading(false);
        return;
      }

      let userCredential;

      try {
        if (isLogin) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.length > 0 && !methods.includes('password') && methods.includes('google.com')) {
              toast.info(t('পাসওয়ার্ড সেট করা নেই। পাসওয়ার্ড সেট করার লিংক পাঠানো হচ্ছে...', 'Password is not set. Sending password set link...'));
              const actionCodeSettings = {
                url: window.location.origin + '/reset-password',
                handleCodeInApp: true,
              };
              await sendPasswordResetEmail(auth, email, actionCodeSettings);
              toast.success(t('পাসওয়ার্ড সেট করার লিংক আপনার ইমেইলে পাঠানো হয়েছে।', 'Password set link sent to your email.'));
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("Error fetching methods", e);
          }
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } else {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
        }
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          if (isLogin) {
            toast.error(t('ভুল ইমেইল বা পাসওয়ার্ড।', 'Incorrect email or password.'));
          } else {
            toast.error(authError.message);
          }
        } else if (authError.code === 'auth/wrong-password') {
          toast.error(t('ভুল পাসওয়ার্ড।', 'Incorrect password.'));
        } else if (authError.code === 'auth/email-already-in-use' && !isLogin) {
          toast.error(t('এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট আছে।', 'An account already exists with this email.'));
        } else {
          toast.error(authError.message);
        }
        setLoading(false);
        return;
      }

      const user = userCredential.user;
      setTempUser(user);

      if (isLogin) {
        // Direct login without verification code
        const userRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userRef);
        
        if (!snapshot.exists()) {
          const adminEmails = ['hotelshotabdiabashik@gmail.com', 'selectedlegendbusiness@gmail.com', 'fuadf342@gmail.com', 'd2kabdulkahar@gmail.com'];
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email || '',
            role: adminEmails.includes(user.email || '') ? 'admin' : 'user',
            profileCompleted: false,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            createdAt: serverTimestamp(),
          });
        }
        
        if (user.email) {
          notifyLogin(user.email, user.displayName || 'User').catch(console.error);
        }

        await refreshProfile();
        toast.success(t('সফলভাবে লগইন হয়েছে!', 'Logged in successfully!'));
        onClose();
      } else {
        // Generate and send code for signup
        const code = generateCode();
        setVerificationCode(code);
        setTimeLeft(300);
        
        await sendEmail({
          to: email,
          subject: 'Your Verification Code - Hotel Shotabdi',
          type: 'verification',
          html: `
            <h2 style="color: #dc2626; margin-top: 0;">Verification Code</h2>
            <p>Your verification code for Hotel Shotabdi is:</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${code}</p>
            </div>
            <p>This code will expire in 5 minutes.</p>
          `
        });

        setVerificationStep(true);
        toast.success(t('ভেরিফিকেশন কোড পাঠানো হয়েছে।', 'Verification code sent to your email.'));
      }
    } catch (error: any) {
      console.error(error);
      toast.error(t('একটি সমস্যা হয়েছে।', 'An error occurred.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (enteredCode !== verificationCode) {
      toast.error(t('ভুল কোড।', 'Incorrect code.'));
      return;
    }

    setLoading(true);
    try {
      if (tempUser) {
        const userRef = doc(db, 'users', tempUser.uid);
        const snapshot = await getDoc(userRef);
        
        if (!snapshot.exists()) {
          const adminEmails = ['hotelshotabdiabashik@gmail.com', 'selectedlegendbusiness@gmail.com', 'fuadf342@gmail.com', 'd2kabdulkahar@gmail.com'];
          await setDoc(userRef, {
            uid: tempUser.uid,
            email: tempUser.email || '',
            role: adminEmails.includes(tempUser.email || '') ? 'admin' : 'user',
            profileCompleted: false,
            displayName: tempUser.displayName || '',
            photoURL: tempUser.photoURL || '',
            createdAt: serverTimestamp(),
          });
        }
        
        if (tempUser.email) {
          notifyLogin(tempUser.email, tempUser.displayName || 'User').catch(console.error);
        }

        await refreshProfile();
        toast.success(t('সফলভাবে লগইন হয়েছে!', 'Logged in successfully!'));
        setVerificationStep(false);
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error(t('একটি সমস্যা হয়েছে।', 'An error occurred.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);
      
      if (!snapshot.exists()) {
        const adminEmails = ['hotelshotabdiabashik@gmail.com', 'selectedlegendbusiness@gmail.com', 'fuadf342@gmail.com', 'd2kabdulkahar@gmail.com'];
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          role: adminEmails.includes(user.email || '') ? 'admin' : 'user',
          profileCompleted: false,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
        });
      }
      
      if (user.email) {
        notifyLogin(user.email, user.displayName || 'User').catch(console.error);
      }

      await refreshProfile();
      toast.success(t('সফলভাবে লগইন হয়েছে!', 'Logged in successfully!'));
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        data-lenis-prevent
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300"
      >
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <img src={logoUrl} alt="Hotel Shotabdi" className="h-16 mx-auto mb-4 object-contain" />
            <h2 className="text-2xl font-bold text-slate-900">Hotel Shotabdi</h2>
            <p className="text-slate-500 mt-2">
              {verificationStep 
                ? isForgotPassword ? t('পাসওয়ার্ড রিসেট করুন', 'Reset your password') : t('ইমেইল ভেরিফাই করুন', 'Verify your email')
                : isForgotPassword
                  ? t('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot Password?')
                  : isLogin 
                    ? t('আপনার অ্যাকাউন্টে লগইন করুন', 'Login to your account')
                    : t('নতুন অ্যাকাউন্ট তৈরি করুন', 'Create a new account')}
            </p>
          </div>

          {verificationStep ? (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                <p className="text-sm text-slate-600 mb-2">
                  {t('আমরা একটি ৬-ডিজিটের কোড পাঠিয়েছি:', 'We sent a 6-digit code to:')}
                </p>
                <p className="font-bold text-slate-900">{email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('ভেরিফিকেশন কোড', 'Verification Code')}
                </label>
                <input
                  type="text"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-center text-2xl tracking-widest font-bold"
                  maxLength={6}
                />
                <p className="text-xs text-slate-500 mt-2 text-center">
                  {t('কোডের মেয়াদ শেষ হবে:', 'Code expires in:')} {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </p>
              </div>

              <button
                onClick={verifyCode}
                disabled={loading || enteredCode.length !== 6}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {t('ভেরিফাই করুন', 'Verify')}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('ইমেইল', 'Email Address')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {!isForgotPassword && (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-slate-700">
                          {t('পাসওয়ার্ড', 'Password')}
                        </label>
                        {isLogin && (
                          <button
                            type="button"
                            onClick={() => setIsForgotPassword(true)}
                            className="text-xs text-red-600 font-bold hover:underline"
                          >
                            {t('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot Password?')}
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                          required
                        />
                      </div>
                    </div>
                    {!isLogin && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {t('পাসওয়ার্ড নিশ্চিত করুন', 'Confirm Password')}
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isForgotPassword 
                        ? t('কোড পাঠান', 'Send Code') 
                        : isLogin ? t('লগইন করুন', 'Login') : t('অ্যাকাউন্ট তৈরি করুন', 'Sign Up')}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                
                {isForgotPassword && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="w-full text-sm text-slate-500 font-medium hover:text-slate-700 transition-colors"
                  >
                    {t('লগইন এ ফিরে যান', 'Back to Login')}
                  </button>
                )}
              </form>

              {!isForgotPassword && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-slate-500">{t('অথবা', 'Or')}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-3"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    {t('Google দিয়ে লগইন করুন', 'Continue with Google')}
                  </button>

                  <p className="text-center text-sm text-slate-600 mt-6">
                    {isLogin ? t('অ্যাকাউন্ট নেই?', 'Don\'t have an account?') : t('ইতিমধ্যে অ্যাকাউন্ট আছে?', 'Already have an account?')}
                    <button
                      onClick={() => setIsLogin(!isLogin)}
                      className="ml-1 text-red-600 font-bold hover:underline"
                    >
                      {isLogin ? t('সাইন আপ করুন', 'Sign Up') : t('লগইন করুন', 'Login')}
                    </button>
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
