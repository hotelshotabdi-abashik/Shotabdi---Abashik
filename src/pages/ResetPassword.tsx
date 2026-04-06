import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'sonner';
import { Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ResetPassword() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get('oobCode');
    
    if (!code) {
      toast.error(t('অবৈধ বা মেয়াদোত্তীর্ণ লিংক।', 'Invalid or expired link.'));
      navigate('/');
      return;
    }
    
    setOobCode(code);
    
    // Verify the code
    verifyPasswordResetCode(auth, code)
      .then((email) => {
        setEmail(email);
        setVerifying(false);
      })
      .catch((error) => {
        console.error(error);
        toast.error(t('অবৈধ বা মেয়াদোত্তীর্ণ লিংক।', 'Invalid or expired link.'));
        navigate('/');
      });
  }, [location, navigate, t]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error(t('পাসওয়ার্ড মিলছে না।', 'Passwords do not match.'));
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error(t('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।', 'Password must be at least 6 characters.'));
      return;
    }
    
    if (!oobCode) return;
    
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
      toast.success(t('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!', 'Password reset successfully!'));
      
      // Redirect to home after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('একটি সমস্যা হয়েছে।', 'An error occurred.'));
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 pt-24">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {success ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <Lock className="w-8 h-8 text-red-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {success ? t('পাসওয়ার্ড পরিবর্তন সফল', 'Password Reset Successful') : t('নতুন পাসওয়ার্ড সেট করুন', 'Set New Password')}
            </h2>
            <p className="text-slate-500 mt-2">
              {success 
                ? t('আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে। আপনি এখন লগইন করতে পারেন।', 'Your password has been successfully reset. You can now log in.')
                : t('আপনার অ্যাকাউন্টের জন্য একটি নতুন পাসওয়ার্ড লিখুন।', 'Enter a new password for your account.')}
            </p>
            {!success && email && (
              <p className="font-medium text-slate-900 mt-2">{email}</p>
            )}
          </div>

          {!success ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('নতুন পাসওয়ার্ড', 'New Password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                    required
                    minLength={6}
                  />
                </div>
              </div>

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
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {t('পাসওয়ার্ড পরিবর্তন করুন', 'Reset Password')}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              {t('হোম পেজে ফিরে যান', 'Return to Home')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
